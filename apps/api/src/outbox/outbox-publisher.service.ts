import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';

import { DATABASE } from '../database/database.constants.js';
import { KafkaService } from '../kafka/kafka.service.js';
import type { db } from '../prisma/db.js';

type DatabaseClient = typeof db;

type PendingOutboxEvent = {
  id: number;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  attempts: number;
  nextAttemptAt: string | null;
  claimedAt: string | null;
};

const OUTBOX_LEASE_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 60_000;
const OUTBOX_SCAN_LIMIT = 100;
const OUTBOX_PUBLISH_LIMIT = 25;

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly instanceId = randomUUID();
  private publishing = false;

  constructor(
    @Inject(DATABASE)
    private readonly database: DatabaseClient,
    private readonly kafkaService: KafkaService,
  ) {}

  @Cron('*/1 * * * * *')
  async publishPendingEvents(): Promise<void> {
    if (this.publishing) {
      return;
    }

    this.publishing = true;

    try {
      const events = await this.database.orm.public.OutboxEvent.where({
        publishedAt: null,
      })
        .orderBy((event) => event.createdAt.asc())
        .limit(OUTBOX_SCAN_LIMIT)
        .all();

      const now = Date.now();
      const leaseCutoff = now - OUTBOX_LEASE_MS;
      let processedEvents = 0;

      for (const event of events) {
        if (processedEvents >= OUTBOX_PUBLISH_LIMIT) {
          break;
        }

        if (!this.isReadyForRetry(event.nextAttemptAt, now)) {
          continue;
        }

        if (!this.isAvailableForClaim(event.claimedAt, leaseCutoff)) {
          continue;
        }

        await this.claimAndPublish(event);
        processedEvents += 1;
      }
    } finally {
      this.publishing = false;
    }
  }

  private isReadyForRetry(nextAttemptAt: string | null, now: number): boolean {
    if (nextAttemptAt === null) {
      return true;
    }

    return new Date(nextAttemptAt).getTime() <= now;
  }

  private isAvailableForClaim(
    claimedAt: string | null,
    leaseCutoff: number,
  ): boolean {
    if (claimedAt === null) {
      return true;
    }

    return new Date(claimedAt).getTime() <= leaseCutoff;
  }

  private async claimAndPublish(event: PendingOutboxEvent): Promise<void> {
    const claimedAt = new Date().toISOString();

    const claimedEvent = await this.database.orm.public.OutboxEvent.where({
      id: event.id,
      publishedAt: null,
      claimedAt: event.claimedAt,
      nextAttemptAt: event.nextAttemptAt,
    }).update({
      claimedBy: this.instanceId,
      claimedAt,
    });

    if (!claimedEvent) {
      return;
    }

    try {
      await this.kafkaService.publishDomainEvent({
        key: `${claimedEvent.aggregateType}:${claimedEvent.aggregateId}`,
        value: JSON.stringify({
          id: claimedEvent.id,
          eventType: claimedEvent.eventType,
          aggregateType: claimedEvent.aggregateType,
          aggregateId: claimedEvent.aggregateId,
          payload: claimedEvent.payload,
        }),
      });

      await this.database.orm.public.OutboxEvent.where({
        id: claimedEvent.id,
        publishedAt: null,
        claimedBy: this.instanceId,
      }).update({
        publishedAt: new Date().toISOString(),
        claimedBy: null,
        claimedAt: null,
        nextAttemptAt: null,
        lastError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Kafka publish error';

      const attempts = claimedEvent.attempts + 1;
      const retryDelayMs = this.getRetryDelayMs(attempts);
      const nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();

      await this.database.orm.public.OutboxEvent.where({
        id: claimedEvent.id,
        publishedAt: null,
        claimedBy: this.instanceId,
      }).update({
        attempts,
        lastError: message,
        nextAttemptAt,
        claimedBy: null,
        claimedAt: null,
      });

      this.logger.error(
        `Failed to publish outbox event ${claimedEvent.id}; retrying in ${retryDelayMs / 1000}s: ${message}`,
      );
    }
  }

  private getRetryDelayMs(attempts: number): number {
    const exponentialDelay =
      INITIAL_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1);

    return Math.min(exponentialDelay, MAX_RETRY_DELAY_MS);
  }
}

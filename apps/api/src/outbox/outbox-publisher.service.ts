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
  claimedAt: string | null;
};

const OUTBOX_LEASE_MS = 30_000;

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
      }).all();

      const leaseCutoff = Date.now() - OUTBOX_LEASE_MS;

      for (const event of events) {
        if (!this.isAvailableForClaim(event.claimedAt, leaseCutoff)) {
          continue;
        }

        await this.claimAndPublish(event);
      }
    } finally {
      this.publishing = false;
    }
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
        lastError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Kafka publish error';

      await this.database.orm.public.OutboxEvent.where({
        id: claimedEvent.id,
        publishedAt: null,
        claimedBy: this.instanceId,
      }).update({
        attempts: claimedEvent.attempts + 1,
        lastError: message,
        claimedBy: null,
        claimedAt: null,
      });

      this.logger.error(
        `Failed to publish outbox event ${claimedEvent.id}: ${message}`,
      );
    }
  }
}

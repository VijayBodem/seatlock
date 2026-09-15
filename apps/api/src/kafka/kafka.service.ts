import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { Producer } from 'kafkajs';

import { KAFKA_PRODUCER } from './kafka.constants.js';

export type DomainEventMessage = {
  key: string;
  value: string;
};

@Injectable()
export class KafkaService implements OnApplicationShutdown {
  constructor(
    @Inject(KAFKA_PRODUCER)
    private readonly producer: Producer,
  ) {}

  async publishDomainEvent(message: DomainEventMessage): Promise<void> {
    const topic =
      process.env.KAFKA_DOMAIN_EVENTS_TOPIC ?? 'seatlock.domain-events';

    await this.producer.send({
      topic,
      messages: [
        {
          key: message.key,
          value: message.value,
        },
      ],
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.producer.disconnect();
  }
}

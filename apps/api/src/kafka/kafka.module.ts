import { Module } from '@nestjs/common';
import { Kafka, type Producer } from 'kafkajs';

import { KAFKA_PRODUCER } from './kafka.constants.js';
import { KafkaService } from './kafka.service.js';

@Module({
  providers: [
    {
      provide: KAFKA_PRODUCER,
      useFactory: async (): Promise<Producer> => {
        const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
          .split(',')
          .map((broker) => broker.trim())
          .filter(Boolean);

        const kafka = new Kafka({
          clientId: process.env.KAFKA_CLIENT_ID ?? 'seatlock-api',
          brokers,
        });

        const producer = kafka.producer();

        await producer.connect();

        return producer;
      },
    },
    KafkaService,
  ],
  exports: [KafkaService],
})
export class KafkaModule {}

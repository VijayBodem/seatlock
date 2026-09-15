import { Module } from '@nestjs/common';

import { KafkaModule } from '../kafka/kafka.module.js';
import { OutboxPublisherService } from './outbox-publisher.service.js';

@Module({
  imports: [KafkaModule],
  providers: [OutboxPublisherService],
})
export class OutboxModule {}

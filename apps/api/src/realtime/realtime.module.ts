import { Module } from '@nestjs/common';

import { SeatRealtimeGateway } from './seat-realtime.gateway.js';

@Module({
  providers: [SeatRealtimeGateway],
  exports: [SeatRealtimeGateway],
})
export class RealtimeModule {}

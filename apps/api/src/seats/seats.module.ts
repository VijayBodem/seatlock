import { Module } from '@nestjs/common';

import { SeatManagementController } from './seat-management.controller.js';
import { SeatsController } from './seats.controller.js';
import { SeatsService } from './seats.service.js';

@Module({
  controllers: [SeatsController, SeatManagementController],
  providers: [SeatsService],
})
export class SeatsModule {}

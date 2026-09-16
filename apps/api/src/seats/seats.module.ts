import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { SeatManagementController } from './seat-management.controller.js';
import { SeatsController } from './seats.controller.js';
import { SeatsService } from './seats.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SeatsController, SeatManagementController],
  providers: [SeatsService],
})
export class SeatsModule {}

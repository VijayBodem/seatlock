import { Module } from '@nestjs/common';

import { HoldsModule } from '../holds/holds.module.js';
import { ShowtimeManagementController } from './showtime-management.controller.js';
import { ShowtimesController } from './showtimes.controller.js';
import { ShowtimesService } from './showtimes.service.js';

@Module({
  imports: [HoldsModule],
  controllers: [ShowtimesController, ShowtimeManagementController],
  providers: [ShowtimesService],
})
export class ShowtimesModule {}

import { Module } from '@nestjs/common';

import { ShowtimeManagementController } from './showtime-management.controller.js';
import { ShowtimesController } from './showtimes.controller.js';
import { ShowtimesService } from './showtimes.service.js';

@Module({
  controllers: [ShowtimesController, ShowtimeManagementController],
  providers: [ShowtimesService],
})
export class ShowtimesModule {}

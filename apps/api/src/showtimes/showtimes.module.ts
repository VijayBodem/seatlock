import { Module } from '@nestjs/common';

import { HoldsModule } from '../holds/holds.module.js';
import { ShowtimeDiscoveryController } from './showtime-discovery.controller.js';
import { ShowtimeDiscoveryService } from './showtime-discovery.service.js';
import { ShowtimeManagementController } from './showtime-management.controller.js';
import { ShowtimesController } from './showtimes.controller.js';
import { ShowtimesService } from './showtimes.service.js';

@Module({
  imports: [HoldsModule],
  controllers: [
    ShowtimesController,
    ShowtimeManagementController,
    ShowtimeDiscoveryController,
  ],
  providers: [ShowtimesService, ShowtimeDiscoveryService],
})
export class ShowtimesModule {}

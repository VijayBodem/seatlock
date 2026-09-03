import { Module } from '@nestjs/common';

import { ScreensController } from './screens.controller.js';
import { ScreensService } from './screens.service.js';
import { ScreenManagementController } from './screen-management.controller.js';

@Module({
  controllers: [ScreensController, ScreenManagementController],
  providers: [ScreensService],
})
export class ScreensModule {}

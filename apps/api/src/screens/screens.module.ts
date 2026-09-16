import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ScreensController } from './screens.controller.js';
import { ScreensService } from './screens.service.js';
import { ScreenManagementController } from './screen-management.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [ScreensController, ScreenManagementController],
  providers: [ScreensService],
})
export class ScreensModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { HoldsCleanupService } from './holds-cleanup.service.js';
import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';

@Module({
  imports: [AuthModule],
  controllers: [HoldsController],
  providers: [HoldsService, HoldsCleanupService],
  exports: [HoldsService],
})
export class HoldsModule {}

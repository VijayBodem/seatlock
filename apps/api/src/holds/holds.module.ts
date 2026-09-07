import { Module } from '@nestjs/common';

import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';
import { HoldsCleanupService } from './holds-cleanup.service.js';

@Module({
  controllers: [HoldsController],
  providers: [HoldsService, HoldsCleanupService],
  exports: [HoldsService],
})
export class HoldsModule {}

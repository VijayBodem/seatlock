import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { HoldsService } from './holds.service.js';

@Injectable()
export class HoldsCleanupService {
  constructor(private readonly holdsService: HoldsService) {}

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'expire-stale-holds',
    waitForCompletion: true,
  })
  async expireStaleHolds() {
    await this.holdsService.expireAllStaleHolds();
  }
}

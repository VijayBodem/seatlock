import { Module } from '@nestjs/common';
import Stripe from 'stripe';

import { AuthModule } from '../auth/auth.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { PaymentsController } from './payments.controller.js';
import { STRIPE } from './payments.constants.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: STRIPE,
      useFactory: () => {
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
          throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }

        return new Stripe(secretKey);
      },
    },
  ],
})
export class PaymentsModule {}

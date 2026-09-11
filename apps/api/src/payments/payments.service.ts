import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Stripe from 'stripe';

import { BookingsService } from '../bookings/bookings.service.js';
import { DATABASE } from '../database/database.constants.js';
import { isUniqueConstraintViolation } from '../database/database-error.utils.js';
import type { db as DatabaseClient } from '../prisma/db.js';
import { STRIPE } from './payments.constants.js';

type StripeClient = Pick<Stripe, 'paymentIntents' | 'refunds' | 'webhooks'>;

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATABASE)
    private readonly database: typeof DatabaseClient,
    @Inject(STRIPE)
    private readonly stripe: StripeClient,
    private readonly bookingsService: BookingsService,
  ) {}

  async createForHold(holdId: number, userId: number) {
    const hold = await this.database.orm.public.SeatHold.first({
      id: holdId,
      userId,
    });

    if (!hold) {
      throw new NotFoundException(`Seat hold with id ${holdId} not found`);
    }

    if (
      hold.status !== 'ACTIVE' ||
      new Date(hold.expiresAt).getTime() <= Date.now()
    ) {
      throw new ConflictException(`Seat hold with id ${holdId} cannot be paid`);
    }

    const existingPayment = await this.database.orm.public.Payment.first({
      holdId,
      userId,
    });

    if (existingPayment) {
      if (
        existingPayment.provider !== 'stripe' ||
        existingPayment.status !== 'PENDING'
      ) {
        throw new ConflictException(
          `Payment for seat hold ${holdId} cannot be reused`,
        );
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        existingPayment.providerPaymentId,
      );

      if (!paymentIntent.client_secret) {
        throw new ConflictException('Stripe did not return a client secret');
      }

      return {
        id: existingPayment.id,
        holdId: existingPayment.holdId,
        status: existingPayment.status,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        clientSecret: paymentIntent.client_secret,
      };
    }

    const heldSeats = await this.database.orm.public.ShowtimeSeat.where({
      holdId,
      status: 'HELD',
    }).all();

    if (heldSeats.length === 0) {
      throw new ConflictException(
        `Seat hold with id ${holdId} has no held seats`,
      );
    }

    const amount = heldSeats.reduce((total, seat) => total + seat.price, 0);

    if (amount <= 0) {
      throw new ConflictException(
        `Seat hold with id ${holdId} has an invalid payment amount`,
      );
    }

    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency: 'inr',
        description: `SeatLock booking for hold ${holdId}`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          holdId: String(holdId),
          userId: String(userId),
        },
      },
      {
        idempotencyKey: `seatlock-hold-${holdId}`,
      },
    );

    if (!paymentIntent.client_secret) {
      throw new ConflictException('Stripe did not return a client secret');
    }

    try {
      const payment = await this.database.orm.public.Payment.create({
        userId,
        holdId,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: paymentIntent.id,
        amount,
        currency: 'inr',
      });

      return {
        id: payment.id,
        holdId: payment.holdId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }

      /*
       * Another request may have created the same payment after our
       * initial lookup but before our insert.
       *
       * Stripe's idempotency key guarantees both requests receive the
       * same PaymentIntent. Reload the winning local row and reuse it
       * instead of surfacing a database uniqueness error.
       */
      const concurrentPayment = await this.database.orm.public.Payment.first({
        holdId,
        userId,
      });

      if (
        !concurrentPayment ||
        concurrentPayment.provider !== 'stripe' ||
        concurrentPayment.status !== 'PENDING' ||
        concurrentPayment.providerPaymentId !== paymentIntent.id
      ) {
        throw error;
      }

      return {
        id: concurrentPayment.id,
        holdId: concurrentPayment.holdId,
        status: concurrentPayment.status,
        amount: concurrentPayment.amount,
        currency: concurrentPayment.currency,
        clientSecret: paymentIntent.client_secret,
      };
    }
  }

  constructWebhookEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    if (!rawBody) {
      throw new BadRequestException('Stripe webhook raw body is missing');
    }

    if (!signature) {
      throw new BadRequestException('Stripe-Signature header is missing');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }
  }

  async handleWebhookEvent(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      return this.handlePaymentIntentSucceeded(event.data.object);
    }

    if (
      event.type === 'refund.created' ||
      event.type === 'refund.updated' ||
      event.type === 'refund.failed'
    ) {
      return this.handleRefundEvent(event.data.object);
    }

    return {
      processed: false,
    };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    let payment = await this.database.orm.public.Payment.first({
      provider: 'stripe',
      providerPaymentId: paymentIntent.id,
    });

    if (!payment) {
      return {
        processed: false,
      };
    }

    if (
      paymentIntent.amount !== payment.amount ||
      paymentIntent.amount_received < payment.amount ||
      paymentIntent.currency.toLowerCase() !== payment.currency.toLowerCase()
    ) {
      return {
        processed: false,
        paymentId: payment.id,
        status: payment.status,
      };
    }

    if (payment.status === 'PENDING') {
      const succeededAt = new Date().toISOString();

      const updatedPayment = await this.database.orm.public.Payment.where({
        id: payment.id,
        status: 'PENDING',
      }).update({
        status: 'SUCCEEDED',
        succeededAt,
      });

      if (updatedPayment) {
        payment = updatedPayment;
      } else {
        const currentPayment = await this.database.orm.public.Payment.first({
          id: payment.id,
        });

        if (!currentPayment) {
          return {
            processed: false,
            paymentId: payment.id,
          };
        }

        payment = currentPayment;
      }
    }

    if (payment.status === 'SUCCEEDED') {
      const bookingResult = await this.finalizeBooking(
        payment.holdId,
        payment.userId,
      );

      if (bookingResult.bookingFinalized) {
        return {
          processed: true,
          paymentId: payment.id,
          status: payment.status,
          ...bookingResult,
        };
      }

      const refundResult = await this.refundUnfulfilledPayment(payment.id);

      return {
        processed: true,
        paymentId: payment.id,
        ...bookingResult,
        ...refundResult,
      };
    }

    /*
     * A previous delivery may already have discovered that fulfillment
     * was impossible and started the refund. Retry/reconcile that same
     * refund operation instead of attempting to book the seats again.
     */
    if (payment.status === 'REFUND_PENDING') {
      const refundResult = await this.refundUnfulfilledPayment(payment.id);

      return {
        processed: true,
        paymentId: payment.id,
        bookingFinalized: false,
        ...refundResult,
      };
    }

    if (payment.status === 'REFUNDED' || payment.status === 'REFUND_FAILED') {
      return {
        processed: true,
        paymentId: payment.id,
        status: payment.status,
        bookingFinalized: false,
      };
    }

    return {
      processed: false,
      paymentId: payment.id,
      status: payment.status,
    };
  }

  private async refundUnfulfilledPayment(paymentId: number) {
    let payment = await this.database.orm.public.Payment.first({
      id: paymentId,
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${paymentId} not found`);
    }

    if (payment.status === 'REFUNDED') {
      return {
        status: payment.status,
        refundId: payment.providerRefundId,
      };
    }

    if (payment.status === 'REFUND_FAILED') {
      return {
        status: payment.status,
        refundId: payment.providerRefundId,
      };
    }

    if (payment.status === 'SUCCEEDED') {
      const refundRequestedAt = new Date().toISOString();

      const refundPendingPayment = await this.database.orm.public.Payment.where(
        {
          id: payment.id,
          status: 'SUCCEEDED',
        },
      ).update({
        status: 'REFUND_PENDING',
        refundRequestedAt,
      });

      if (refundPendingPayment) {
        payment = refundPendingPayment;
      } else {
        const currentPayment = await this.database.orm.public.Payment.first({
          id: payment.id,
        });

        if (!currentPayment) {
          throw new NotFoundException(
            `Payment with id ${payment.id} not found`,
          );
        }

        payment = currentPayment;
      }
    }

    if (payment.status === 'REFUNDED') {
      return {
        status: payment.status,
        refundId: payment.providerRefundId,
      };
    }

    if (payment.status === 'REFUND_FAILED') {
      return {
        status: payment.status,
        refundId: payment.providerRefundId,
      };
    }

    if (payment.status !== 'REFUND_PENDING') {
      throw new ConflictException(
        `Payment with id ${payment.id} cannot be refunded`,
      );
    }

    /*
     * If we already persisted Stripe's refund ID, retrieve the same
     * provider object rather than creating another refund.
     *
     * If the Stripe request previously succeeded but our database update
     * failed, the idempotency key below makes a retry return the same
     * refund instead of issuing a second refund.
     */
    const refund = payment.providerRefundId
      ? await this.stripe.refunds.retrieve(payment.providerRefundId)
      : await this.stripe.refunds.create(
          {
            payment_intent: payment.providerPaymentId,
            amount: payment.amount,
            metadata: {
              paymentId: String(payment.id),
              holdId: String(payment.holdId),
            },
          },
          {
            idempotencyKey: `seatlock-refund-payment-${payment.id}`,
          },
        );

    return this.applyRefundState(payment.id, refund);
  }

  private async handleRefundEvent(refund: Stripe.Refund) {
    let payment = await this.database.orm.public.Payment.first({
      provider: 'stripe',
      providerRefundId: refund.id,
    });

    /*
     * A Stripe webhook can race with the response from refunds.create().
     * In that case providerRefundId may not have been persisted yet.
     * Recover the payment through the PaymentIntent relationship.
     */
    if (!payment) {
      const paymentIntentId = this.getRefundPaymentIntentId(refund);

      if (paymentIntentId) {
        const candidate = await this.database.orm.public.Payment.first({
          provider: 'stripe',
          providerPaymentId: paymentIntentId,
        });

        if (candidate?.status === 'REFUND_PENDING') {
          payment = candidate;
        }
      }
    }

    if (!payment) {
      return {
        processed: false,
      };
    }

    if (
      payment.status !== 'REFUND_PENDING' &&
      payment.status !== 'REFUNDED' &&
      payment.status !== 'REFUND_FAILED'
    ) {
      return {
        processed: false,
        paymentId: payment.id,
        status: payment.status,
      };
    }

    const refundResult = await this.applyRefundState(payment.id, refund);

    return {
      processed: true,
      paymentId: payment.id,
      ...refundResult,
    };
  }

  private async applyRefundState(paymentId: number, refund: Stripe.Refund) {
    if (
      refund.status === 'pending' ||
      refund.status === 'requires_action' ||
      refund.status === null
    ) {
      const payment = await this.database.orm.public.Payment.where({
        id: paymentId,
        status: 'REFUND_PENDING',
      }).update({
        providerRefundId: refund.id,
      });

      if (payment) {
        return {
          status: payment.status,
          refundId: refund.id,
        };
      }

      return this.getCurrentRefundState(paymentId, refund.id);
    }

    if (refund.status === 'succeeded') {
      const refundedAt = new Date().toISOString();

      const payment = await this.database.orm.public.Payment.where({
        id: paymentId,
        status: 'REFUND_PENDING',
      }).update({
        status: 'REFUNDED',
        providerRefundId: refund.id,
        refundedAt,
        refundFailedAt: null,
        refundFailureReason: null,
      });

      if (payment) {
        return {
          status: payment.status,
          refundId: refund.id,
        };
      }

      return this.getCurrentRefundState(paymentId, refund.id);
    }

    if (refund.status === 'failed' || refund.status === 'canceled') {
      const refundFailedAt = new Date().toISOString();

      const refundFailureReason =
        refund.failure_reason ??
        (refund.status === 'canceled'
          ? 'Refund canceled by Stripe'
          : 'Stripe refund failed');

      const payment = await this.database.orm.public.Payment.where({
        id: paymentId,
        status: 'REFUND_PENDING',
      }).update({
        status: 'REFUND_FAILED',
        providerRefundId: refund.id,
        refundFailedAt,
        refundFailureReason,
      });

      if (payment) {
        return {
          status: payment.status,
          refundId: refund.id,
        };
      }

      return this.getCurrentRefundState(paymentId, refund.id);
    }

    return this.getCurrentRefundState(paymentId, refund.id);
  }

  private async getCurrentRefundState(paymentId: number, refundId: string) {
    const payment = await this.database.orm.public.Payment.first({
      id: paymentId,
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${paymentId} not found`);
    }

    return {
      status: payment.status,
      refundId: payment.providerRefundId ?? refundId,
    };
  }

  private getRefundPaymentIntentId(refund: Stripe.Refund) {
    if (typeof refund.payment_intent === 'string') {
      return refund.payment_intent;
    }

    return refund.payment_intent?.id ?? null;
  }

  private async finalizeBooking(holdId: number, userId: number) {
    try {
      const booking = await this.bookingsService.confirm(holdId, userId);

      return {
        bookingFinalized: true,
        bookingId: booking.id,
      };
    } catch (error) {
      /*
       * Stripe may succeed after the temporary hold has already expired
       * or been released.
       *
       * Never reclaim those seats. Conflict/NotFound means fulfillment
       * is no longer possible, so the payment recovery workflow may
       * safely refund the customer.
       */
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        return {
          bookingFinalized: false,
        };
      }

      /*
       * Unexpected infrastructure or programming failures should remain
       * retryable by Stripe. Do not refund for a transient server error.
       */
      throw error;
    }
  }
}

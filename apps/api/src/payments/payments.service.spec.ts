import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  const seatHoldFirstMock = jest.fn();
  const showtimeSeatAllMock = jest.fn();

  const paymentFirstMock = jest.fn();
  const paymentCreateMock = jest.fn();
  const paymentUpdateMock = jest.fn();

  const showtimeSeatWhereMock = jest.fn();
  const paymentWhereMock = jest.fn();

  const databaseMock = {
    orm: {
      public: {
        SeatHold: {
          first: seatHoldFirstMock,
        },
        ShowtimeSeat: {
          where: showtimeSeatWhereMock,
        },
        Payment: {
          first: paymentFirstMock,
          create: paymentCreateMock,
          where: paymentWhereMock,
        },
      },
    },
  };

  const paymentIntentCreateMock = jest.fn();
  const paymentIntentRetrieveMock = jest.fn();
  const webhookConstructEventMock = jest.fn();

  const refundCreateMock = jest.fn();
  const refundRetrieveMock = jest.fn();

  const stripeMock = {
    paymentIntents: {
      create: paymentIntentCreateMock,
      retrieve: paymentIntentRetrieveMock,
    },
    refunds: {
      create: refundCreateMock,
      retrieve: refundRetrieveMock,
    },
    webhooks: {
      constructEvent: webhookConstructEventMock,
    },
  };

  const bookingConfirmMock = jest.fn();

  const bookingsServiceMock = {
    confirm: bookingConfirmMock,
  };

  let service: PaymentsService;

  beforeEach(() => {
    jest.resetAllMocks();

    showtimeSeatWhereMock.mockImplementation(() => ({
      all: showtimeSeatAllMock,
    }));

    paymentWhereMock.mockImplementation(() => ({
      update: paymentUpdateMock,
    }));

    bookingConfirmMock.mockResolvedValue({
      id: 90,
      showtimeId: 10,
      holdId: 50,
      seatIds: [1, 2],
      createdAt: '2026-09-11T04:00:00.000Z',
    });

    service = new PaymentsService(
      databaseMock as never,
      stripeMock as never,
      bookingsServiceMock as never,
    );
  });

  describe('createForHold', () => {
    it('creates a Stripe payment intent using the authoritative seat total', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      paymentFirstMock.mockResolvedValue(null);

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          showtimeId: 10,
          seatId: 1,
          status: 'HELD',
          holdId: 50,
          price: 20000,
        },
        {
          id: 101,
          showtimeId: 10,
          seatId: 2,
          status: 'HELD',
          holdId: 50,
          price: 35000,
        },
      ]);

      paymentIntentCreateMock.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
      });

      paymentCreateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
        succeededAt: null,
        createdAt: '2026-09-10T07:30:00.000Z',
        updatedAt: '2026-09-10T07:30:00.000Z',
      });

      const result = await service.createForHold(50, 7);

      expect(seatHoldFirstMock).toHaveBeenCalledWith({
        id: 50,
        userId: 7,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        holdId: 50,
        status: 'HELD',
      });

      expect(paymentIntentCreateMock).toHaveBeenCalledWith(
        {
          amount: 55000,
          currency: 'inr',
          description: 'SeatLock booking for hold 50',
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          metadata: {
            holdId: '50',
            userId: '7',
          },
        },
        {
          idempotencyKey: 'seatlock-hold-50',
        },
      );

      expect(paymentCreateMock).toHaveBeenCalledWith({
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      expect(result).toEqual({
        id: 80,
        holdId: 50,
        status: 'PENDING',
        amount: 55000,
        currency: 'inr',
        clientSecret: 'pi_test_123_secret_test',
      });
    });

    it('throws NotFoundException when the hold does not belong to the user', async () => {
      seatHoldFirstMock.mockResolvedValue(null);

      await expect(service.createForHold(50, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(paymentIntentCreateMock).not.toHaveBeenCalled();

      expect(paymentCreateMock).not.toHaveBeenCalled();
    });

    it('reuses an existing pending payment while the hold is active', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
        succeededAt: null,
      });

      paymentIntentRetrieveMock.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
      });

      const result = await service.createForHold(50, 7);

      expect(paymentIntentRetrieveMock).toHaveBeenCalledWith('pi_test_123');

      expect(paymentIntentCreateMock).not.toHaveBeenCalled();

      expect(paymentCreateMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        id: 80,
        holdId: 50,
        status: 'PENDING',
        amount: 55000,
        currency: 'inr',
        clientSecret: 'pi_test_123_secret_test',
      });
    });

    it('throws ConflictException when the hold is not active', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'COMPLETED',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      await expect(service.createForHold(50, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(paymentIntentCreateMock).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the hold has expired', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2000-01-01T00:00:00.000Z',
      });

      await expect(service.createForHold(50, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(paymentIntentCreateMock).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the hold has no held seats', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      paymentFirstMock.mockResolvedValue(null);
      showtimeSeatAllMock.mockResolvedValue([]);

      await expect(service.createForHold(50, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(paymentIntentCreateMock).not.toHaveBeenCalled();

      expect(paymentCreateMock).not.toHaveBeenCalled();
    });

    it('reuses the payment created by a concurrent request after a unique constraint violation', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      paymentFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          showtimeId: 10,
          seatId: 1,
          status: 'HELD',
          holdId: 50,
          price: 20000,
        },
        {
          id: 101,
          showtimeId: 10,
          seatId: 2,
          status: 'HELD',
          holdId: 50,
          price: 35000,
        },
      ]);

      paymentIntentCreateMock.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
      });

      paymentCreateMock.mockRejectedValue({
        sqlState: '23505',
        constraint: 'payment_holdId_key',
      });

      const result = await service.createForHold(50, 7);

      expect(paymentFirstMock).toHaveBeenNthCalledWith(2, {
        holdId: 50,
        userId: 7,
      });

      expect(result).toEqual({
        id: 80,
        holdId: 50,
        status: 'PENDING',
        amount: 55000,
        currency: 'inr',
        clientSecret: 'pi_test_123_secret_test',
      });
    });

    it('rethrows a unique constraint violation when the concurrent payment does not match the Stripe payment intent', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2099-09-10T13:00:00.000Z',
      });

      paymentFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_different',
        amount: 55000,
        currency: 'inr',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          showtimeId: 10,
          seatId: 1,
          status: 'HELD',
          holdId: 50,
          price: 20000,
        },
        {
          id: 101,
          showtimeId: 10,
          seatId: 2,
          status: 'HELD',
          holdId: 50,
          price: 35000,
        },
      ]);

      paymentIntentCreateMock.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test',
      });

      const databaseError = {
        sqlState: '23505',
        constraint: 'payment_holdId_key',
      };

      paymentCreateMock.mockRejectedValue(databaseError);

      await expect(service.createForHold(50, 7)).rejects.toBe(databaseError);
    });
  });

  describe('constructWebhookEvent', () => {
    const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    });

    afterEach(() => {
      if (originalWebhookSecret === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
      }
    });

    it('constructs a verified Stripe webhook event', () => {
      const rawBody = Buffer.from(
        JSON.stringify({
          id: 'evt_test_123',
        }),
      );

      const event = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
      };

      webhookConstructEventMock.mockReturnValue(event);

      const result = service.constructWebhookEvent(rawBody, 'test-signature');

      expect(webhookConstructEventMock).toHaveBeenCalledWith(
        rawBody,
        'test-signature',
        'whsec_test_secret',
      );

      expect(result).toEqual(event);
    });

    it('throws BadRequestException when raw body is missing', () => {
      expect(() =>
        service.constructWebhookEvent(undefined, 'test-signature'),
      ).toThrow('Stripe webhook raw body is missing');

      expect(webhookConstructEventMock).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when signature is missing', () => {
      expect(() =>
        service.constructWebhookEvent(Buffer.from('{}'), undefined),
      ).toThrow('Stripe-Signature header is missing');

      expect(webhookConstructEventMock).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an invalid Stripe signature', () => {
      webhookConstructEventMock.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() =>
        service.constructWebhookEvent(Buffer.from('{}'), 'bad-signature'),
      ).toThrow('Invalid Stripe webhook signature');
    });
  });

  describe('handleWebhookEvent', () => {
    it('marks a pending payment as succeeded and finalizes the booking', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
        succeededAt: null,
      });

      paymentUpdateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'SUCCEEDED',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
        succeededAt: '2026-09-11T04:00:00.000Z',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentFirstMock).toHaveBeenCalledWith({
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
      });

      expect(paymentWhereMock).toHaveBeenCalledWith({
        id: 80,
        status: 'PENDING',
      });

      expect(paymentUpdateMock).toHaveBeenCalledWith({
        status: 'SUCCEEDED',
        succeededAt: expect.any(String),
      });

      expect(bookingConfirmMock).toHaveBeenCalledWith(50, 7);

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        status: 'SUCCEEDED',
        bookingFinalized: true,
        bookingId: 90,
      });
    });

    it('does not update an already succeeded payment and retries booking finalization', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'SUCCEEDED',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
        succeededAt: '2026-09-11T04:00:00.000Z',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).toHaveBeenCalledWith(50, 7);

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        status: 'SUCCEEDED',
        bookingFinalized: true,
        bookingId: 90,
      });
    });

    it('does not succeed a payment when the Stripe amount does not match', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 20000,
            amount_received: 20000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        processed: false,
        paymentId: 80,
        status: 'PENDING',
      });
    });

    it('does not succeed a payment when the Stripe currency does not match', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'usd',
          },
        },
      } as never);

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        processed: false,
        paymentId: 80,
        status: 'PENDING',
      });
    });

    it('does not succeed a payment when the received amount is insufficient', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 20000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        processed: false,
        paymentId: 80,
        status: 'PENDING',
      });
    });

    it('ignores a succeeded event for an unknown payment', async () => {
      paymentFirstMock.mockResolvedValue(null);

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_unknown',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        processed: false,
      });
    });

    it('ignores webhook event types that are not handled', async () => {
      const result = await service.handleWebhookEvent({
        type: 'payment_intent.created',
      } as never);

      expect(paymentFirstMock).not.toHaveBeenCalled();

      expect(paymentUpdateMock).not.toHaveBeenCalled();

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        processed: false,
      });
    });

    it('keeps the payment refund pending when Stripe reports a pending refund', async () => {
      paymentFirstMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        });

      bookingConfirmMock.mockRejectedValue(
        new ConflictException('Seat hold with id 50 cannot be confirmed'),
      );

      paymentUpdateMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUND_PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUND_PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: 're_test_123',
          amount: 55000,
          currency: 'inr',
        });

      refundCreateMock.mockResolvedValue({
        id: 're_test_123',
        status: 'pending',
        payment_intent: 'pi_test_123',
        failure_reason: null,
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        bookingFinalized: false,
        status: 'REFUND_PENDING',
        refundId: 're_test_123',
      });
    });

    it('marks the payment refund failed when Stripe reports a failed refund', async () => {
      paymentFirstMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        });

      bookingConfirmMock.mockRejectedValue(
        new ConflictException('Seat hold with id 50 cannot be confirmed'),
      );

      paymentUpdateMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUND_PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUND_FAILED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: 're_test_123',
          amount: 55000,
          currency: 'inr',
          refundFailureReason: 'expired_or_canceled_card',
        });

      refundCreateMock.mockResolvedValue({
        id: 're_test_123',
        status: 'failed',
        payment_intent: 'pi_test_123',
        failure_reason: 'expired_or_canceled_card',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        bookingFinalized: false,
        status: 'REFUND_FAILED',
        refundId: 're_test_123',
      });
    });

    it('reconciles a refund webhook from pending to refunded', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUND_PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: 're_test_123',
        amount: 55000,
        currency: 'inr',
      });

      paymentUpdateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUNDED',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: 're_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'refund.updated',
        data: {
          object: {
            id: 're_test_123',
            status: 'succeeded',
            payment_intent: 'pi_test_123',
            failure_reason: null,
          },
        },
      } as never);

      expect(paymentFirstMock).toHaveBeenCalledWith({
        provider: 'stripe',
        providerRefundId: 're_test_123',
      });

      expect(paymentWhereMock).toHaveBeenCalledWith({
        id: 80,
        status: 'REFUND_PENDING',
      });

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        status: 'REFUNDED',
        refundId: 're_test_123',
      });
    });

    it('resumes an existing pending refund without retrying the booking', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUND_PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: 're_test_123',
        amount: 55000,
        currency: 'inr',
      });

      refundRetrieveMock.mockResolvedValue({
        id: 're_test_123',
        status: 'pending',
        payment_intent: 'pi_test_123',
        failure_reason: null,
      });

      paymentUpdateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUND_PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: 're_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(bookingConfirmMock).not.toHaveBeenCalled();

      expect(refundCreateMock).not.toHaveBeenCalled();

      expect(refundRetrieveMock).toHaveBeenCalledWith('re_test_123');

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        bookingFinalized: false,
        status: 'REFUND_PENDING',
        refundId: 're_test_123',
      });
    });

    it('reconciles a refund webhook using the payment intent when the refund id is not stored yet', async () => {
      paymentFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUND_PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: null,
        amount: 55000,
        currency: 'inr',
      });

      paymentUpdateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'REFUNDED',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        providerRefundId: 're_test_123',
        amount: 55000,
        currency: 'inr',
      });

      const result = await service.handleWebhookEvent({
        type: 'refund.updated',
        data: {
          object: {
            id: 're_test_123',
            status: 'succeeded',
            payment_intent: 'pi_test_123',
            failure_reason: null,
          },
        },
      } as never);

      expect(paymentFirstMock).toHaveBeenNthCalledWith(1, {
        provider: 'stripe',
        providerRefundId: 're_test_123',
      });

      expect(paymentFirstMock).toHaveBeenNthCalledWith(2, {
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
      });

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        status: 'REFUNDED',
        refundId: 're_test_123',
      });
    });

    it('handles concurrent duplicate success delivery safely', async () => {
      paymentFirstMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          amount: 55000,
          currency: 'inr',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          amount: 55000,
          currency: 'inr',
        });

      paymentUpdateMock.mockResolvedValue(null);

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(paymentFirstMock).toHaveBeenNthCalledWith(2, {
        id: 80,
      });

      expect(bookingConfirmMock).toHaveBeenCalledWith(50, 7);

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        status: 'SUCCEEDED',
        bookingFinalized: true,
        bookingId: 90,
      });
    });

    it('refunds a successful payment when the hold can no longer be booked', async () => {
      paymentFirstMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
          succeededAt: null,
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
          succeededAt: '2026-09-11T04:00:00.000Z',
        });

      paymentUpdateMock
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'SUCCEEDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
          succeededAt: '2026-09-11T04:00:00.000Z',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUND_PENDING',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: null,
          amount: 55000,
          currency: 'inr',
          succeededAt: '2026-09-11T04:00:00.000Z',
          refundRequestedAt: '2026-09-11T04:01:00.000Z',
        })
        .mockResolvedValueOnce({
          id: 80,
          userId: 7,
          holdId: 50,
          status: 'REFUNDED',
          provider: 'stripe',
          providerPaymentId: 'pi_test_123',
          providerRefundId: 're_test_123',
          amount: 55000,
          currency: 'inr',
          succeededAt: '2026-09-11T04:00:00.000Z',
          refundRequestedAt: '2026-09-11T04:01:00.000Z',
          refundedAt: '2026-09-11T04:02:00.000Z',
        });

      bookingConfirmMock.mockRejectedValue(
        new ConflictException('Seat hold with id 50 cannot be confirmed'),
      );

      refundCreateMock.mockResolvedValue({
        id: 're_test_123',
        status: 'succeeded',
        payment_intent: 'pi_test_123',
        failure_reason: null,
      });

      const result = await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 55000,
            amount_received: 55000,
            currency: 'inr',
          },
        },
      } as never);

      expect(bookingConfirmMock).toHaveBeenCalledWith(50, 7);

      expect(refundCreateMock).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_test_123',
          amount: 55000,
          metadata: {
            paymentId: '80',
            holdId: '50',
          },
        },
        {
          idempotencyKey: 'seatlock-refund-payment-80',
        },
      );

      expect(paymentWhereMock).toHaveBeenNthCalledWith(2, {
        id: 80,
        status: 'SUCCEEDED',
      });

      expect(paymentWhereMock).toHaveBeenNthCalledWith(3, {
        id: 80,
        status: 'REFUND_PENDING',
      });

      expect(result).toEqual({
        processed: true,
        paymentId: 80,
        bookingFinalized: false,
        status: 'REFUNDED',
        refundId: 're_test_123',
      });
    });

    it('rethrows unexpected booking failures so Stripe can retry the webhook', async () => {
      paymentFirstMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'PENDING',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      paymentUpdateMock.mockResolvedValue({
        id: 80,
        userId: 7,
        holdId: 50,
        status: 'SUCCEEDED',
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        amount: 55000,
        currency: 'inr',
      });

      bookingConfirmMock.mockRejectedValue(new Error('database unavailable'));

      await expect(
        service.handleWebhookEvent({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              amount: 55000,
              amount_received: 55000,
              currency: 'inr',
            },
          },
        } as never),
      ).rejects.toThrow('database unavailable');
    });
  });
});

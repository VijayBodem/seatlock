import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { HoldsService } from './holds.service.js';

describe('HoldsService', () => {
  const showtimeFirstMock = jest.fn();

  const seatHoldAllMock = jest.fn();
  const seatHoldUpdateMock = jest.fn();
  const seatHoldCreateMock = jest.fn();

  const seatHoldWhereMock = jest.fn(() => ({
    all: seatHoldAllMock,
    update: seatHoldUpdateMock,
  }));

  const showtimeSeatAllMock = jest.fn();
  const showtimeSeatUpdateMock = jest.fn();

  const showtimeSeatWhereMock = jest.fn(() => ({
    all: showtimeSeatAllMock,
    update: showtimeSeatUpdateMock,
  }));

  const transactionClientMock = {
    orm: {
      public: {
        SeatHold: {
          where: seatHoldWhereMock,
          create: seatHoldCreateMock,
        },
        ShowtimeSeat: {
          where: showtimeSeatWhereMock,
        },
      },
    },
  };

  const transactionMock = jest.fn(
    (callback: (tx: typeof transactionClientMock) => Promise<unknown>) =>
      callback(transactionClientMock),
  );

  const databaseMock = {
    orm: {
      public: {
        Showtime: {
          first: showtimeFirstMock,
        },
      },
    },
    transaction: transactionMock,
  };

  let service: HoldsService;

  beforeEach(() => {
    jest.clearAllMocks();

    seatHoldAllMock.mockResolvedValue([]);

    service = new HoldsService(databaseMock as never);
  });

  describe('create', () => {
    it('creates a hold and claims every requested seat', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 10,
      });

      seatHoldCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        status: 'ACTIVE',
        expiresAt: '2026-09-05T13:00:00.000Z',
      });

      showtimeSeatUpdateMock
        .mockResolvedValueOnce({
          id: 100,
          showtimeId: 10,
          seatId: 1,
          status: 'HELD',
          holdId: 50,
        })
        .mockResolvedValueOnce({
          id: 101,
          showtimeId: 10,
          seatId: 2,
          status: 'HELD',
          holdId: 50,
        });

      const result = await service.create(10, {
        seatIds: [2, 1],
      });

      expect(showtimeFirstMock).toHaveBeenCalledWith({
        id: 10,
      });

      expect(transactionMock).toHaveBeenCalledTimes(2);

      expect(seatHoldCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          showtimeId: 10,
          status: 'ACTIVE',
        }),
      );

      expect(showtimeSeatWhereMock).toHaveBeenNthCalledWith(1, {
        showtimeId: 10,
        seatId: 1,
        status: 'AVAILABLE',
      });

      expect(showtimeSeatWhereMock).toHaveBeenNthCalledWith(2, {
        showtimeId: 10,
        seatId: 2,
        status: 'AVAILABLE',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 50,
          showtimeId: 10,
          status: 'ACTIVE',
          seatIds: [1, 2],
        }),
      );
    });

    it('throws NotFoundException when showtime does not exist', async () => {
      showtimeFirstMock.mockResolvedValue(null);

      await expect(
        service.create(999, {
          seatIds: [1],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a requested seat cannot be claimed', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 10,
      });

      seatHoldCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        status: 'ACTIVE',
        expiresAt: '2026-09-05T13:00:00.000Z',
      });

      showtimeSeatUpdateMock.mockResolvedValue(null);

      await expect(
        service.create(10, {
          seatIds: [1],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('expireStaleHolds', () => {
    it('does not expire a hold whose expiration time is still in the future', async () => {
      seatHoldAllMock.mockResolvedValue([
        {
          id: 40,
          showtimeId: 10,
          status: 'ACTIVE',
          expiresAt: '2999-01-01T00:00:00.000Z',
        },
      ]);

      await service.expireStaleHolds(10);

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        showtimeId: 10,
        status: 'ACTIVE',
      });

      expect(seatHoldUpdateMock).not.toHaveBeenCalled();
      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
      expect(showtimeSeatUpdateMock).not.toHaveBeenCalled();
    });

    it('expires a stale hold and releases its held seats', async () => {
      seatHoldAllMock.mockResolvedValue([
        {
          id: 40,
          showtimeId: 10,
          status: 'ACTIVE',
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
      ]);

      seatHoldUpdateMock.mockResolvedValue({
        id: 40,
        showtimeId: 10,
        status: 'EXPIRED',
        expiresAt: '2000-01-01T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 90,
          showtimeId: 10,
          seatId: 1,
          status: 'HELD',
          holdId: 40,
        },
      ]);

      showtimeSeatUpdateMock.mockResolvedValue({
        id: 90,
        showtimeId: 10,
        seatId: 1,
        status: 'AVAILABLE',
        holdId: null,
      });

      await service.expireStaleHolds(10);

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        showtimeId: 10,
        status: 'ACTIVE',
      });

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        id: 40,
        status: 'ACTIVE',
      });

      expect(seatHoldUpdateMock).toHaveBeenCalledWith({
        status: 'EXPIRED',
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        holdId: 40,
        status: 'HELD',
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        id: 90,
        holdId: 40,
        status: 'HELD',
      });

      expect(showtimeSeatUpdateMock).toHaveBeenCalledWith({
        status: 'AVAILABLE',
        holdId: null,
      });
    });

    it('does not release seats when another transaction already expired the hold', async () => {
      seatHoldAllMock.mockResolvedValue([
        {
          id: 40,
          showtimeId: 10,
          status: 'ACTIVE',
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
      ]);

      seatHoldUpdateMock.mockResolvedValue(null);

      await service.expireStaleHolds(10);

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        showtimeId: 10,
        status: 'ACTIVE',
      });

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        id: 40,
        status: 'ACTIVE',
      });

      expect(seatHoldUpdateMock).toHaveBeenCalledWith({
        status: 'EXPIRED',
      });

      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
      expect(showtimeSeatUpdateMock).not.toHaveBeenCalled();
    });
  });
});

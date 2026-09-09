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

  const emitSeatStatusChangedMock = jest.fn();

  const seatRealtimeGatewayMock = {
    emitSeatStatusChanged: emitSeatStatusChangedMock,
  };

  let service: HoldsService;

  beforeEach(() => {
    jest.clearAllMocks();

    seatHoldAllMock.mockResolvedValue([]);

    service = new HoldsService(
      databaseMock as never,
      seatRealtimeGatewayMock as never,
    );
  });

  describe('create', () => {
    it('creates an owned hold, claims every requested seat, and broadcasts the committed change', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 10,
      });

      seatHoldCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
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

      const result = await service.create(
        10,
        {
          seatIds: [2, 1],
        },
        7,
      );

      expect(showtimeFirstMock).toHaveBeenCalledWith({
        id: 10,
      });

      expect(transactionMock).toHaveBeenCalledTimes(2);

      expect(seatHoldCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          showtimeId: 10,
          userId: 7,
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

      expect(emitSeatStatusChangedMock).toHaveBeenCalledTimes(1);
      expect(emitSeatStatusChangedMock).toHaveBeenCalledWith({
        showtimeId: 10,
        seatIds: [1, 2],
        status: 'HELD',
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
        service.create(
          999,
          {
            seatIds: [1],
          },
          7,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(transactionMock).not.toHaveBeenCalled();
      expect(seatHoldCreateMock).not.toHaveBeenCalled();
      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });

    it('throws ConflictException without broadcasting when a requested seat cannot be claimed', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 10,
      });

      seatHoldCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 10,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2026-09-05T13:00:00.000Z',
      });

      showtimeSeatUpdateMock.mockResolvedValue(null);

      await expect(
        service.create(
          10,
          {
            seatIds: [1],
          },
          7,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(seatHoldCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 7,
        }),
      );

      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });
  });

  describe('expireStaleHolds', () => {
    it('scopes active hold cleanup to the requested showtime', async () => {
      await service.expireStaleHolds(10);

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        showtimeId: 10,
        status: 'ACTIVE',
      });

      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });

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

      expect(seatHoldUpdateMock).not.toHaveBeenCalled();
      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
      expect(showtimeSeatUpdateMock).not.toHaveBeenCalled();
      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });

    it('expires a stale hold, releases its held seats, and broadcasts availability', async () => {
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

      expect(emitSeatStatusChangedMock).toHaveBeenCalledTimes(1);
      expect(emitSeatStatusChangedMock).toHaveBeenCalledWith({
        showtimeId: 10,
        seatIds: [1],
        status: 'AVAILABLE',
      });
    });

    it('does not release or broadcast seats when another transaction already expired the hold', async () => {
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

      expect(seatHoldUpdateMock).toHaveBeenCalledWith({
        status: 'EXPIRED',
      });

      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
      expect(showtimeSeatUpdateMock).not.toHaveBeenCalled();
      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });

    it('does not broadcast a seat whose conditional release did not succeed', async () => {
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

      showtimeSeatUpdateMock.mockResolvedValue(null);

      await service.expireStaleHolds(10);

      expect(showtimeSeatUpdateMock).toHaveBeenCalledWith({
        status: 'AVAILABLE',
        holdId: null,
      });

      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });
  });

  describe('expireAllStaleHolds', () => {
    it('loads all active holds without restricting cleanup to one showtime', async () => {
      await service.expireAllStaleHolds();

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        status: 'ACTIVE',
      });

      expect(seatHoldWhereMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          showtimeId: expect.any(Number),
        }),
      );

      expect(emitSeatStatusChangedMock).not.toHaveBeenCalled();
    });

    it('expires stale active holds across different showtimes and broadcasts each room', async () => {
      seatHoldAllMock.mockResolvedValue([
        {
          id: 40,
          showtimeId: 10,
          status: 'ACTIVE',
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
        {
          id: 41,
          showtimeId: 20,
          status: 'ACTIVE',
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
      ]);

      seatHoldUpdateMock
        .mockResolvedValueOnce({
          id: 40,
          showtimeId: 10,
          status: 'EXPIRED',
        })
        .mockResolvedValueOnce({
          id: 41,
          showtimeId: 20,
          status: 'EXPIRED',
        });

      showtimeSeatAllMock
        .mockResolvedValueOnce([
          {
            id: 90,
            seatId: 1,
            holdId: 40,
            status: 'HELD',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 91,
            seatId: 2,
            holdId: 41,
            status: 'HELD',
          },
        ]);

      showtimeSeatUpdateMock
        .mockResolvedValueOnce({
          id: 90,
          status: 'AVAILABLE',
          holdId: null,
        })
        .mockResolvedValueOnce({
          id: 91,
          status: 'AVAILABLE',
          holdId: null,
        });

      await service.expireAllStaleHolds();

      expect(seatHoldUpdateMock).toHaveBeenCalledTimes(2);

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        holdId: 40,
        status: 'HELD',
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        holdId: 41,
        status: 'HELD',
      });

      expect(showtimeSeatUpdateMock).toHaveBeenCalledTimes(2);

      expect(emitSeatStatusChangedMock).toHaveBeenCalledTimes(2);

      expect(emitSeatStatusChangedMock).toHaveBeenCalledWith({
        showtimeId: 10,
        seatIds: [1],
        status: 'AVAILABLE',
      });

      expect(emitSeatStatusChangedMock).toHaveBeenCalledWith({
        showtimeId: 20,
        seatIds: [2],
        status: 'AVAILABLE',
      });
    });
  });
});

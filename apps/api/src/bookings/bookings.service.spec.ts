import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { BookingsService } from './bookings.service.js';

describe('BookingsService', () => {
  const seatHoldFirstMock = jest.fn();
  const seatHoldUpdateMock = jest.fn();

  const seatHoldWhereMock = jest.fn(() => ({
    update: seatHoldUpdateMock,
  }));

  const showtimeSeatAllMock = jest.fn();
  const showtimeSeatUpdateMock = jest.fn();

  const showtimeSeatWhereMock = jest.fn(() => ({
    all: showtimeSeatAllMock,
    update: showtimeSeatUpdateMock,
  }));

  const bookingCreateMock = jest.fn();
  const bookingFirstMock = jest.fn();

  const bookingAllMock = jest.fn();

  const bookingWhereMock = jest.fn(() => ({
    all: bookingAllMock,
  }));

  const transactionClientMock = {
    orm: {
      public: {
        SeatHold: {
          first: seatHoldFirstMock,
          where: seatHoldWhereMock,
        },
        ShowtimeSeat: {
          where: showtimeSeatWhereMock,
        },
        Booking: {
          create: bookingCreateMock,
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
        Booking: {
          first: bookingFirstMock,
          where: bookingWhereMock,
        },
        ShowtimeSeat: {
          where: showtimeSeatWhereMock,
        },
      },
    },
    transaction: transactionMock,
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new BookingsService(databaseMock as never);
  });

  describe('confirm', () => {
    it('confirms an owned active hold and books all held seats', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2999-01-01T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          seatId: 1,
          holdId: 10,
          status: 'HELD',
        },
        {
          id: 101,
          seatId: 2,
          holdId: 10,
          status: 'HELD',
        },
      ]);

      seatHoldUpdateMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'COMPLETED',
      });

      bookingCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeSeatUpdateMock
        .mockResolvedValueOnce({
          id: 100,
          seatId: 1,
          status: 'BOOKED',
          bookingId: 50,
        })
        .mockResolvedValueOnce({
          id: 101,
          seatId: 2,
          status: 'BOOKED',
          bookingId: 50,
        });

      await expect(service.confirm(10, 7)).resolves.toEqual({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        seatIds: [1, 2],
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      expect(transactionMock).toHaveBeenCalledTimes(1);

      expect(seatHoldFirstMock).toHaveBeenCalledWith({
        id: 10,
        userId: 7,
      });

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        id: 10,
        userId: 7,
        status: 'ACTIVE',
      });

      expect(seatHoldUpdateMock).toHaveBeenCalledWith({
        status: 'COMPLETED',
      });

      expect(bookingCreateMock).toHaveBeenCalledWith({
        showtimeId: 20,
        holdId: 10,
        userId: 7,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        id: 100,
        holdId: 10,
        status: 'HELD',
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        id: 101,
        holdId: 10,
        status: 'HELD',
      });
    });

    it('throws when the hold does not exist for the authenticated user', async () => {
      seatHoldFirstMock.mockResolvedValue(null);

      await expect(service.confirm(999, 7)).rejects.toThrow(NotFoundException);

      expect(seatHoldFirstMock).toHaveBeenCalledWith({
        id: 999,
        userId: 7,
      });

      expect(bookingCreateMock).not.toHaveBeenCalled();
    });

    it('does not allow one user to confirm another users hold', async () => {
      seatHoldFirstMock.mockResolvedValue(null);

      await expect(service.confirm(10, 8)).rejects.toThrow(
        new NotFoundException('Seat hold with id 10 not found'),
      );

      expect(seatHoldFirstMock).toHaveBeenCalledWith({
        id: 10,
        userId: 8,
      });

      expect(seatHoldWhereMock).not.toHaveBeenCalled();
      expect(bookingCreateMock).not.toHaveBeenCalled();
      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
    });

    it('rejects an expired hold', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2000-01-01T00:00:00.000Z',
      });

      await expect(service.confirm(10, 7)).rejects.toThrow(ConflictException);

      expect(bookingCreateMock).not.toHaveBeenCalled();
    });

    it('rejects a hold that is not active', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'COMPLETED',
        expiresAt: '2999-01-01T00:00:00.000Z',
      });

      await expect(service.confirm(10, 7)).rejects.toThrow(ConflictException);

      expect(bookingCreateMock).not.toHaveBeenCalled();
    });

    it('rejects a hold with no held seats', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2999-01-01T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([]);

      await expect(service.confirm(10, 7)).rejects.toThrow(ConflictException);

      expect(bookingCreateMock).not.toHaveBeenCalled();
    });

    it('rejects confirmation if another request already completed the hold', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2999-01-01T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          seatId: 1,
          holdId: 10,
          status: 'HELD',
        },
      ]);

      seatHoldUpdateMock.mockResolvedValue(null);

      await expect(service.confirm(10, 7)).rejects.toThrow(ConflictException);

      expect(seatHoldWhereMock).toHaveBeenCalledWith({
        id: 10,
        userId: 7,
        status: 'ACTIVE',
      });

      expect(bookingCreateMock).not.toHaveBeenCalled();
    });

    it('rejects confirmation if a held seat cannot be transitioned to booked', async () => {
      seatHoldFirstMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'ACTIVE',
        expiresAt: '2999-01-01T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          seatId: 1,
          holdId: 10,
          status: 'HELD',
        },
      ]);

      seatHoldUpdateMock.mockResolvedValue({
        id: 10,
        showtimeId: 20,
        userId: 7,
        status: 'COMPLETED',
      });

      bookingCreateMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeSeatUpdateMock.mockResolvedValue(null);

      await expect(service.confirm(10, 7)).rejects.toThrow(ConflictException);

      expect(bookingCreateMock).toHaveBeenCalledWith({
        showtimeId: 20,
        holdId: 10,
        userId: 7,
      });
    });
  });

  describe('findOne', () => {
    it('returns an owned booking with its booked seat ids', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 101,
          showtimeId: 20,
          seatId: 2,
          status: 'BOOKED',
          holdId: null,
          bookingId: 50,
        },
        {
          id: 100,
          showtimeId: 20,
          seatId: 1,
          status: 'BOOKED',
          holdId: null,
          bookingId: 50,
        },
      ]);

      await expect(service.findOne(50, 7)).resolves.toEqual({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        seatIds: [1, 2],
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      expect(bookingFirstMock).toHaveBeenCalledWith({
        id: 50,
        userId: 7,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        bookingId: 50,
        status: 'BOOKED',
      });

      expect(showtimeSeatAllMock).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when booking does not exist for the authenticated user', async () => {
      bookingFirstMock.mockResolvedValue(null);

      await expect(service.findOne(999, 7)).rejects.toThrow(
        new NotFoundException('Booking with id 999 not found'),
      );

      expect(bookingFirstMock).toHaveBeenCalledWith({
        id: 999,
        userId: 7,
      });

      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
    });

    it('does not allow one user to retrieve another users booking', async () => {
      bookingFirstMock.mockResolvedValue(null);

      await expect(service.findOne(50, 8)).rejects.toThrow(
        new NotFoundException('Booking with id 50 not found'),
      );

      expect(bookingFirstMock).toHaveBeenCalledWith({
        id: 50,
        userId: 8,
      });

      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
    });

    it('returns an empty seat list when the owned booking has no booked seat rows', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeSeatAllMock.mockResolvedValue([]);

      await expect(service.findOne(50, 7)).resolves.toEqual({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        seatIds: [],
        createdAt: '2026-09-06T00:00:00.000Z',
      });
    });
  });

  describe('findMine', () => {
    it('returns the authenticated users bookings newest first with sorted seat ids', async () => {
      bookingAllMock.mockResolvedValue([
        {
          id: 50,
          showtimeId: 20,
          holdId: 10,
          userId: 7,
          createdAt: '2026-09-06T00:00:00.000Z',
        },
        {
          id: 52,
          showtimeId: 21,
          holdId: 12,
          userId: 7,
          createdAt: '2026-09-07T00:00:00.000Z',
        },
      ]);

      showtimeSeatAllMock
        .mockResolvedValueOnce([
          {
            id: 101,
            seatId: 2,
            bookingId: 50,
            status: 'BOOKED',
          },
          {
            id: 100,
            seatId: 1,
            bookingId: 50,
            status: 'BOOKED',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 103,
            seatId: 4,
            bookingId: 52,
            status: 'BOOKED',
          },
          {
            id: 102,
            seatId: 3,
            bookingId: 52,
            status: 'BOOKED',
          },
        ]);

      await expect(service.findMine(7)).resolves.toEqual([
        {
          id: 52,
          showtimeId: 21,
          holdId: 12,
          seatIds: [3, 4],
          createdAt: '2026-09-07T00:00:00.000Z',
        },
        {
          id: 50,
          showtimeId: 20,
          holdId: 10,
          seatIds: [1, 2],
          createdAt: '2026-09-06T00:00:00.000Z',
        },
      ]);

      expect(bookingWhereMock).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        bookingId: 50,
        status: 'BOOKED',
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        bookingId: 52,
        status: 'BOOKED',
      });
    });

    it('returns an empty list when the authenticated user has no bookings', async () => {
      bookingAllMock.mockResolvedValue([]);

      await expect(service.findMine(7)).resolves.toEqual([]);

      expect(bookingWhereMock).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
    });
  });
});

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

  const showtimeFirstMock = jest.fn();
  const screenFirstMock = jest.fn();
  const venueFirstMock = jest.fn();

  const seatAllMock = jest.fn();

  const seatWhereMock = jest.fn(() => ({
    all: seatAllMock,
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
        Showtime: {
          first: showtimeFirstMock,
        },
        Screen: {
          first: screenFirstMock,
        },
        Venue: {
          first: venueFirstMock,
        },
        ShowtimeSeat: {
          where: showtimeSeatWhereMock,
        },
        Seat: {
          where: seatWhereMock,
        },
      },
    },
    transaction: transactionMock,
  };

  const emitSeatStatusChangedMock = jest.fn();

  const seatRealtimeGatewayMock = {
    emitSeatStatusChanged: emitSeatStatusChangedMock,
  };

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new BookingsService(
      databaseMock as never,
      seatRealtimeGatewayMock as never,
    );
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
    it('returns an enriched owned booking', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09 19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue({
        id: 30,
        name: 'Screen 2',
        venueId: 40,
      });

      venueFirstMock.mockResolvedValue({
        id: 40,
        name: 'Inox Hyderabad',
        city: 'Hyderabad',
        address: 'Banjara Hills',
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 101,
          showtimeId: 20,
          seatId: 2,
          status: 'BOOKED',
          bookingId: 50,
        },
        {
          id: 100,
          showtimeId: 20,
          seatId: 1,
          status: 'BOOKED',
          bookingId: 50,
        },
      ]);

      seatAllMock.mockResolvedValue([
        {
          id: 1,
          row: 'A',
          number: 6,
          type: 'STANDARD',
          screenId: 30,
        },
        {
          id: 2,
          row: 'A',
          number: 3,
          type: 'PREMIUM',
          screenId: 30,
        },
      ]);

      await expect(service.findOne(50, 7)).resolves.toEqual({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        seatIds: [1, 2],
        createdAt: '2026-09-06T00:00:00.000Z',
        showtime: {
          title: 'Avatar',
          startsAt: '2026-09-09T19:30:00+05:30',
          screen: {
            id: 30,
            name: 'Screen 2',
          },
          venue: {
            id: 40,
            name: 'Inox Hyderabad',
            city: 'Hyderabad',
            address: 'Banjara Hills',
          },
        },
        seats: [
          {
            seatId: 2,
            row: 'A',
            number: 3,
            type: 'PREMIUM',
          },
          {
            seatId: 1,
            row: 'A',
            number: 6,
            type: 'STANDARD',
          },
        ],
      });

      expect(bookingFirstMock).toHaveBeenCalledWith({
        id: 50,
        userId: 7,
      });

      expect(showtimeFirstMock).toHaveBeenCalledWith({
        id: 20,
      });

      expect(screenFirstMock).toHaveBeenCalledWith({
        id: 30,
      });

      expect(venueFirstMock).toHaveBeenCalledWith({
        id: 40,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        bookingId: 50,
        status: 'BOOKED',
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        screenId: 30,
      });
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

      expect(showtimeFirstMock).not.toHaveBeenCalled();
      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
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

      expect(showtimeFirstMock).not.toHaveBeenCalled();
      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
    });

    it('returns an empty seat list when the booking has no booked seat rows', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09T19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue({
        id: 30,
        name: 'Screen 2',
        venueId: 40,
      });

      venueFirstMock.mockResolvedValue({
        id: 40,
        name: 'Inox Hyderabad',
        city: 'Hyderabad',
        address: null,
      });

      showtimeSeatAllMock.mockResolvedValue([]);
      seatAllMock.mockResolvedValue([]);

      await expect(service.findOne(50, 7)).resolves.toEqual({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        seatIds: [],
        createdAt: '2026-09-06T00:00:00.000Z',
        showtime: {
          title: 'Avatar',
          startsAt: '2026-09-09T19:30:00+05:30',
          screen: {
            id: 30,
            name: 'Screen 2',
          },
          venue: {
            id: 40,
            name: 'Inox Hyderabad',
            city: 'Hyderabad',
            address: null,
          },
        },
        seats: [],
      });
    });

    it('throws when the booking showtime cannot be found', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue(null);

      await expect(service.findOne(50, 7)).rejects.toThrow(
        new NotFoundException('Showtime with id 20 not found'),
      );

      expect(screenFirstMock).not.toHaveBeenCalled();
    });

    it('throws when the booking screen cannot be found', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09T19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue(null);

      await expect(service.findOne(50, 7)).rejects.toThrow(
        new NotFoundException('Screen with id 30 not found'),
      );

      expect(venueFirstMock).not.toHaveBeenCalled();
    });

    it('throws when the booking venue cannot be found', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09T19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue({
        id: 30,
        name: 'Screen 2',
        venueId: 40,
      });

      venueFirstMock.mockResolvedValue(null);

      await expect(service.findOne(50, 7)).rejects.toThrow(
        new NotFoundException('Venue with id 40 not found'),
      );
    });

    it('throws when booked seat metadata cannot be found', async () => {
      bookingFirstMock.mockResolvedValue({
        id: 50,
        showtimeId: 20,
        holdId: 10,
        userId: 7,
        createdAt: '2026-09-06T00:00:00.000Z',
      });

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09T19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue({
        id: 30,
        name: 'Screen 2',
        venueId: 40,
      });

      venueFirstMock.mockResolvedValue({
        id: 40,
        name: 'Inox Hyderabad',
        city: 'Hyderabad',
        address: null,
      });

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 100,
          showtimeId: 20,
          seatId: 99,
          status: 'BOOKED',
          bookingId: 50,
        },
      ]);

      seatAllMock.mockResolvedValue([]);

      await expect(service.findOne(50, 7)).rejects.toThrow(
        new NotFoundException('Seat with id 99 not found'),
      );
    });
  });

  describe('findMine', () => {
    it('returns enriched bookings newest first', async () => {
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

      showtimeFirstMock
        .mockResolvedValueOnce({
          id: 20,
          title: 'Avatar',
          startsAt: '2026-09-09 19:30:00+05:30',
          screenId: 30,
        })
        .mockResolvedValueOnce({
          id: 21,
          title: 'Interstellar',
          startsAt: '2026-09-10 20:00:00+05:30',
          screenId: 31,
        });

      screenFirstMock
        .mockResolvedValueOnce({
          id: 30,
          name: 'Screen 2',
          venueId: 40,
        })
        .mockResolvedValueOnce({
          id: 31,
          name: 'Screen 1',
          venueId: 41,
        });

      venueFirstMock
        .mockResolvedValueOnce({
          id: 40,
          name: 'Inox Hyderabad',
          city: 'Hyderabad',
          address: 'Banjara Hills',
        })
        .mockResolvedValueOnce({
          id: 41,
          name: 'PVR Hyderabad',
          city: 'Hyderabad',
          address: null,
        });

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

      seatAllMock
        .mockResolvedValueOnce([
          {
            id: 1,
            row: 'A',
            number: 6,
            type: 'STANDARD',
            screenId: 30,
          },
          {
            id: 2,
            row: 'A',
            number: 3,
            type: 'STANDARD',
            screenId: 30,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 3,
            row: 'B',
            number: 2,
            type: 'STANDARD',
            screenId: 31,
          },
          {
            id: 4,
            row: 'B',
            number: 1,
            type: 'PREMIUM',
            screenId: 31,
          },
        ]);

      await expect(service.findMine(7)).resolves.toEqual([
        {
          id: 52,
          showtimeId: 21,
          holdId: 12,
          seatIds: [3, 4],
          createdAt: '2026-09-07T00:00:00.000Z',
          showtime: {
            title: 'Interstellar',
            startsAt: '2026-09-10T20:00:00+05:30',
            screen: {
              id: 31,
              name: 'Screen 1',
            },
            venue: {
              id: 41,
              name: 'PVR Hyderabad',
              city: 'Hyderabad',
              address: null,
            },
          },
          seats: [
            {
              seatId: 4,
              row: 'B',
              number: 1,
              type: 'PREMIUM',
            },
            {
              seatId: 3,
              row: 'B',
              number: 2,
              type: 'STANDARD',
            },
          ],
        },
        {
          id: 50,
          showtimeId: 20,
          holdId: 10,
          seatIds: [1, 2],
          createdAt: '2026-09-06T00:00:00.000Z',
          showtime: {
            title: 'Avatar',
            startsAt: '2026-09-09T19:30:00+05:30',
            screen: {
              id: 30,
              name: 'Screen 2',
            },
            venue: {
              id: 40,
              name: 'Inox Hyderabad',
              city: 'Hyderabad',
              address: 'Banjara Hills',
            },
          },
          seats: [
            {
              seatId: 2,
              row: 'A',
              number: 3,
              type: 'STANDARD',
            },
            {
              seatId: 1,
              row: 'A',
              number: 6,
              type: 'STANDARD',
            },
          ],
        },
      ]);

      expect(bookingWhereMock).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(showtimeFirstMock).toHaveBeenCalledTimes(2);
      expect(screenFirstMock).toHaveBeenCalledTimes(2);
      expect(venueFirstMock).toHaveBeenCalledTimes(2);
      expect(showtimeSeatAllMock).toHaveBeenCalledTimes(2);
      expect(seatAllMock).toHaveBeenCalledTimes(2);
    });

    it('uses booking id descending as a tie breaker', async () => {
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
          showtimeId: 20,
          holdId: 12,
          userId: 7,
          createdAt: '2026-09-06T00:00:00.000Z',
        },
      ]);

      showtimeFirstMock.mockResolvedValue({
        id: 20,
        title: 'Avatar',
        startsAt: '2026-09-09T19:30:00+05:30',
        screenId: 30,
      });

      screenFirstMock.mockResolvedValue({
        id: 30,
        name: 'Screen 2',
        venueId: 40,
      });

      venueFirstMock.mockResolvedValue({
        id: 40,
        name: 'Inox Hyderabad',
        city: 'Hyderabad',
        address: null,
      });

      showtimeSeatAllMock.mockResolvedValue([]);
      seatAllMock.mockResolvedValue([]);

      const result = await service.findMine(7);

      expect(result.map((booking) => booking.id)).toEqual([52, 50]);
    });

    it('returns an empty list when the authenticated user has no bookings', async () => {
      bookingAllMock.mockResolvedValue([]);

      await expect(service.findMine(7)).resolves.toEqual([]);

      expect(bookingWhereMock).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(showtimeFirstMock).not.toHaveBeenCalled();
      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
      expect(seatWhereMock).not.toHaveBeenCalled();
    });
  });
});

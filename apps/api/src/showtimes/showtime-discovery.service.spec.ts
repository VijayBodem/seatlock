import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { HoldsService } from '../holds/holds.service.js';
import { ShowtimeDiscoveryService } from './showtime-discovery.service.js';

describe('ShowtimeDiscoveryService', () => {
  let service: ShowtimeDiscoveryService;

  const showtimeAllMock = jest.fn();
  const showtimeFirstMock = jest.fn();

  const screenAllMock = jest.fn();
  const screenFirstMock = jest.fn();

  const venueAllMock = jest.fn();
  const venueFirstMock = jest.fn();

  const showtimeSeatAllMock = jest.fn();
  const showtimeSeatWhereAllMock = jest.fn();

  const seatWhereAllMock = jest.fn();

  const showtimeSeatWhereMock = jest.fn(() => ({
    all: showtimeSeatWhereAllMock,
  }));

  const seatWhereMock = jest.fn(() => ({
    all: seatWhereAllMock,
  }));

  const databaseMock = {
    orm: {
      public: {
        Showtime: {
          all: showtimeAllMock,
          first: showtimeFirstMock,
        },
        Screen: {
          all: screenAllMock,
          first: screenFirstMock,
        },
        Venue: {
          all: venueAllMock,
          first: venueFirstMock,
        },
        ShowtimeSeat: {
          all: showtimeSeatAllMock,
          where: showtimeSeatWhereMock,
        },
        Seat: {
          where: seatWhereMock,
        },
      },
    },
  };

  const expireStaleHoldsMock = jest.fn();

  const holdsServiceMock = {
    expireStaleHolds: expireStaleHoldsMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimeDiscoveryService,
        {
          provide: DATABASE,
          useValue: databaseMock,
        },
        {
          provide: HoldsService,
          useValue: holdsServiceMock,
        },
      ],
    }).compile();

    service = module.get<ShowtimeDiscoveryService>(ShowtimeDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-10T12:00:00+05:30'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });
    it('should exclude showtimes that have already started', async () => {
      showtimeAllMock.mockResolvedValue([
        {
          id: 99,
          title: 'Past Show',
          startsAt: '2026-09-10 11:59:59+05:30',
          screenId: 10,
        },
        {
          id: 100,
          title: 'Starting Now',
          startsAt: '2026-09-10 12:00:00+05:30',
          screenId: 10,
        },
        {
          id: 101,
          title: 'Future Show',
          startsAt: '2026-09-10 12:00:01+05:30',
          screenId: 10,
        },
      ]);

      screenAllMock.mockResolvedValue([
        {
          id: 10,
          name: 'Screen 1',
          venueId: 1,
        },
      ]);

      venueAllMock.mockResolvedValue([
        {
          id: 1,
          name: 'SeatLock Cinemas',
          city: 'Hyderabad',
          address: 'Madhapur',
        },
      ]);

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 1,
          showtimeId: 99,
          seatId: 201,
          status: 'AVAILABLE',
        },
        {
          id: 2,
          showtimeId: 100,
          seatId: 202,
          status: 'AVAILABLE',
        },
        {
          id: 3,
          showtimeId: 101,
          seatId: 203,
          status: 'AVAILABLE',
        },
      ]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findAll()).resolves.toEqual([
        {
          id: 101,
          title: 'Future Show',
          startsAt: '2026-09-10T12:00:01+05:30',
          availableSeats: 1,
          screen: {
            id: 10,
            name: 'Screen 1',
          },
          venue: {
            id: 1,
            name: 'SeatLock Cinemas',
            city: 'Hyderabad',
            address: 'Madhapur',
          },
        },
      ]);

      expect(expireStaleHoldsMock).toHaveBeenCalledTimes(1);
      expect(expireStaleHoldsMock).toHaveBeenCalledWith(101);
    });
    it('should return customer-friendly showtimes ordered by start time', async () => {
      showtimeAllMock.mockResolvedValue([
        {
          id: 101,
          title: 'Inception',
          startsAt: '2026-09-10 22:30:00+05:30',
          screenId: 11,
        },
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-10 19:30:00+05:30',
          screenId: 10,
        },
      ]);

      screenAllMock.mockResolvedValue([
        {
          id: 10,
          name: 'Screen 1',
          venueId: 1,
        },
        {
          id: 11,
          name: 'Screen 2',
          venueId: 1,
        },
      ]);

      venueAllMock.mockResolvedValue([
        {
          id: 1,
          name: 'SeatLock Cinemas',
          city: 'Hyderabad',
          address: 'Madhapur',
        },
      ]);

      showtimeSeatAllMock.mockResolvedValue([
        {
          id: 1,
          showtimeId: 100,
          seatId: 201,
          status: 'AVAILABLE',
        },
        {
          id: 2,
          showtimeId: 100,
          seatId: 202,
          status: 'HELD',
        },
        {
          id: 3,
          showtimeId: 100,
          seatId: 203,
          status: 'AVAILABLE',
        },
        {
          id: 4,
          showtimeId: 101,
          seatId: 204,
          status: 'BOOKED',
        },
      ]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findAll()).resolves.toEqual([
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-10T19:30:00+05:30',
          availableSeats: 2,
          screen: {
            id: 10,
            name: 'Screen 1',
          },
          venue: {
            id: 1,
            name: 'SeatLock Cinemas',
            city: 'Hyderabad',
            address: 'Madhapur',
          },
        },
        {
          id: 101,
          title: 'Inception',
          startsAt: '2026-09-10T22:30:00+05:30',
          availableSeats: 0,
          screen: {
            id: 11,
            name: 'Screen 2',
          },
          venue: {
            id: 1,
            name: 'SeatLock Cinemas',
            city: 'Hyderabad',
            address: 'Madhapur',
          },
        },
      ]);

      expect(expireStaleHoldsMock).toHaveBeenCalledTimes(2);
      expect(expireStaleHoldsMock).toHaveBeenNthCalledWith(1, 101);
      expect(expireStaleHoldsMock).toHaveBeenNthCalledWith(2, 100);

      expect(showtimeSeatAllMock).toHaveBeenCalledTimes(1);
    });

    it('should preserve timestamps that are already ISO-8601', async () => {
      showtimeAllMock.mockResolvedValue([
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-10T19:30:00+05:30',
          screenId: 10,
        },
      ]);

      screenAllMock.mockResolvedValue([
        {
          id: 10,
          name: 'Screen 1',
          venueId: 1,
        },
      ]);

      venueAllMock.mockResolvedValue([
        {
          id: 1,
          name: 'SeatLock Cinemas',
          city: 'Hyderabad',
          address: null,
        },
      ]);

      showtimeSeatAllMock.mockResolvedValue([]);
      expireStaleHoldsMock.mockResolvedValue(undefined);

      const result = await service.findAll();

      expect(result[0]?.startsAt).toBe('2026-09-10T19:30:00+05:30');
    });

    it('should return an empty array when there are no showtimes', async () => {
      showtimeAllMock.mockResolvedValue([]);
      screenAllMock.mockResolvedValue([]);
      venueAllMock.mockResolvedValue([]);
      showtimeSeatAllMock.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);

      expect(expireStaleHoldsMock).not.toHaveBeenCalled();
    });

    it('should throw when a showtime references a missing screen', async () => {
      showtimeAllMock.mockResolvedValue([
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-10 19:30:00+05:30',
          screenId: 999,
        },
      ]);

      screenAllMock.mockResolvedValue([]);
      venueAllMock.mockResolvedValue([]);
      showtimeSeatAllMock.mockResolvedValue([]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findAll()).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );
    });

    it('should throw when a screen references a missing venue', async () => {
      showtimeAllMock.mockResolvedValue([
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-10 19:30:00+05:30',
          screenId: 10,
        },
      ]);

      screenAllMock.mockResolvedValue([
        {
          id: 10,
          name: 'Screen 1',
          venueId: 999,
        },
      ]);

      venueAllMock.mockResolvedValue([]);
      showtimeSeatAllMock.mockResolvedValue([]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findAll()).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );
    });
  });

  describe('findOne', () => {
    it('should return customer-friendly showtime details with an ISO timestamp', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 10,
      });

      screenFirstMock.mockResolvedValue({
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      });

      venueFirstMock.mockResolvedValue({
        id: 1,
        name: 'SeatLock Cinemas',
        city: 'Hyderabad',
        address: null,
      });

      showtimeSeatWhereAllMock.mockResolvedValue([
        {
          id: 1,
          showtimeId: 100,
          seatId: 201,
          status: 'AVAILABLE',
        },
        {
          id: 2,
          showtimeId: 100,
          seatId: 202,
          status: 'HELD',
        },
        {
          id: 3,
          showtimeId: 100,
          seatId: 203,
          status: 'AVAILABLE',
        },
      ]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findOne(100)).resolves.toEqual({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10T19:30:00+05:30',
        availableSeats: 2,
        screen: {
          id: 10,
          name: 'Screen 1',
        },
        venue: {
          id: 1,
          name: 'SeatLock Cinemas',
          city: 'Hyderabad',
          address: null,
        },
      });

      expect(expireStaleHoldsMock).toHaveBeenCalledWith(100);

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        showtimeId: 100,
      });
    });

    it('should throw when the showtime does not exist', async () => {
      showtimeFirstMock.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );

      expect(expireStaleHoldsMock).not.toHaveBeenCalled();
      expect(screenFirstMock).not.toHaveBeenCalled();
    });

    it('should throw when the screen does not exist', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 999,
      });

      screenFirstMock.mockResolvedValue(null);
      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findOne(100)).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );

      expect(venueFirstMock).not.toHaveBeenCalled();
    });

    it('should throw when the venue does not exist', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 10,
      });

      screenFirstMock.mockResolvedValue({
        id: 10,
        name: 'Screen 1',
        venueId: 999,
      });

      venueFirstMock.mockResolvedValue(null);
      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findOne(100)).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );
    });
  });

  describe('findSeats', () => {
    it('should return customer-friendly seats ordered by row and number', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 10,
      });

      showtimeSeatWhereAllMock.mockResolvedValue([
        {
          id: 3,
          showtimeId: 100,
          seatId: 203,
          status: 'BOOKED',
        },
        {
          id: 1,
          showtimeId: 100,
          seatId: 201,
          status: 'AVAILABLE',
        },
        {
          id: 2,
          showtimeId: 100,
          seatId: 202,
          status: 'HELD',
        },
      ]);

      seatWhereAllMock.mockResolvedValue([
        {
          id: 202,
          row: 'A',
          number: 2,
          type: 'PREMIUM',
          screenId: 10,
        },
        {
          id: 203,
          row: 'B',
          number: 1,
          type: 'ACCESSIBLE',
          screenId: 10,
        },
        {
          id: 201,
          row: 'A',
          number: 1,
          type: 'STANDARD',
          screenId: 10,
        },
      ]);

      expireStaleHoldsMock.mockResolvedValue(undefined);

      await expect(service.findSeats(100)).resolves.toEqual([
        {
          id: 1,
          seatId: 201,
          row: 'A',
          number: 1,
          type: 'STANDARD',
          status: 'AVAILABLE',
        },
        {
          id: 2,
          seatId: 202,
          row: 'A',
          number: 2,
          type: 'PREMIUM',
          status: 'HELD',
        },
        {
          id: 3,
          seatId: 203,
          row: 'B',
          number: 1,
          type: 'ACCESSIBLE',
          status: 'BOOKED',
        },
      ]);

      expect(expireStaleHoldsMock).toHaveBeenCalledWith(100);

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        showtimeId: 100,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        screenId: 10,
      });
    });

    it('should expire stale holds before reading inventory', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 10,
      });

      expireStaleHoldsMock.mockResolvedValue(undefined);
      showtimeSeatWhereAllMock.mockResolvedValue([]);
      seatWhereAllMock.mockResolvedValue([]);

      await service.findSeats(100);

      const cleanupOrder = expireStaleHoldsMock.mock.invocationCallOrder[0];
      const inventoryReadOrder =
        showtimeSeatWhereMock.mock.invocationCallOrder[0];

      expect(cleanupOrder).toBeLessThan(inventoryReadOrder);
    });

    it('should throw when the showtime does not exist', async () => {
      showtimeFirstMock.mockResolvedValue(null);

      await expect(service.findSeats(999)).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );

      expect(expireStaleHoldsMock).not.toHaveBeenCalled();
      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
      expect(seatWhereMock).not.toHaveBeenCalled();
    });

    it('should throw when inventory references a missing physical seat', async () => {
      showtimeFirstMock.mockResolvedValue({
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-10 19:30:00+05:30',
        screenId: 10,
      });

      expireStaleHoldsMock.mockResolvedValue(undefined);

      showtimeSeatWhereAllMock.mockResolvedValue([
        {
          id: 1,
          showtimeId: 100,
          seatId: 999,
          status: 'AVAILABLE',
        },
      ]);

      seatWhereAllMock.mockResolvedValue([]);

      await expect(service.findSeats(100)).rejects.toThrow(
        new NotFoundException('Seat with id 999 not found'),
      );
    });
  });
});

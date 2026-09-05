import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { ShowtimesService } from './showtimes.service.js';

describe('ShowtimesService', () => {
  let service: ShowtimesService;

  const showtimeAllMock = jest.fn();

  const showtimeUpdateMock = jest.fn();
  const showtimeDeleteMock = jest.fn();

  const showtimeWhereMock = jest.fn(() => ({
    all: showtimeAllMock,
    update: showtimeUpdateMock,
    delete: showtimeDeleteMock,
  }));

  const seatAllMock = jest.fn();

  const seatWhereMock = jest.fn(() => ({
    all: seatAllMock,
  }));

  const showtimeSeatAllMock = jest.fn();

  const showtimeSeatWhereMock = jest.fn(() => ({
    all: showtimeSeatAllMock,
  }));

  const showtimeSeatCreateMock = jest.fn();

  const screenModelMock = {
    first: jest.fn(),
  };

  const showtimeModelMock = {
    create: jest.fn(),
    first: jest.fn(),
    where: showtimeWhereMock,
  };

  const seatModelMock = {
    where: seatWhereMock,
  };

  const showtimeSeatModelMock = {
    create: showtimeSeatCreateMock,
    where: showtimeSeatWhereMock,
  };
  const transactionClientMock = {
    orm: {
      public: {
        Showtime: showtimeModelMock,
        Seat: seatModelMock,
        ShowtimeSeat: showtimeSeatModelMock,
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
        Screen: screenModelMock,
        Showtime: showtimeModelMock,
        ShowtimeSeat: showtimeSeatModelMock,
      },
    },
    transaction: transactionMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimesService,
        {
          provide: DATABASE,
          useValue: databaseMock,
        },
      ],
    }).compile();

    service = module.get<ShowtimesService>(ShowtimesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a showtime and materialize seat inventory', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const seats = [
        {
          id: 201,
          row: 'A',
          number: 1,
          type: 'STANDARD',
          screenId: 10,
        },
        {
          id: 202,
          row: 'A',
          number: 2,
          type: 'PREMIUM',
          screenId: 10,
        },
      ];

      const dto = {
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
      };

      const createdShowtime = {
        id: 100,
        title: dto.title,
        startsAt: dto.startsAt,
        screenId: 10,
      };

      screenModelMock.first.mockResolvedValue(screen);
      showtimeModelMock.create.mockResolvedValue(createdShowtime);
      seatAllMock.mockResolvedValue(seats);
      showtimeSeatCreateMock.mockResolvedValue({});

      await expect(service.create(10, dto)).resolves.toEqual(createdShowtime);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(transactionMock).toHaveBeenCalledTimes(1);

      expect(showtimeModelMock.create).toHaveBeenCalledWith({
        title: dto.title,
        startsAt: dto.startsAt,
        screenId: 10,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(seatAllMock).toHaveBeenCalledTimes(1);

      expect(showtimeSeatCreateMock).toHaveBeenCalledTimes(2);

      expect(showtimeSeatCreateMock).toHaveBeenNthCalledWith(1, {
        showtimeId: 100,
        seatId: 201,
        status: 'AVAILABLE',
      });

      expect(showtimeSeatCreateMock).toHaveBeenNthCalledWith(2, {
        showtimeId: 100,
        seatId: 202,
        status: 'AVAILABLE',
      });
    });

    it('should create a showtime when the screen has no seats', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const dto = {
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
      };

      const createdShowtime = {
        id: 100,
        title: dto.title,
        startsAt: dto.startsAt,
        screenId: 10,
      };

      screenModelMock.first.mockResolvedValue(screen);
      showtimeModelMock.create.mockResolvedValue(createdShowtime);
      seatAllMock.mockResolvedValue([]);

      await expect(service.create(10, dto)).resolves.toEqual(createdShowtime);

      expect(transactionMock).toHaveBeenCalledTimes(1);

      expect(showtimeModelMock.create).toHaveBeenCalledWith({
        title: dto.title,
        startsAt: dto.startsAt,
        screenId: 10,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(showtimeSeatCreateMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(
        service.create(999, {
          title: 'Interstellar',
          startsAt: '2026-09-05T19:30:00+05:30',
        }),
      ).rejects.toThrow(new NotFoundException('Screen with id 999 not found'));

      expect(transactionMock).not.toHaveBeenCalled();
      expect(showtimeModelMock.create).not.toHaveBeenCalled();
      expect(showtimeSeatCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('findAllByScreen', () => {
    it('should return all showtimes for an existing screen', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const showtimes = [
        {
          id: 100,
          title: 'Interstellar',
          startsAt: '2026-09-05T19:30:00+05:30',
          screenId: 10,
        },
        {
          id: 101,
          title: 'Inception',
          startsAt: '2026-09-05T22:30:00+05:30',
          screenId: 10,
        },
      ];

      screenModelMock.first.mockResolvedValue(screen);
      showtimeAllMock.mockResolvedValue(showtimes);

      await expect(service.findAllByScreen(10)).resolves.toEqual(showtimes);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(showtimeWhereMock).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(showtimeAllMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(service.findAllByScreen(999)).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );

      expect(showtimeWhereMock).not.toHaveBeenCalled();
      expect(showtimeAllMock).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a showtime when it exists', async () => {
      const showtime = {
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
        screenId: 10,
      };

      showtimeModelMock.first.mockResolvedValue(showtime);

      await expect(service.findOne(100)).resolves.toEqual(showtime);

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });
    });

    it('should throw NotFoundException when showtime does not exist', async () => {
      showtimeModelMock.first.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );
    });
  });

  describe('findSeats', () => {
    it('should return seat inventory for an existing showtime', async () => {
      const showtime = {
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
        screenId: 10,
      };

      const seats = [
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
          status: 'AVAILABLE',
        },
      ];

      showtimeModelMock.first.mockResolvedValue(showtime);
      showtimeSeatAllMock.mockResolvedValue(seats);

      await expect(service.findSeats(100)).resolves.toEqual(seats);

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });

      expect(showtimeSeatWhereMock).toHaveBeenCalledWith({
        showtimeId: 100,
      });

      expect(showtimeSeatAllMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when showtime does not exist', async () => {
      showtimeModelMock.first.mockResolvedValue(null);

      await expect(service.findSeats(999)).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );

      expect(showtimeSeatWhereMock).not.toHaveBeenCalled();
      expect(showtimeSeatAllMock).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing showtime', async () => {
      const existingShowtime = {
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
        screenId: 10,
      };

      const dto = {
        title: 'Interstellar IMAX',
        startsAt: '2026-09-05T20:00:00+05:30',
      };

      const updatedShowtime = {
        ...existingShowtime,
        ...dto,
      };

      showtimeModelMock.first.mockResolvedValue(existingShowtime);
      showtimeUpdateMock.mockResolvedValue(updatedShowtime);

      await expect(service.update(100, dto)).resolves.toEqual(updatedShowtime);

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });

      expect(showtimeWhereMock).toHaveBeenCalledWith({
        id: 100,
      });

      expect(showtimeUpdateMock).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException when updating a missing showtime', async () => {
      showtimeModelMock.first.mockResolvedValue(null);

      await expect(
        service.update(999, {
          title: 'Updated title',
        }),
      ).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );

      expect(showtimeUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing showtime', async () => {
      const existingShowtime = {
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
        screenId: 10,
      };

      showtimeModelMock.first.mockResolvedValue(existingShowtime);
      showtimeDeleteMock.mockResolvedValue(existingShowtime);

      await expect(service.remove(100)).resolves.toEqual(existingShowtime);

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });

      expect(showtimeWhereMock).toHaveBeenCalledWith({
        id: 100,
      });

      expect(showtimeDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when deleting a missing showtime', async () => {
      showtimeModelMock.first.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Showtime with id 999 not found'),
      );

      expect(showtimeDeleteMock).not.toHaveBeenCalled();
    });
  });
});

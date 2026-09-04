import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { ShowtimesService } from './showtimes.service.js';

describe('ShowtimesService', () => {
  let service: ShowtimesService;

  const showtimeAllMock = jest.fn();

  const showtimeWhereMock = jest.fn(() => ({
    all: showtimeAllMock,
  }));

  const screenModelMock = {
    first: jest.fn(),
  };

  const showtimeModelMock = {
    create: jest.fn(),
    first: jest.fn(),
    where: showtimeWhereMock,
  };

  const databaseMock = {
    orm: {
      public: {
        Screen: screenModelMock,
        Showtime: showtimeModelMock,
      },
    },
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
    it('should create a showtime for an existing screen', async () => {
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

      await expect(service.create(10, dto)).resolves.toEqual(createdShowtime);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(showtimeModelMock.create).toHaveBeenCalledWith({
        title: dto.title,
        startsAt: dto.startsAt,
        screenId: 10,
      });
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(
        service.create(999, {
          title: 'Interstellar',
          startsAt: '2026-09-05T19:30:00+05:30',
        }),
      ).rejects.toThrow(new NotFoundException('Screen with id 999 not found'));

      expect(showtimeModelMock.create).not.toHaveBeenCalled();
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
});

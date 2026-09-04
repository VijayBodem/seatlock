import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { SeatType } from './dto/create-seat.dto.js';
import { SeatsService } from './seats.service.js';

describe('SeatsService', () => {
  let service: SeatsService;

  const seatAllMock = jest.fn();
  const seatUpdateMock = jest.fn();
  const seatDeleteMock = jest.fn();

  const seatWhereMock = jest.fn(() => ({
    all: seatAllMock,
    update: seatUpdateMock,
    delete: seatDeleteMock,
  }));

  const screenModelMock = {
    first: jest.fn(),
  };

  const seatModelMock = {
    create: jest.fn(),
    first: jest.fn(),
    where: seatWhereMock,
  };

  const databaseMock = {
    orm: {
      public: {
        Screen: screenModelMock,
        Seat: seatModelMock,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatsService,
        {
          provide: DATABASE,
          useValue: databaseMock,
        },
      ],
    }).compile();

    service = module.get<SeatsService>(SeatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a seat for an existing screen', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const dto = {
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
      };

      const createdSeat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      screenModelMock.first.mockResolvedValue(screen);
      seatModelMock.first.mockResolvedValue(null);
      seatModelMock.create.mockResolvedValue(createdSeat);

      await expect(service.create(10, dto)).resolves.toEqual(createdSeat);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(seatModelMock.create).toHaveBeenCalledWith({
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      });
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(
        service.create(999, {
          row: 'A',
          number: 1,
          type: SeatType.STANDARD,
        }),
      ).rejects.toThrow(new NotFoundException('Screen with id 999 not found'));

      expect(seatModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when seat already exists', async () => {
      const existingSeat = {
        id: 100,
        row: 'B',
        number: 5,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      screenModelMock.first.mockResolvedValue({
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      });

      seatModelMock.first.mockResolvedValue(existingSeat);

      await expect(
        service.create(10, {
          row: 'B',
          number: 5,
          type: SeatType.STANDARD,
        }),
      ).rejects.toThrow(
        new ConflictException('Seat B5 already exists for screen 10'),
      );

      expect(seatModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByScreen', () => {
    it('should return all seats for an existing screen', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const seats = [
        {
          id: 100,
          row: 'A',
          number: 1,
          type: SeatType.STANDARD,
          screenId: 10,
        },
        {
          id: 101,
          row: 'A',
          number: 2,
          type: SeatType.PREMIUM,
          screenId: 10,
        },
      ];

      screenModelMock.first.mockResolvedValue(screen);
      seatAllMock.mockResolvedValue(seats);

      await expect(service.findAllByScreen(10)).resolves.toEqual(seats);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(seatAllMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(service.findAllByScreen(999)).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );

      expect(seatWhereMock).not.toHaveBeenCalled();
      expect(seatAllMock).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a seat when it exists', async () => {
      const seat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      seatModelMock.first.mockResolvedValue(seat);

      await expect(service.findOne(100)).resolves.toEqual(seat);

      expect(seatModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });
    });

    it('should throw NotFoundException when seat does not exist', async () => {
      seatModelMock.first.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Seat with id 999 not found'),
      );
    });
  });

  describe('update', () => {
    it('should update an existing seat', async () => {
      const existingSeat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      const updatedSeat = {
        ...existingSeat,
        type: SeatType.PREMIUM,
      };

      seatModelMock.first
        .mockResolvedValueOnce(existingSeat)
        .mockResolvedValueOnce(existingSeat);

      seatUpdateMock.mockResolvedValue(updatedSeat);

      await expect(
        service.update(100, {
          type: SeatType.PREMIUM,
        }),
      ).resolves.toEqual(updatedSeat);

      expect(seatModelMock.first).toHaveBeenNthCalledWith(1, {
        id: 100,
      });

      expect(seatModelMock.first).toHaveBeenNthCalledWith(2, {
        screenId: 10,
        row: 'A',
        number: 1,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        id: 100,
      });

      expect(seatUpdateMock).toHaveBeenCalledWith({
        type: SeatType.PREMIUM,
      });
    });

    it('should throw NotFoundException when updating a missing seat', async () => {
      seatModelMock.first.mockResolvedValueOnce(null);

      await expect(
        service.update(999, {
          type: SeatType.PREMIUM,
        }),
      ).rejects.toThrow(new NotFoundException('Seat with id 999 not found'));

      expect(seatUpdateMock).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updated position already exists', async () => {
      const seat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      const conflictingSeat = {
        id: 101,
        row: 'A',
        number: 2,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      seatModelMock.first
        .mockResolvedValueOnce(seat)
        .mockResolvedValueOnce(conflictingSeat);

      await expect(
        service.update(100, {
          number: 2,
        }),
      ).rejects.toThrow(
        new ConflictException('Seat A2 already exists for screen 10'),
      );

      expect(seatUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing seat', async () => {
      const seat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      seatModelMock.first.mockResolvedValue(seat);
      seatDeleteMock.mockResolvedValue(seat);

      await expect(service.remove(100)).resolves.toEqual(seat);

      expect(seatModelMock.first).toHaveBeenCalledWith({
        id: 100,
      });

      expect(seatWhereMock).toHaveBeenCalledWith({
        id: 100,
      });

      expect(seatDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when deleting a missing seat', async () => {
      seatModelMock.first.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Seat with id 999 not found'),
      );

      expect(seatDeleteMock).not.toHaveBeenCalled();
    });
  });
});

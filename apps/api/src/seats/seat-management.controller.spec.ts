import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { SeatType } from './dto/create-seat.dto.js';
import { SeatManagementController } from './seat-management.controller.js';
import { SeatsService } from './seats.service.js';

describe('SeatManagementController', () => {
  let controller: SeatManagementController;

  const seatsServiceMock = {
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatManagementController],
      providers: [
        {
          provide: SeatsService,
          useValue: seatsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<SeatManagementController>(SeatManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a seat by id', async () => {
      const seat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      seatsServiceMock.findOne.mockResolvedValue(seat);

      await expect(controller.findOne(100)).resolves.toEqual(seat);

      expect(seatsServiceMock.findOne).toHaveBeenCalledWith(100);
      expect(seatsServiceMock.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update a seat', async () => {
      const dto = {
        type: SeatType.PREMIUM,
      };

      const updatedSeat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.PREMIUM,
        screenId: 10,
      };

      seatsServiceMock.update.mockResolvedValue(updatedSeat);

      await expect(controller.update(100, dto)).resolves.toEqual(updatedSeat);

      expect(seatsServiceMock.update).toHaveBeenCalledWith(100, dto);
      expect(seatsServiceMock.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete a seat', async () => {
      const seat = {
        id: 100,
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
        screenId: 10,
      };

      seatsServiceMock.remove.mockResolvedValue(seat);

      await expect(controller.remove(100)).resolves.toEqual(seat);

      expect(seatsServiceMock.remove).toHaveBeenCalledWith(100);
      expect(seatsServiceMock.remove).toHaveBeenCalledTimes(1);
    });
  });
});

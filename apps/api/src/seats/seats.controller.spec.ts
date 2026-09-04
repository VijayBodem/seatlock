import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { SeatType } from './dto/create-seat.dto.js';
import { SeatsController } from './seats.controller.js';
import { SeatsService } from './seats.service.js';

describe('SeatsController', () => {
  let controller: SeatsController;

  const seatsServiceMock = {
    create: jest.fn(),
    findAllByScreen: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatsController],
      providers: [
        {
          provide: SeatsService,
          useValue: seatsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<SeatsController>(SeatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a seat for a screen', async () => {
      const dto = {
        row: 'A',
        number: 1,
        type: SeatType.STANDARD,
      };

      const createdSeat = {
        id: 100,
        ...dto,
        screenId: 10,
      };

      seatsServiceMock.create.mockResolvedValue(createdSeat);

      await expect(controller.create(10, dto)).resolves.toEqual(createdSeat);

      expect(seatsServiceMock.create).toHaveBeenCalledWith(10, dto);
      expect(seatsServiceMock.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all seats for a screen', async () => {
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

      seatsServiceMock.findAllByScreen.mockResolvedValue(seats);

      await expect(controller.findAll(10)).resolves.toEqual(seats);

      expect(seatsServiceMock.findAllByScreen).toHaveBeenCalledWith(10);
      expect(seatsServiceMock.findAllByScreen).toHaveBeenCalledTimes(1);
    });
  });
});

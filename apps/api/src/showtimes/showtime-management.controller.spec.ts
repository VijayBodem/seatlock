import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ShowtimeManagementController } from './showtime-management.controller.js';
import { ShowtimesService } from './showtimes.service.js';

describe('ShowtimeManagementController', () => {
  let controller: ShowtimeManagementController;

  const showtimesServiceMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowtimeManagementController],
      providers: [
        {
          provide: ShowtimesService,
          useValue: showtimesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ShowtimeManagementController>(
      ShowtimeManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a showtime by id', async () => {
    const showtime = {
      id: 100,
      title: 'Interstellar',
      startsAt: '2026-09-05T19:30:00+05:30',
      screenId: 10,
    };

    showtimesServiceMock.findOne.mockResolvedValue(showtime);

    await expect(controller.findOne(100)).resolves.toEqual(showtime);

    expect(showtimesServiceMock.findOne).toHaveBeenCalledWith(100);
  });
});

import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ShowtimeManagementController } from './showtime-management.controller.js';
import { ShowtimesService } from './showtimes.service.js';

describe('ShowtimeManagementController', () => {
  let controller: ShowtimeManagementController;

  const showtimesServiceMock = {
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  it('should update a showtime', async () => {
    const dto = {
      title: 'Interstellar IMAX',
      startsAt: '2026-09-05T20:00:00+05:30',
    };

    const updatedShowtime = {
      id: 100,
      screenId: 10,
      ...dto,
    };

    showtimesServiceMock.update.mockResolvedValue(updatedShowtime);

    await expect(controller.update(100, dto)).resolves.toEqual(updatedShowtime);

    expect(showtimesServiceMock.update).toHaveBeenCalledWith(100, dto);
  });

  it('should delete a showtime', async () => {
    const deletedShowtime = {
      id: 100,
      title: 'Interstellar',
      startsAt: '2026-09-05T19:30:00+05:30',
      screenId: 10,
    };

    showtimesServiceMock.remove.mockResolvedValue(deletedShowtime);

    await expect(controller.remove(100)).resolves.toEqual(deletedShowtime);

    expect(showtimesServiceMock.remove).toHaveBeenCalledWith(100);
  });
});

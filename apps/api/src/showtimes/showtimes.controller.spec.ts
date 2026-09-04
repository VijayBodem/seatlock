import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ShowtimesController } from './showtimes.controller.js';
import { ShowtimesService } from './showtimes.service.js';

describe('ShowtimesController', () => {
  let controller: ShowtimesController;

  const showtimesServiceMock = {
    create: jest.fn(),
    findAllByScreen: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowtimesController],
      providers: [
        {
          provide: ShowtimesService,
          useValue: showtimesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ShowtimesController>(ShowtimesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a showtime for a screen', async () => {
    const dto = {
      title: 'Interstellar',
      startsAt: '2026-09-05T19:30:00+05:30',
    };

    const createdShowtime = {
      id: 100,
      ...dto,
      screenId: 10,
    };

    showtimesServiceMock.create.mockResolvedValue(createdShowtime);

    await expect(controller.create(10, dto)).resolves.toEqual(createdShowtime);

    expect(showtimesServiceMock.create).toHaveBeenCalledWith(10, dto);
  });

  it('should return all showtimes for a screen', async () => {
    const showtimes = [
      {
        id: 100,
        title: 'Interstellar',
        startsAt: '2026-09-05T19:30:00+05:30',
        screenId: 10,
      },
    ];

    showtimesServiceMock.findAllByScreen.mockResolvedValue(showtimes);

    await expect(controller.findAll(10)).resolves.toEqual(showtimes);

    expect(showtimesServiceMock.findAllByScreen).toHaveBeenCalledWith(10);
  });
});

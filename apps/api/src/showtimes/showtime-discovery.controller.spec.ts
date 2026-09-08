import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ShowtimeDiscoveryController } from './showtime-discovery.controller.js';
import { ShowtimeDiscoveryService } from './showtime-discovery.service.js';

describe('ShowtimeDiscoveryController', () => {
  let controller: ShowtimeDiscoveryController;

  const showtimeDiscoveryServiceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSeats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowtimeDiscoveryController],
      providers: [
        {
          provide: ShowtimeDiscoveryService,
          useValue: showtimeDiscoveryServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ShowtimeDiscoveryController>(
      ShowtimeDiscoveryController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return discoverable showtimes', async () => {
    const showtimes = [
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
    ];

    showtimeDiscoveryServiceMock.findAll.mockResolvedValue(showtimes);

    await expect(controller.findAll()).resolves.toEqual(showtimes);

    expect(showtimeDiscoveryServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return customer-friendly showtime details', async () => {
    const showtime = {
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
    };

    showtimeDiscoveryServiceMock.findOne.mockResolvedValue(showtime);

    await expect(controller.findOne(100)).resolves.toEqual(showtime);

    expect(showtimeDiscoveryServiceMock.findOne).toHaveBeenCalledWith(100);
  });

  it('should return customer-friendly seat inventory', async () => {
    const seats = [
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
    ];

    showtimeDiscoveryServiceMock.findSeats.mockResolvedValue(seats);

    await expect(controller.findSeats(100)).resolves.toEqual(seats);

    expect(showtimeDiscoveryServiceMock.findSeats).toHaveBeenCalledWith(100);
  });
});

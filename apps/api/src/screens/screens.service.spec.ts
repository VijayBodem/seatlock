import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { ScreensService } from './screens.service.js';

describe('ScreensService', () => {
  let service: ScreensService;

  const screenAllMock = jest.fn();

  const screenWhereMock = jest.fn(() => ({
    all: screenAllMock,
  }));

  const venueModelMock = {
    first: jest.fn(),
  };

  const screenModelMock = {
    create: jest.fn(),
    where: screenWhereMock,
  };

  const databaseMock = {
    orm: {
      public: {
        Venue: venueModelMock,
        Screen: screenModelMock,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreensService,
        {
          provide: DATABASE,
          useValue: databaseMock,
        },
      ],
    }).compile();

    service = module.get<ScreensService>(ScreensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a screen for an existing venue', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
      };

      const dto = {
        name: 'Screen 1',
      };

      const createdScreen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      venueModelMock.first.mockResolvedValue(venue);
      screenModelMock.create.mockResolvedValue(createdScreen);

      await expect(service.create(1, dto)).resolves.toEqual(createdScreen);

      expect(venueModelMock.first).toHaveBeenCalledWith({
        id: 1,
      });

      expect(screenModelMock.create).toHaveBeenCalledWith({
        name: 'Screen 1',
        venueId: 1,
      });
    });

    it('should throw NotFoundException when venue does not exist', async () => {
      venueModelMock.first.mockResolvedValue(null);

      await expect(service.create(999, { name: 'Screen 1' })).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );

      expect(screenModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByVenue', () => {
    it('should return all screens for an existing venue', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
      };

      const screens = [
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
      ];

      venueModelMock.first.mockResolvedValue(venue);
      screenAllMock.mockResolvedValue(screens);

      await expect(service.findAllByVenue(1)).resolves.toEqual(screens);

      expect(venueModelMock.first).toHaveBeenCalledWith({
        id: 1,
      });

      expect(screenWhereMock).toHaveBeenCalledWith({
        venueId: 1,
      });

      expect(screenAllMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when venue does not exist', async () => {
      venueModelMock.first.mockResolvedValue(null);

      await expect(service.findAllByVenue(999)).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );

      expect(screenWhereMock).not.toHaveBeenCalled();
      expect(screenAllMock).not.toHaveBeenCalled();
    });
  });
});

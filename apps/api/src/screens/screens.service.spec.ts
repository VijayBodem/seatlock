import { jest } from '@jest/globals';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { ScreensService } from './screens.service.js';

describe('ScreensService', () => {
  let service: ScreensService;

  const screenAllMock = jest.fn();

  const screenUpdateMock = jest.fn();
  const screenDeleteMock = jest.fn();

  const screenWhereMock = jest.fn(() => ({
    all: screenAllMock,
    update: screenUpdateMock,
    delete: screenDeleteMock,
  }));

  const venueModelMock = {
    first: jest.fn(),
  };

  const screenModelMock = {
    create: jest.fn(),
    first: jest.fn(),
    where: screenWhereMock,
  };

  const seatModelMock = {
    first: jest.fn(),
  };

  const showtimeModelMock = {
    first: jest.fn(),
  };

  const databaseMock = {
    orm: {
      public: {
        Venue: venueModelMock,
        Screen: screenModelMock,
        Seat: seatModelMock,
        Showtime: showtimeModelMock,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    showtimeModelMock.first.mockResolvedValue(null);
    seatModelMock.first.mockResolvedValue(null);

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

  describe('findOne', () => {
    it('should return a screen when it exists', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      screenModelMock.first.mockResolvedValue(screen);

      await expect(service.findOne(10)).resolves.toEqual(screen);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );
    });
  });

  describe('update', () => {
    it('should update an existing screen', async () => {
      const existingScreen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      const updateDto = {
        name: 'Screen 1 Updated',
      };

      const updatedScreen = {
        ...existingScreen,
        ...updateDto,
      };

      screenModelMock.first.mockResolvedValue(existingScreen);
      screenUpdateMock.mockResolvedValue(updatedScreen);

      await expect(service.update(10, updateDto)).resolves.toEqual(
        updatedScreen,
      );

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(screenWhereMock).toHaveBeenCalledWith({
        id: 10,
      });

      expect(screenUpdateMock).toHaveBeenCalledWith(updateDto);
    });

    it('should throw NotFoundException when updating a missing screen', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Updated Screen' }),
      ).rejects.toThrow(new NotFoundException('Screen with id 999 not found'));

      expect(screenWhereMock).not.toHaveBeenCalled();
      expect(screenUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an empty existing screen', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      screenModelMock.first.mockResolvedValue(screen);
      screenDeleteMock.mockResolvedValue(screen);

      await expect(service.remove(10)).resolves.toEqual(screen);

      expect(screenModelMock.first).toHaveBeenCalledWith({
        id: 10,
      });

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(seatModelMock.first).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(screenWhereMock).toHaveBeenCalledWith({
        id: 10,
      });

      expect(screenDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('should reject deleting a screen with showtimes', async () => {
      screenModelMock.first.mockResolvedValue({
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      });

      showtimeModelMock.first.mockResolvedValue({
        id: 100,
        screenId: 10,
      });

      await expect(service.remove(10)).rejects.toThrow(
        new ConflictException(
          'Screen with id 10 cannot be deleted because it has showtimes',
        ),
      );

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(seatModelMock.first).not.toHaveBeenCalled();
      expect(screenDeleteMock).not.toHaveBeenCalled();
    });

    it('should reject deleting a screen with seats', async () => {
      screenModelMock.first.mockResolvedValue({
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      });

      showtimeModelMock.first.mockResolvedValue(null);

      seatModelMock.first.mockResolvedValue({
        id: 50,
        screenId: 10,
        row: 'A',
        number: 1,
        type: 'STANDARD',
      });

      await expect(service.remove(10)).rejects.toThrow(
        new ConflictException(
          'Screen with id 10 cannot be deleted because it has seats',
        ),
      );

      expect(showtimeModelMock.first).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(seatModelMock.first).toHaveBeenCalledWith({
        screenId: 10,
      });

      expect(screenDeleteMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when deleting a missing screen', async () => {
      screenModelMock.first.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Screen with id 999 not found'),
      );

      expect(showtimeModelMock.first).not.toHaveBeenCalled();
      expect(seatModelMock.first).not.toHaveBeenCalled();
      expect(screenWhereMock).not.toHaveBeenCalled();
      expect(screenDeleteMock).not.toHaveBeenCalled();
    });
  });
});

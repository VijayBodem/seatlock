import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DATABASE } from '../database/database.constants.js';
import { VenuesService } from './venues.service.js';

describe('VenuesService', () => {
  let service: VenuesService;

  const updateMock = jest.fn();
  const deleteMock = jest.fn();

  const whereMock = jest.fn(() => ({
    update: updateMock,
    delete: deleteMock,
  }));

  const venueModelMock = {
    create: jest.fn(),
    all: jest.fn(),
    first: jest.fn(),
    where: whereMock,
  };
  const databaseMock = {
    orm: {
      public: {
        Venue: venueModelMock,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: DATABASE,
          useValue: databaseMock,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a venue', async () => {
      const dto = {
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
        address: 'Kukatpally',
      };

      const createdVenue = {
        id: 1,
        ...dto,
      };

      venueModelMock.create.mockResolvedValue(createdVenue);

      await expect(service.create(dto)).resolves.toEqual(createdVenue);

      expect(venueModelMock.create).toHaveBeenCalledWith({
        name: dto.name,
        city: dto.city,
        address: dto.address,
      });
      expect(venueModelMock.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all venues', async () => {
      const venues = [
        {
          id: 1,
          name: 'PVR Nexus Mall',
          city: 'Hyderabad',
          address: 'Kukatpally',
        },
      ];

      venueModelMock.all.mockResolvedValue(venues);

      await expect(service.findAll()).resolves.toEqual(venues);

      expect(venueModelMock.all).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a venue when it exists', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
        address: 'Kukatpally',
      };

      venueModelMock.first.mockResolvedValue(venue);

      await expect(service.findOne(1)).resolves.toEqual(venue);

      expect(venueModelMock.first).toHaveBeenCalledWith({
        id: 1,
      });
    });

    it('should throw NotFoundException when venue does not exist', async () => {
      venueModelMock.first.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );

      expect(venueModelMock.first).toHaveBeenCalledWith({
        id: 999,
      });
    });
  });

  describe('update', () => {
    it('should update an existing venue', async () => {
      const existingVenue = {
        id: 1,
        name: 'Old Name',
        city: 'Hyderabad',
        address: 'Old Address',
      };

      const updateDto = {
        name: 'PVR Updated',
      };

      const updatedVenue = {
        ...existingVenue,
        ...updateDto,
      };

      venueModelMock.first.mockResolvedValue(existingVenue);
      updateMock.mockResolvedValue(updatedVenue);

      await expect(service.update(1, updateDto)).resolves.toEqual(updatedVenue);

      expect(venueModelMock.first).toHaveBeenCalledWith({ id: 1 });
      expect(whereMock).toHaveBeenCalledWith({ id: 1 });
      expect(updateMock).toHaveBeenCalledWith(updateDto);
    });

    it('should throw NotFoundException when updating a missing venue', async () => {
      venueModelMock.first.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );

      expect(whereMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing venue', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
        address: 'Kukatpally',
      };

      venueModelMock.first.mockResolvedValue(venue);
      deleteMock.mockResolvedValue(venue);

      await expect(service.remove(1)).resolves.toEqual(venue);

      expect(venueModelMock.first).toHaveBeenCalledWith({ id: 1 });
      expect(whereMock).toHaveBeenCalledWith({ id: 1 });
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when deleting a missing venue', async () => {
      venueModelMock.first.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Venue with id 999 not found'),
      );

      expect(whereMock).not.toHaveBeenCalled();
      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});

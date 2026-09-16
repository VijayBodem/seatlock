import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { VenuesController } from './venues.controller.js';
import { VenuesService } from './venues.service.js';

describe('VenuesController', () => {
  let controller: VenuesController;

  const venuesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        {
          provide: VenuesService,
          useValue: venuesServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    controller = module.get<VenuesController>(VenuesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      venuesServiceMock.create.mockResolvedValue(createdVenue);

      await expect(controller.create(dto)).resolves.toEqual(createdVenue);

      expect(venuesServiceMock.create).toHaveBeenCalledWith(dto);
      expect(venuesServiceMock.create).toHaveBeenCalledTimes(1);
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
        {
          id: 2,
          name: 'INOX GVK One',
          city: 'Hyderabad',
          address: 'Banjara Hills',
        },
      ];

      venuesServiceMock.findAll.mockResolvedValue(venues);

      await expect(controller.findAll()).resolves.toEqual(venues);

      expect(venuesServiceMock.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return one venue', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
        address: 'Kukatpally',
      };

      venuesServiceMock.findOne.mockResolvedValue(venue);

      await expect(controller.findOne(1)).resolves.toEqual(venue);

      expect(venuesServiceMock.findOne).toHaveBeenCalledWith(1);
      expect(venuesServiceMock.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update a venue', async () => {
      const dto = {
        name: 'PVR Nexus Mall Updated',
        city: 'Hyderabad',
      };

      const updatedVenue = {
        id: 1,
        name: dto.name,
        city: dto.city,
        address: 'Kukatpally',
      };

      venuesServiceMock.update.mockResolvedValue(updatedVenue);

      await expect(controller.update(1, dto)).resolves.toEqual(updatedVenue);

      expect(venuesServiceMock.update).toHaveBeenCalledWith(1, dto);
      expect(venuesServiceMock.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should remove a venue', async () => {
      const venue = {
        id: 1,
        name: 'PVR Nexus Mall',
        city: 'Hyderabad',
        address: 'Kukatpally',
      };

      venuesServiceMock.remove.mockResolvedValue(venue);

      await expect(controller.remove(1)).resolves.toEqual(venue);

      expect(venuesServiceMock.remove).toHaveBeenCalledWith(1);
      expect(venuesServiceMock.remove).toHaveBeenCalledTimes(1);
    });
  });
});

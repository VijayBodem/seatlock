import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreensController } from './screens.controller.js';
import { ScreensService } from './screens.service.js';

describe('ScreensController', () => {
  let controller: ScreensController;

  const screensServiceMock = {
    create: jest.fn(),
    findAllByVenue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreensController],
      providers: [
        {
          provide: ScreensService,
          useValue: screensServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ScreensController>(ScreensController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a screen for a venue', async () => {
      const dto = {
        name: 'Screen 1',
      };

      const createdScreen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      screensServiceMock.create.mockResolvedValue(createdScreen);

      await expect(controller.create(1, dto)).resolves.toEqual(createdScreen);

      expect(screensServiceMock.create).toHaveBeenCalledWith(1, dto);
      expect(screensServiceMock.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all screens for a venue', async () => {
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

      screensServiceMock.findAllByVenue.mockResolvedValue(screens);

      await expect(controller.findAll(1)).resolves.toEqual(screens);

      expect(screensServiceMock.findAllByVenue).toHaveBeenCalledWith(1);
      expect(screensServiceMock.findAllByVenue).toHaveBeenCalledTimes(1);
    });
  });
});

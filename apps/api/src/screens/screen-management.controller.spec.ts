import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { ScreenManagementController } from './screen-management.controller.js';
import { ScreensService } from './screens.service.js';

describe('ScreenManagementController', () => {
  let controller: ScreenManagementController;

  const screensServiceMock = {
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenManagementController],
      providers: [
        {
          provide: ScreensService,
          useValue: screensServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ScreenManagementController>(
      ScreenManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a screen by id', async () => {
      const screen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      screensServiceMock.findOne.mockResolvedValue(screen);

      await expect(controller.findOne(10)).resolves.toEqual(screen);

      expect(screensServiceMock.findOne).toHaveBeenCalledWith(10);
      expect(screensServiceMock.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update a screen', async () => {
      const dto = {
        name: 'Screen 1 Updated',
      };

      const updatedScreen = {
        id: 10,
        name: 'Screen 1 Updated',
        venueId: 1,
      };

      screensServiceMock.update.mockResolvedValue(updatedScreen);

      await expect(controller.update(10, dto)).resolves.toEqual(updatedScreen);

      expect(screensServiceMock.update).toHaveBeenCalledWith(10, dto);
      expect(screensServiceMock.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete a screen', async () => {
      const deletedScreen = {
        id: 10,
        name: 'Screen 1',
        venueId: 1,
      };

      screensServiceMock.remove.mockResolvedValue(deletedScreen);

      await expect(controller.remove(10)).resolves.toEqual(deletedScreen);

      expect(screensServiceMock.remove).toHaveBeenCalledWith(10);
      expect(screensServiceMock.remove).toHaveBeenCalledTimes(1);
    });
  });
});

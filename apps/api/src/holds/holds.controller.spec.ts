import { jest } from '@jest/globals';

import { HoldsController } from './holds.controller.js';

describe('HoldsController', () => {
  const createMock = jest.fn();

  const holdsServiceMock = {
    create: createMock,
  };

  let controller: HoldsController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new HoldsController(holdsServiceMock as never);
  });

  it('delegates hold creation to HoldsService', async () => {
    createMock.mockResolvedValue({
      id: 50,
      showtimeId: 10,
      status: 'ACTIVE',
      expiresAt: '2026-09-05T13:00:00.000Z',
      seatIds: [1, 2],
    });

    await expect(
      controller.create(10, {
        seatIds: [1, 2],
      }),
    ).resolves.toEqual({
      id: 50,
      showtimeId: 10,
      status: 'ACTIVE',
      expiresAt: '2026-09-05T13:00:00.000Z',
      seatIds: [1, 2],
    });

    expect(createMock).toHaveBeenCalledWith(10, {
      seatIds: [1, 2],
    });
  });
});

import { jest } from '@jest/globals';

import { BookingsController } from './bookings.controller.js';

describe('BookingsController', () => {
  const confirmMock = jest.fn();
  const findOneMock = jest.fn();

  const bookingsServiceMock = {
    confirm: confirmMock,
    findOne: findOneMock,
  };

  let controller: BookingsController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new BookingsController(bookingsServiceMock as never);
  });

  it('delegates booking confirmation with the authenticated user id', async () => {
    confirmMock.mockResolvedValue({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    const request = {
      user: {
        id: 7,
        email: 'vijay@example.com',
      },
    };

    await expect(controller.confirm(10, request as never)).resolves.toEqual({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    expect(confirmMock).toHaveBeenCalledWith(10, 7);
  });

  it('delegates booking retrieval with the authenticated user id', async () => {
    findOneMock.mockResolvedValue({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    const request = {
      user: {
        id: 7,
        email: 'vijay@example.com',
      },
    };

    await expect(controller.findOne(50, request as never)).resolves.toEqual({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    expect(findOneMock).toHaveBeenCalledWith(50, 7);
  });
});

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

  it('delegates booking confirmation to BookingsService', async () => {
    confirmMock.mockResolvedValue({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    await expect(controller.confirm(10)).resolves.toEqual({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    expect(confirmMock).toHaveBeenCalledWith(10);
  });

  it('delegates booking retrieval to BookingsService', async () => {
    findOneMock.mockResolvedValue({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    await expect(controller.findOne(50)).resolves.toEqual({
      id: 50,
      showtimeId: 20,
      holdId: 10,
      seatIds: [1, 2],
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    expect(findOneMock).toHaveBeenCalledWith(50);
  });
});

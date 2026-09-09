import { jest } from '@jest/globals';

import { SeatRealtimeGateway } from './seat-realtime.gateway.js';

describe('SeatRealtimeGateway', () => {
  const joinMock = jest.fn();
  const leaveMock = jest.fn();
  const emitMock = jest.fn();
  const toMock = jest.fn();

  const clientMock = {
    join: joinMock,
    leave: leaveMock,
  };

  const roomOperatorMock = {
    emit: emitMock,
  };

  const serverMock = {
    to: toMock,
  };

  let gateway: SeatRealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();

    joinMock.mockResolvedValue(undefined);
    leaveMock.mockResolvedValue(undefined);
    toMock.mockReturnValue(roomOperatorMock);

    gateway = new SeatRealtimeGateway();

    Object.defineProperty(gateway, 'server', {
      value: serverMock,
    });
  });

  describe('joinShowtime', () => {
    it('joins the socket to the requested showtime room', async () => {
      const result = await gateway.joinShowtime(
        {
          showtimeId: 10,
        },
        clientMock as never,
      );

      expect(joinMock).toHaveBeenCalledTimes(1);
      expect(joinMock).toHaveBeenCalledWith('showtime:10');

      expect(result).toEqual({
        ok: true,
        showtimeId: 10,
      });
    });

    it('rejects an invalid showtime id', async () => {
      const result = await gateway.joinShowtime(
        {
          showtimeId: 0,
        },
        clientMock as never,
      );

      expect(joinMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        ok: false,
        message: 'showtimeId must be a positive integer',
      });
    });
  });

  describe('leaveShowtime', () => {
    it('leaves the requested showtime room', async () => {
      const result = await gateway.leaveShowtime(
        {
          showtimeId: 10,
        },
        clientMock as never,
      );

      expect(leaveMock).toHaveBeenCalledTimes(1);
      expect(leaveMock).toHaveBeenCalledWith('showtime:10');

      expect(result).toEqual({
        ok: true,
        showtimeId: 10,
      });
    });

    it('rejects an invalid showtime id', async () => {
      const result = await gateway.leaveShowtime(
        {
          showtimeId: -1,
        },
        clientMock as never,
      );

      expect(leaveMock).not.toHaveBeenCalled();

      expect(result).toEqual({
        ok: false,
        message: 'showtimeId must be a positive integer',
      });
    });
  });

  describe('emitSeatStatusChanged', () => {
    it('broadcasts the event only to the affected showtime room', () => {
      const event = {
        showtimeId: 10,
        seatIds: [5, 6],
        status: 'HELD' as const,
      };

      gateway.emitSeatStatusChanged(event);

      expect(toMock).toHaveBeenCalledTimes(1);
      expect(toMock).toHaveBeenCalledWith('showtime:10');

      expect(emitMock).toHaveBeenCalledTimes(1);
      expect(emitMock).toHaveBeenCalledWith('seat:status-changed', event);
    });
  });
});

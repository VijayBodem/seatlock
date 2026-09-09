import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type {
  JoinShowtimePayload,
  LeaveShowtimePayload,
  SeatStatusChangedEvent,
} from './seat-realtime.types.js';

const SHOWTIME_ROOM_PREFIX = 'showtime:';

function getShowtimeRoom(showtimeId: number): string {
  return `${SHOWTIME_ROOM_PREFIX}${showtimeId}`;
}

function isValidShowtimeId(showtimeId: unknown): showtimeId is number {
  return (
    typeof showtimeId === 'number' &&
    Number.isInteger(showtimeId) &&
    showtimeId > 0
  );
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  },
})
export class SeatRealtimeGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('showtime:join')
  async joinShowtime(
    @MessageBody() payload: JoinShowtimePayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isValidShowtimeId(payload?.showtimeId)) {
      return {
        ok: false,
        message: 'showtimeId must be a positive integer',
      };
    }

    await client.join(getShowtimeRoom(payload.showtimeId));

    return {
      ok: true,
      showtimeId: payload.showtimeId,
    };
  }

  @SubscribeMessage('showtime:leave')
  async leaveShowtime(
    @MessageBody() payload: LeaveShowtimePayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!isValidShowtimeId(payload?.showtimeId)) {
      return {
        ok: false,
        message: 'showtimeId must be a positive integer',
      };
    }

    await client.leave(getShowtimeRoom(payload.showtimeId));

    return {
      ok: true,
      showtimeId: payload.showtimeId,
    };
  }

  emitSeatStatusChanged(event: SeatStatusChangedEvent): void {
    this.server
      .to(getShowtimeRoom(event.showtimeId))
      .emit('seat:status-changed', event);
  }
}

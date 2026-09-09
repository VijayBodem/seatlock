import { io, type Socket } from 'socket.io-client'

import { apiUrl } from './api'

export type SeatRealtimeStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'

export type SeatStatusChangedEvent = {
  showtimeId: number
  seatIds: number[]
  status: SeatRealtimeStatus
}

type JoinShowtimePayload = {
  showtimeId: number
}

type LeaveShowtimePayload = {
  showtimeId: number
}

type ServerToClientEvents = {
  'seat:status-changed': (event: SeatStatusChangedEvent) => void
}

type ClientToServerEvents = {
  'showtime:join': (payload: JoinShowtimePayload) => void
  'showtime:leave': (payload: LeaveShowtimePayload) => void
}

export type SeatRealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function createSeatRealtimeSocket(): SeatRealtimeSocket {
  return io(apiUrl, {
    autoConnect: false,
  })
}

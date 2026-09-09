export type SeatRealtimeStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export type SeatStatusChangedEvent = {
  showtimeId: number;
  seatIds: number[];
  status: SeatRealtimeStatus;
};

export type JoinShowtimePayload = {
  showtimeId: number;
};

export type LeaveShowtimePayload = {
  showtimeId: number;
};

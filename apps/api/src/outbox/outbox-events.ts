export const OUTBOX_EVENT_TYPES = {
  BOOKING_CONFIRMED: 'BookingConfirmed',
} as const;

export type BookingConfirmedPayload = {
  bookingId: number;
  holdId: number;
  showtimeId: number;
  userId: number;
  seatIds: number[];
  occurredAt: string;
};

export function createBookingConfirmedEvent(input: BookingConfirmedPayload) {
  return {
    eventType: OUTBOX_EVENT_TYPES.BOOKING_CONFIRMED,
    aggregateType: 'Booking',
    aggregateId: String(input.bookingId),
    payload: {
      bookingId: input.bookingId,
      holdId: input.holdId,
      showtimeId: input.showtimeId,
      userId: input.userId,
      seatIds: input.seatIds,
      occurredAt: input.occurredAt,
    },
  };
}

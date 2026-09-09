import { apiRequest } from './api'
import type { Booking, BookingDetails } from '../types/showtime'

export function confirmBooking(
  holdId: number,
  accessToken: string,
): Promise<Booking> {
  return apiRequest<Booking>(`/holds/${holdId}/confirm`, {
    method: 'POST',
    accessToken,
  })
}

export function getMyBookings(
  accessToken: string,
): Promise<BookingDetails[]> {
  return apiRequest<BookingDetails[]>('/bookings/me', {
    accessToken,
  })
}

export function getBooking(
  bookingId: number,
  accessToken: string,
): Promise<BookingDetails> {
  return apiRequest<BookingDetails>(`/bookings/${bookingId}`, {
    accessToken,
  })
}
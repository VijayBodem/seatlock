import { apiRequest } from './api'
import type { Booking } from '../types/showtime'

export function confirmBooking(
  holdId: number,
  accessToken: string,
): Promise<Booking> {
  return apiRequest<Booking>(`/holds/${holdId}/confirm`, {
    method: 'POST',
    accessToken,
  })
}
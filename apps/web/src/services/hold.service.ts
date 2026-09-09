import { apiRequest } from './api'
import type {
  CreateHoldRequest,
  SeatHold,
} from '../types/showtime'

export function createHold(
  showtimeId: number,
  request: CreateHoldRequest,
  accessToken: string,
): Promise<SeatHold> {
  return apiRequest<SeatHold>(`/showtimes/${showtimeId}/holds`, {
    method: 'POST',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}
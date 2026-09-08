import { apiRequest } from './api'
import type { ShowtimeSeat, ShowtimeSummary } from '../types/showtime'

export function getShowtimes(): Promise<ShowtimeSummary[]> {
  return apiRequest<ShowtimeSummary[]>('/discovery/showtimes')
}

export function getShowtime(id: number): Promise<ShowtimeSummary> {
  return apiRequest<ShowtimeSummary>(`/discovery/showtimes/${id}`)
}

export function getShowtimeSeats(id: number): Promise<ShowtimeSeat[]> {
  return apiRequest<ShowtimeSeat[]>(`/discovery/showtimes/${id}/seats`)
}
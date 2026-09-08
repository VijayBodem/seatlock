import { apiRequest } from './api'
import type { ShowtimeSummary } from '../types/showtime'

export function getShowtimes(): Promise<ShowtimeSummary[]> {
  return apiRequest<ShowtimeSummary[]>('/discovery/showtimes')
}
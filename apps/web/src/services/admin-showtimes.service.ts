import { apiRequest } from './api'
import type {
  AdminShowtime,
  CreateShowtimeInput,
  UpdateShowtimeInput,
} from '../types/admin-showtime'

export function getAdminShowtimes(screenId: number): Promise<AdminShowtime[]> {
  return apiRequest<AdminShowtime[]>(`/screens/${screenId}/showtimes`)
}

export function createAdminShowtime(
  screenId: number,
  input: CreateShowtimeInput,
  accessToken: string,
): Promise<AdminShowtime> {
  return apiRequest<AdminShowtime>(`/screens/${screenId}/showtimes`, {
    method: 'POST',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function updateAdminShowtime(
  id: number,
  input: UpdateShowtimeInput,
  accessToken: string,
): Promise<AdminShowtime> {
  return apiRequest<AdminShowtime>(`/showtimes/${id}`, {
    method: 'PATCH',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function deleteAdminShowtime(
  id: number,
  accessToken: string,
): Promise<AdminShowtime> {
  return apiRequest<AdminShowtime>(`/showtimes/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}
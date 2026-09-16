import type {
  CreateSeatInput,
  Seat,
  UpdateSeatInput,
} from '../types/seat'
import { apiRequest } from './api'

export function getSeats(screenId: number): Promise<Seat[]> {
  return apiRequest<Seat[]>(`/screens/${screenId}/seats`)
}

export function createSeat(
  screenId: number,
  input: CreateSeatInput,
  accessToken: string,
): Promise<Seat> {
  return apiRequest<Seat>(`/screens/${screenId}/seats`, {
    method: 'POST',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function updateSeat(
  id: number,
  input: UpdateSeatInput,
  accessToken: string,
): Promise<Seat> {
  return apiRequest<Seat>(`/seats/${id}`, {
    method: 'PATCH',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function deleteSeat(
  id: number,
  accessToken: string,
): Promise<unknown> {
  return apiRequest<unknown>(`/seats/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}
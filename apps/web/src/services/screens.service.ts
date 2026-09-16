import type {
  CreateScreenInput,
  Screen,
  UpdateScreenInput,
} from '../types/screen'
import { apiRequest } from './api'

export function getScreens(venueId: number): Promise<Screen[]> {
  return apiRequest<Screen[]>(`/venues/${venueId}/screens`)
}

export function createScreen(
  venueId: number,
  input: CreateScreenInput,
  accessToken: string,
): Promise<Screen> {
  return apiRequest<Screen>(`/venues/${venueId}/screens`, {
    method: 'POST',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function updateScreen(
  id: number,
  input: UpdateScreenInput,
  accessToken: string,
): Promise<Screen> {
  return apiRequest<Screen>(`/screens/${id}`, {
    method: 'PATCH',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function deleteScreen(
  id: number,
  accessToken: string,
): Promise<unknown> {
  return apiRequest<unknown>(`/screens/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}
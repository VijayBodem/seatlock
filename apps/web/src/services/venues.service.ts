import type {
  CreateVenueInput,
  UpdateVenueInput,
  Venue,
} from '../types/venue'
import { apiRequest } from './api'

export function getVenues(): Promise<Venue[]> {
  return apiRequest<Venue[]>('/venues')
}

export function createVenue(
  input: CreateVenueInput,
  accessToken: string,
): Promise<Venue> {
  return apiRequest<Venue>('/venues', {
    method: 'POST',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function updateVenue(
  id: number,
  input: UpdateVenueInput,
  accessToken: string,
): Promise<Venue> {
  return apiRequest<Venue>(`/venues/${id}`, {
    method: 'PATCH',
    accessToken,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function deleteVenue(
  id: number,
  accessToken: string,
): Promise<unknown> {
  return apiRequest<unknown>(`/venues/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}
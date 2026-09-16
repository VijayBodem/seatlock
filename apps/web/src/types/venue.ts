export type Venue = {
  id: number
  name: string
  city: string
  address: string | null
  createdAt: string
  updatedAt: string
}

export type CreateVenueInput = {
  name: string
  city: string
  address?: string
}

export type UpdateVenueInput = {
  name?: string
  city?: string
  address?: string
}
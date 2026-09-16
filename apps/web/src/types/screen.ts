export type Screen = {
  id: number
  name: string
  venueId: number
  createdAt: string
  updatedAt: string
}

export type CreateScreenInput = {
  name: string
}

export type UpdateScreenInput = {
  name?: string
}
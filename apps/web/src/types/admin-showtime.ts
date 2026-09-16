export type AdminShowtime = {
  id: number
  title: string
  startsAt: string
  screenId: number
  createdAt: string
  updatedAt: string
}

export type CreateShowtimeInput = {
  title: string
  startsAt: string
}

export type UpdateShowtimeInput = {
  title?: string
  startsAt?: string
}
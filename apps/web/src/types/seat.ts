export type SeatType = 'STANDARD' | 'PREMIUM' | 'ACCESSIBLE'

export type Seat = {
  id: number
  row: string
  number: number
  type: SeatType
  screenId: number
  createdAt: string
  updatedAt: string
}

export type CreateSeatInput = {
  row: string
  number: number
  type: SeatType
}

export type UpdateSeatInput = {
  row?: string
  number?: number
  type?: SeatType
}
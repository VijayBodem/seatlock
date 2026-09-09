export type ShowtimeVenue = {
  id: number
  name: string
  city: string
  address: string | null
}

export type ShowtimeScreen = {
  id: number
  name: string
}

export type ShowtimeSummary = {
  id: number
  title: string
  startsAt: string
  availableSeats: number
  screen: ShowtimeScreen
  venue: ShowtimeVenue
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'

export type SeatType = 'STANDARD' | 'PREMIUM' | 'ACCESSIBLE'

export type ShowtimeSeat = {
  id: number
  seatId: number
  row: string
  number: number
  type: SeatType
  status: SeatStatus
}

export type CreateHoldRequest = {
  seatIds: number[]
}

export type SeatHold = {
  id: number
  showtimeId: number
  status: 'ACTIVE' | 'EXPIRED'
  expiresAt: string
  seatIds: number[]
}

export type Booking = {
  id: number
  showtimeId: number
  holdId: number
  seatIds: number[]
  createdAt: string
}
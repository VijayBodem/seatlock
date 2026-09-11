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
  price: number
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

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'

export type PaymentSession = {
  id: number
  holdId: number
  status: PaymentStatus
  amount: number
  currency: string
  clientSecret: string
}

export type Booking = {
  id: number
  showtimeId: number
  holdId: number
  seatIds: number[]
  createdAt: string
}

export type BookingSeat = {
  seatId: number
  row: string
  number: number
  type: SeatType
}

export type BookingShowtime = {
  title: string
  startsAt: string
  screen: ShowtimeScreen
  venue: ShowtimeVenue
}

export type BookingDetails = Booking & {
  showtime: BookingShowtime
  seats: BookingSeat[]
}

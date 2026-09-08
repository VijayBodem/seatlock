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
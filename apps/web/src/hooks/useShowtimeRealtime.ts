import { useEffect } from 'react'

import {
  createSeatRealtimeSocket,
  type SeatStatusChangedEvent,
} from '../services/realtime.service'

type ShowtimeRealtimeOptions = {
  showtimeId: number
  isEnabled: boolean
  onSeatStatusChanged: (event: SeatStatusChangedEvent) => void
}

export function useShowtimeRealtime({
  showtimeId,
  isEnabled,
  onSeatStatusChanged,
}: ShowtimeRealtimeOptions): void {
  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const socket = createSeatRealtimeSocket()

    function joinShowtime() {
      socket.emit('showtime:join', {
        showtimeId,
      })
    }

    function handleSeatStatusChanged(
      event: SeatStatusChangedEvent,
    ) {
      if (event.showtimeId !== showtimeId) {
        return
      }

      onSeatStatusChanged(event)
    }

    socket.on('connect', joinShowtime)

    socket.on(
      'seat:status-changed',
      handleSeatStatusChanged,
    )

    socket.connect()

    return () => {
      socket.off('connect', joinShowtime)

      socket.off(
        'seat:status-changed',
        handleSeatStatusChanged,
      )

      if (socket.connected) {
        socket.emit('showtime:leave', {
          showtimeId,
        })
      }

      socket.disconnect()
    }
  }, [
    isEnabled,
    onSeatStatusChanged,
    showtimeId,
  ])
}
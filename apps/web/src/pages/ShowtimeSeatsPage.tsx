import {
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useParams,
} from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { useShowtimeRealtime } from '../hooks/useShowtimeRealtime'
import { ApiError } from '../services/api'
import { confirmBooking } from '../services/booking.service'
import { createHold } from '../services/hold.service'
import {
  getShowtime,
  getShowtimeSeats,
} from '../services/showtime.service'
import type {
  Booking,
  SeatHold,
  ShowtimeSeat,
  ShowtimeSummary,
} from '../types/showtime'
import type { SeatStatusChangedEvent } from '../services/realtime.service'

function getLocale(language: string): string {
  if (language.startsWith('te')) {
    return 'te-IN'
  }

  if (language.startsWith('hi')) {
    return 'hi-IN'
  }

  return 'en-IN'
}

function formatShowtime(
  startsAt: string,
  language: string,
): {
  date: string
  time: string
} {
  const date = new Date(startsAt)
  const locale = getLocale(language)

  return {
    date: new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000),
  )

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getAvailableSeatTypeClasses(
  type: ShowtimeSeat['type'],
): string {
  if (type === 'PREMIUM') {
    return 'border-violet-400 bg-violet-50 text-violet-950 hover:border-blue-500 hover:bg-blue-50 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/40'
  }

  if (type === 'ACCESSIBLE') {
    return 'border-cyan-400 bg-cyan-50 text-cyan-950 hover:border-blue-500 hover:bg-blue-50 dark:border-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/40'
  }

  return 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-blue-500 hover:bg-blue-50 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/40'
}

function getSeatClasses(
  seat: ShowtimeSeat,
  isSelected: boolean,
): string {
  if (isSelected) {
    return 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
  }

  if (seat.status === 'HELD') {
    return 'cursor-not-allowed border-amber-300 bg-amber-50 text-amber-900 opacity-70 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
  }

  if (seat.status === 'BOOKED') {
    return 'cursor-not-allowed border-zinc-300 bg-zinc-200 text-zinc-500 opacity-70 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
  }

  return getAvailableSeatTypeClasses(seat.type)
}

function Seat({
  seat,
  isSelected,
  isSelectionDisabled,
  onToggle,
}: {
  seat: ShowtimeSeat
  isSelected: boolean
  isSelectionDisabled: boolean
  onToggle: (seat: ShowtimeSeat) => void
}) {
  const { t } = useTranslation()

  const isAvailable =
    seat.status === 'AVAILABLE' &&
    !isSelectionDisabled

  const statusLabel = isSelected
    ? t('showtimeSeats.status.selected')
    : t(
        `showtimeSeats.status.${seat.status.toLowerCase()}`,
      )

  const typeLabel = t(
    `showtimeSeats.type.${seat.type.toLowerCase()}`,
  )

  return (
    <button
      aria-label={`${seat.row}${seat.number}, ${typeLabel}, ${statusLabel}`}
      aria-pressed={isSelected}
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition ${getSeatClasses(
        seat,
        isSelected,
      )}`}
      disabled={!isAvailable}
      onClick={() => onToggle(seat)}
      title={`${seat.row}${seat.number} — ${typeLabel} — ${statusLabel}`}
      type="button"
    >
      {seat.number}

      {seat.type === 'ACCESSIBLE' &&
        seat.status === 'AVAILABLE' &&
        !isSelected && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-cyan-500 bg-white text-[8px] font-black text-cyan-800 shadow-sm dark:bg-zinc-950 dark:text-cyan-200"
          >
            A
          </span>
        )}
    </button>
  )
}

export function ShowtimeSeatsPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()

  const {
    accessToken,
    isAuthenticated,
    isRestoring,
  } = useAuth()

  const showtimeId = Number(id)

  const hasValidId =
    Number.isInteger(showtimeId) &&
    showtimeId > 0

  const [showtime, setShowtime] =
    useState<ShowtimeSummary | null>(null)

  const [seats, setSeats] =
    useState<ShowtimeSeat[]>([])

  const [selectedSeatIds, setSelectedSeatIds] =
    useState<number[]>([])

  const [hold, setHold] =
    useState<SeatHold | null>(null)

  const [booking, setBooking] =
    useState<Booking | null>(null)

  const [remainingHoldMs, setRemainingHoldMs] =
    useState(0)

  const [isLoading, setIsLoading] =
    useState(hasValidId)

  const [hasError, setHasError] =
    useState(!hasValidId)

  const [holdError, setHoldError] =
    useState<string | null>(null)

  const [bookingError, setBookingError] =
    useState<string | null>(null)

  const [isCreatingHold, setIsCreatingHold] =
    useState(false)

  const [isConfirmingBooking, setIsConfirmingBooking] =
    useState(false)

  const [reloadKey, setReloadKey] =
    useState(0)


      const handleRealtimeSeatStatusChanged =
    useCallback(
      (event: SeatStatusChangedEvent) => {
        const changedSeatIds =
          new Set(event.seatIds)

        setSeats((currentSeats) =>
          currentSeats.map((seat) => {
            if (
              !changedSeatIds.has(
                seat.seatId,
              )
            ) {
              return seat
            }

            if (
              seat.status ===
              event.status
            ) {
              return seat
            }

            return {
              ...seat,
              status: event.status,
            }
          }),
        )

        if (
          event.status !== 'AVAILABLE'
        ) {
          setSelectedSeatIds(
            (currentSeatIds) =>
              currentSeatIds.filter(
                (seatId) =>
                  !changedSeatIds.has(
                    seatId,
                  ),
              ),
          )
        }
      },
      [],
    )

  useShowtimeRealtime({
    showtimeId,
    isEnabled: hasValidId,
    onSeatStatusChanged:
      handleRealtimeSeatStatusChanged,
  })

  useEffect(() => {
    if (!hasValidId) {
      return
    }

    let isCancelled = false

    async function loadShowtime() {
      try {
        const [
          showtimeResult,
          seatsResult,
        ] = await Promise.all([
          getShowtime(showtimeId),
          getShowtimeSeats(showtimeId),
        ])

        if (isCancelled) {
          return
        }

        setShowtime(showtimeResult)
        setSeats(seatsResult)
        setSelectedSeatIds([])
        setHasError(false)
      } catch {
        if (isCancelled) {
          return
        }

        setHasError(true)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadShowtime()

    return () => {
      isCancelled = true
    }
  }, [
    hasValidId,
    reloadKey,
    showtimeId,
  ])

  useEffect(() => {
    if (!hold || booking) {
      return
    }

    const expiresAt = hold.expiresAt

    function updateRemainingTime() {
      const remaining =
        new Date(expiresAt).getTime() -
        Date.now()

      setRemainingHoldMs(
        Math.max(0, remaining),
      )
    }

    updateRemainingTime()

    const intervalId =
      window.setInterval(
        updateRemainingTime,
        1000,
      )

    return () => {
      window.clearInterval(intervalId)
    }
  }, [booking, hold])

  const seatsByRow = useMemo(() => {
    const rows = new Map<
      string,
      ShowtimeSeat[]
    >()

    for (const seat of seats) {
      const rowSeats =
        rows.get(seat.row) ?? []

      rowSeats.push(seat)

      rows.set(
        seat.row,
        rowSeats,
      )
    }

    return Array.from(
      rows.entries(),
    ).map(
      ([row, rowSeats]) => ({
        row,
        seats: [...rowSeats].sort(
          (left, right) =>
            left.number -
            right.number,
        ),
      }),
    )
  }, [seats])

  const selectedSeats = useMemo(
    () =>
      seats.filter((seat) =>
        selectedSeatIds.includes(
          seat.seatId,
        ),
      ),
    [seats, selectedSeatIds],
  )

    const availableSeatCount =
    useMemo(
      () =>
        seats.filter(
          (seat) =>
            seat.status === 'AVAILABLE',
        ).length,
      [seats],
    )

  const bookingSeats = useMemo(() => {
    if (!booking) {
      return []
    }

    return seats
      .filter((seat) =>
        booking.seatIds.includes(
          seat.seatId,
        ),
      )
      .sort((left, right) => {
        const rowDifference =
          left.row.localeCompare(
            right.row,
          )

        if (rowDifference !== 0) {
          return rowDifference
        }

        return (
          left.number -
          right.number
        )
      })
  }, [booking, seats])

  const hasActiveHold =
    hold !== null &&
    booking === null &&
    remainingHoldMs > 0

  const hasExpiredHold =
    hold !== null &&
    booking === null &&
    remainingHoldMs <= 0

  const isSelectionDisabled =
    hold !== null || booking !== null

  function handleSeatToggle(
    seat: ShowtimeSeat,
  ) {
    if (
      seat.status !== 'AVAILABLE' ||
      isSelectionDisabled
    ) {
      return
    }

    setHoldError(null)

    setSelectedSeatIds(
      (currentSeatIds) => {
        if (
          currentSeatIds.includes(
            seat.seatId,
          )
        ) {
          return currentSeatIds.filter(
            (seatId) =>
              seatId !==
              seat.seatId,
          )
        }

        return [
          ...currentSeatIds,
          seat.seatId,
        ]
      },
    )
  }

  function handleRetry() {
    if (!hasValidId) {
      return
    }

    setIsLoading(true)
    setHasError(false)
    setHoldError(null)
    setBookingError(null)

    setReloadKey(
      (current) => current + 1,
    )
  }

  function handleRefreshAfterExpiry() {
    setHold(null)
    setBooking(null)
    setRemainingHoldMs(0)
    setHoldError(null)
    setBookingError(null)
    setIsLoading(true)

    setReloadKey(
      (current) => current + 1,
    )
  }

  async function handleCreateHold() {
    if (
      !accessToken ||
      selectedSeatIds.length === 0 ||
      hold
    ) {
      return
    }

    setIsCreatingHold(true)
    setHoldError(null)
    setBookingError(null)

    try {
      const createdHold =
        await createHold(
          showtimeId,
          {
            seatIds:
              selectedSeatIds,
          },
          accessToken,
        )

      setHold(createdHold)

      setRemainingHoldMs(
        Math.max(
          0,
          new Date(
            createdHold.expiresAt,
          ).getTime() -
            Date.now(),
        ),
      )

      setSeats(
        (currentSeats) =>
          currentSeats.map(
            (seat) =>
              createdHold.seatIds.includes(
                seat.seatId,
              )
                ? {
                    ...seat,
                    status:
                      'HELD',
                  }
                : seat,
          ),
      )


      setSelectedSeatIds([])
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setHoldError(
          t(
            'showtimeSeats.hold.conflict',
          ),
        )
      } else if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        setHoldError(
          t(
            'showtimeSeats.hold.sessionExpired',
          ),
        )
      } else {
        setHoldError(
          t(
            'showtimeSeats.hold.genericError',
          ),
        )
      }
    } finally {
      setIsCreatingHold(false)
    }
  }

  async function handleConfirmBooking() {
    if (
      !accessToken ||
      !hold ||
      remainingHoldMs <= 0 ||
      booking
    ) {
      return
    }

    setIsConfirmingBooking(true)
    setBookingError(null)

    try {
      const confirmedBooking =
        await confirmBooking(
          hold.id,
          accessToken,
        )

      setBooking(confirmedBooking)

      setSeats(
        (currentSeats) =>
          currentSeats.map(
            (seat) =>
              confirmedBooking.seatIds.includes(
                seat.seatId,
              )
                ? {
                    ...seat,
                    status:
                      'BOOKED',
                  }
                : seat,
          ),
      )
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setBookingError(
          t(
            'showtimeSeats.booking.expired',
          ),
        )
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setBookingError(
          t(
            'showtimeSeats.booking.notFound',
          ),
        )
      } else if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        setBookingError(
          t(
            'showtimeSeats.booking.sessionExpired',
          ),
        )
      } else {
        setBookingError(
          t(
            'showtimeSeats.booking.genericError',
          ),
        )
      }
    } finally {
      setIsConfirmingBooking(false)
    }
  }

  const formattedShowtime =
    showtime
      ? formatShowtime(
          showtime.startsAt,
          i18n.resolvedLanguage ??
            i18n.language,
        )
      : null

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-bold text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
          to="/showtimes"
        >
          ←{' '}
          {t(
            'showtimeSeats.backToShowtimes',
          )}
        </Link>

        {isLoading && (
          <div
            className="mt-8 space-y-6"
            aria-label={t(
              'showtimeSeats.loading',
            )}
          >
            <div className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />

            <div className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        )}

        {!isLoading &&
          hasError && (
            <div
              className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-950 dark:bg-red-950/30"
              role="alert"
            >
              <h1 className="text-xl font-black text-red-900 dark:text-red-200">
                {t(
                  'showtimeSeats.errorTitle',
                )}
              </h1>

              <p className="mt-2 leading-7 text-red-700 dark:text-red-300">
                {t(
                  'showtimeSeats.loadError',
                )}
              </p>

              {hasValidId && (
                <button
                  className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
                  onClick={
                    handleRetry
                  }
                  type="button"
                >
                  {t(
                    'showtimeSeats.retry',
                  )}
                </button>
              )}
            </div>
          )}

        {!isLoading &&
          !hasError &&
          showtime &&
          formattedShowtime && (
            <>
              <header className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-extrabold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
                  {showtime.venue.city}
                </p>

                <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
                      {showtime.title}
                    </h1>

                    <p className="mt-2 font-semibold text-zinc-700 dark:text-zinc-300">
                      {
                        showtime.venue
                          .name
                      }
                    </p>

                    {showtime
                      .venue
                      .address && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {
                          showtime
                            .venue
                            .address
                        }
                      </p>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
                    <div>
                      <dt className="font-bold text-zinc-500">
                        {t(
                          'showtimeSeats.date',
                        )}
                      </dt>
                      <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                        {
                          formattedShowtime.date
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-bold text-zinc-500">
                        {t(
                          'showtimeSeats.time',
                        )}
                      </dt>
                      <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                        {
                          formattedShowtime.time
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-bold text-zinc-500">
                        {t(
                          'showtimeSeats.screen',
                        )}
                      </dt>
                      <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                        {
                          showtime.screen
                            .name
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="font-bold text-zinc-500">
                        {t(
                          'showtimeSeats.available',
                        )}
                      </dt>
                      <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                        {
                          availableSeatCount
                        }
                      </dd>
                    </div>
                  </dl>
                </div>
              </header>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                      <p className="text-xs font-extrabold tracking-[0.18em] text-zinc-500 uppercase">
                        {t(
                          'showtimeSeats.screen',
                        )}
                      </p>

                      <div
                        className="mx-auto mt-3 h-2 w-full max-w-xl rounded-[50%] bg-zinc-300 shadow-[0_8px_25px_rgba(0,0,0,0.12)] dark:bg-zinc-700"
                        aria-hidden="true"
                      />

                      <p className="mt-3 text-xs text-zinc-500">
                        {t(
                          'showtimeSeats.screenDirection',
                        )}
                      </p>
                    </div>

                    <div className="mt-10 overflow-x-auto pb-3">
                      <div className="mx-auto w-max min-w-full space-y-4">
                        {seatsByRow.map(
                          ({
                            row,
                            seats:
                              rowSeats,
                          }) => (
                            <div
                              className="flex min-w-max items-center justify-center gap-3"
                              key={row}
                            >
                              <span className="w-7 shrink-0 text-center text-sm font-black text-zinc-500">
                                {row}
                              </span>

                              <div className="flex gap-2">
                                {rowSeats.map(
                                  (
                                    seat,
                                  ) => (
                                    <Seat
                                      isSelected={selectedSeatIds.includes(
                                        seat.seatId,
                                      )}
                                      isSelectionDisabled={
                                        isSelectionDisabled
                                      }
                                      key={
                                        seat.id
                                      }
                                      onToggle={
                                        handleSeatToggle
                                      }
                                      seat={
                                        seat
                                      }
                                    />
                                  ),
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {seats.length ===
                      0 && (
                      <p className="mt-10 text-center leading-7 text-zinc-600 dark:text-zinc-400">
                        {t(
                          'showtimeSeats.empty',
                        )}
                      </p>
                    )}

                    <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                      <div>
                        <p className="text-center text-xs font-extrabold tracking-[0.14em] text-zinc-500 uppercase">
                          {t(
                            'showtimeSeats.legend.seatTypes',
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.type.standard',
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/50" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.type.premium',
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="relative size-4 rounded border border-cyan-400 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/50">
                              <span className="absolute -top-1.5 -right-1.5 flex size-3 items-center justify-center rounded-full bg-cyan-600 text-[7px] font-black text-white">
                                A
                              </span>
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.type.accessible',
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <p className="text-center text-xs font-extrabold tracking-[0.14em] text-zinc-500 uppercase">
                          {t(
                            'showtimeSeats.legend.seatStatus',
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.status.available',
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-blue-600 bg-blue-600" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.status.selected',
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.status.held',
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="size-4 rounded border border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {t(
                                'showtimeSeats.status.booked',
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white">
                    {booking
                      ? t(
                          'showtimeSeats.booking.title',
                        )
                      : t(
                          'showtimeSeats.selection.title',
                        )}
                  </h2>

                  {booking && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                      <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                        {t(
                          'showtimeSeats.booking.success',
                        )}
                      </p>

                      <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                        {t(
                          'showtimeSeats.booking.number',
                          {
                            id:
                              booking.id,
                          },
                        )}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {bookingSeats.map(
                          (seat) => (
                            <span
                              className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                              key={
                                seat.seatId
                              }
                            >
                              {
                                seat.row
                              }
                              {
                                seat.number
                              }
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {hasActiveHold && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                        {t(
                          'showtimeSeats.hold.active',
                        )}
                      </p>

                      <p className="mt-2 text-3xl font-black tabular-nums text-blue-700 dark:text-blue-300">
                        {formatRemainingTime(
                          remainingHoldMs,
                        )}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-blue-700 dark:text-blue-300">
                        {t(
                          'showtimeSeats.hold.expiresDescription',
                        )}
                      </p>
                    </div>
                  )}

                  {hasExpiredHold && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        {t(
                          'showtimeSeats.hold.expired',
                        )}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-700 dark:text-amber-300">
                        {t(
                          'showtimeSeats.hold.expiredDescription',
                        )}
                      </p>

                      <button
                        className="mt-4 min-h-11 w-full rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
                        onClick={
                          handleRefreshAfterExpiry
                        }
                        type="button"
                      >
                        {t(
                          'showtimeSeats.hold.refreshSeats',
                        )}
                      </button>
                    </div>
                  )}

                  {!hold &&
                    !booking &&
                    selectedSeats.length >
                      0 && (
                      <div className="mt-5">
                        <p className="text-sm font-bold text-zinc-500">
                          {t(
                            'showtimeSeats.selection.selected',
                            {
                              count:
                                selectedSeats.length,
                            },
                          )}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedSeats.map(
                            (seat) => (
                              <span
                                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                                key={
                                  seat.seatId
                                }
                              >
                                {
                                  seat.row
                                }
                                {
                                  seat.number
                                }
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {!hold &&
                    !booking &&
                    selectedSeats.length ===
                      0 && (
                      <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {t(
                          'showtimeSeats.selection.empty',
                        )}
                      </p>
                    )}

                  {holdError && (
                    <div
                      className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
                      role="alert"
                    >
                      {holdError}
                    </div>
                  )}

                  {bookingError && (
                    <div
                      className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
                      role="alert"
                    >
                      {bookingError}
                    </div>
                  )}

                  {!hold &&
                    !booking &&
                    !isRestoring &&
                    !isAuthenticated && (
                      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {t(
                            'showtimeSeats.hold.signInRequired',
                          )}
                        </p>

                        <Link
                          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                          to="/login"
                        >
                          {t(
                            'showtimeSeats.hold.signIn',
                          )}
                        </Link>
                      </div>
                    )}

                  {!hold &&
                    !booking &&
                    !isRestoring &&
                    isAuthenticated && (
                      <button
                        className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                        disabled={
                          selectedSeatIds.length ===
                            0 ||
                          isCreatingHold
                        }
                        onClick={() =>
                          void handleCreateHold()
                        }
                        type="button"
                      >
                        {isCreatingHold
                          ? t(
                              'showtimeSeats.hold.creating',
                            )
                          : t(
                              'showtimeSeats.hold.create',
                            )}
                      </button>
                    )}

                  {hasActiveHold &&
                    isAuthenticated && (
                      <button
                        className="mt-6 min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                        disabled={
                          isConfirmingBooking
                        }
                        onClick={() =>
                          void handleConfirmBooking()
                        }
                        type="button"
                      >
                        {isConfirmingBooking
                          ? t(
                              'showtimeSeats.booking.confirming',
                            )
                          : t(
                              'showtimeSeats.booking.confirm',
                            )}
                      </button>
                    )}
                </aside>
              </div>
            </>
          )}
      </section>
    </main>
  )
}
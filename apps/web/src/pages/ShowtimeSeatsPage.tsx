import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import {
  getShowtime,
  getShowtimeSeats,
} from '../services/showtime.service'
import type {
  ShowtimeSeat,
  ShowtimeSummary,
} from '../types/showtime'

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

function getSeatClasses(status: ShowtimeSeat['status']): string {
  if (status === 'AVAILABLE') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
  }

  if (status === 'HELD') {
    return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
  }

  return 'border-zinc-300 bg-zinc-200 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500'
}

function Seat({
  seat,
}: {
  seat: ShowtimeSeat
}) {
  const { t } = useTranslation()

  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${getSeatClasses(
        seat.status,
      )}`}
      title={`${seat.row}${seat.number} — ${t(
        `showtimeSeats.status.${seat.status.toLowerCase()}`,
      )}`}
    >
      {seat.number}
    </div>
  )
}

export function ShowtimeSeatsPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()

  const showtimeId = Number(id)
  const hasValidId = Number.isInteger(showtimeId) && showtimeId > 0

  const [showtime, setShowtime] = useState<ShowtimeSummary | null>(null)
  const [seats, setSeats] = useState<ShowtimeSeat[]>([])
  const [isLoading, setIsLoading] = useState(hasValidId)
  const [hasError, setHasError] = useState(!hasValidId)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!hasValidId) {
      return
    }

    let isCancelled = false

    async function loadShowtime() {
      try {
        const [showtimeResult, seatsResult] = await Promise.all([
          getShowtime(showtimeId),
          getShowtimeSeats(showtimeId),
        ])

        if (isCancelled) {
          return
        }

        setShowtime(showtimeResult)
        setSeats(seatsResult)
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
  }, [hasValidId, reloadKey, showtimeId])

  const seatsByRow = useMemo(() => {
    const rows = new Map<string, ShowtimeSeat[]>()

    for (const seat of seats) {
      const rowSeats = rows.get(seat.row) ?? []
      rowSeats.push(seat)
      rows.set(seat.row, rowSeats)
    }

    return Array.from(rows.entries()).map(([row, rowSeats]) => ({
      row,
      seats: [...rowSeats].sort((left, right) => left.number - right.number),
    }))
  }, [seats])

  function handleRetry() {
    if (!hasValidId) {
      return
    }

    setIsLoading(true)
    setHasError(false)
    setReloadKey((current) => current + 1)
  }

  const formattedShowtime = showtime
    ? formatShowtime(
        showtime.startsAt,
        i18n.resolvedLanguage ?? i18n.language,
      )
    : null

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-bold text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
          to="/showtimes"
        >
          ← {t('showtimeSeats.backToShowtimes')}
        </Link>

        {isLoading && (
          <div
            className="mt-8 space-y-6"
            aria-label={t('showtimeSeats.loading')}
          >
            <div className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />

            <div className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        )}

        {!isLoading && hasError && (
          <div
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-950 dark:bg-red-950/30"
            role="alert"
          >
            <h1 className="text-xl font-black text-red-900 dark:text-red-200">
              {t('showtimeSeats.errorTitle')}
            </h1>

            <p className="mt-2 leading-7 text-red-700 dark:text-red-300">
              {t('showtimeSeats.loadError')}
            </p>

            {hasValidId && (
              <button
                className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
                onClick={handleRetry}
                type="button"
              >
                {t('showtimeSeats.retry')}
              </button>
            )}
          </div>
        )}

        {!isLoading && !hasError && showtime && formattedShowtime && (
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
                    {showtime.venue.name}
                  </p>

                  {showtime.venue.address && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {showtime.venue.address}
                    </p>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
                  <div>
                    <dt className="font-bold text-zinc-500">
                      {t('showtimeSeats.date')}
                    </dt>
                    <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                      {formattedShowtime.date}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold text-zinc-500">
                      {t('showtimeSeats.time')}
                    </dt>
                    <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                      {formattedShowtime.time}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold text-zinc-500">
                      {t('showtimeSeats.screen')}
                    </dt>
                    <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                      {showtime.screen.name}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold text-zinc-500">
                      {t('showtimeSeats.available')}
                    </dt>
                    <dd className="mt-1 font-bold text-zinc-950 dark:text-white">
                      {showtime.availableSeats}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mx-auto max-w-4xl">
                <div className="text-center">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-zinc-500 uppercase">
                    {t('showtimeSeats.screen')}
                  </p>

                  <div
                    className="mx-auto mt-3 h-2 w-full max-w-xl rounded-[50%] bg-zinc-300 shadow-[0_8px_25px_rgba(0,0,0,0.12)] dark:bg-zinc-700"
                    aria-hidden="true"
                  />

                  <p className="mt-3 text-xs text-zinc-500">
                    {t('showtimeSeats.screenDirection')}
                  </p>
                </div>

                <div className="mt-10 overflow-x-auto pb-3">
                  <div className="mx-auto w-max min-w-full space-y-4">
                    {seatsByRow.map(({ row, seats: rowSeats }) => (
                      <div
                        className="flex min-w-max items-center justify-center gap-3"
                        key={row}
                      >
                        <span className="w-7 shrink-0 text-center text-sm font-black text-zinc-500">
                          {row}
                        </span>

                        <div className="flex gap-2">
                          {rowSeats.map((seat) => (
                            <Seat key={seat.id} seat={seat} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {seats.length === 0 && (
                  <p className="mt-10 text-center leading-7 text-zinc-600 dark:text-zinc-400">
                    {t('showtimeSeats.empty')}
                  </p>
                )}

                <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50" />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {t('showtimeSeats.status.available')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50" />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {t('showtimeSeats.status.held')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded border border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800" />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {t('showtimeSeats.status.booked')}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
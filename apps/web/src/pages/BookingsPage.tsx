import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { getMyBookings } from '../services/booking.service'
import type { BookingDetails } from '../types/showtime'

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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

function formatBookedAt(createdAt: string, language: string): string {
  return new Intl.DateTimeFormat(getLocale(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

function BookingCard({
  booking,
  language,
}: {
  booking: BookingDetails
  language: string
}) {
  const { t } = useTranslation()

  const { date, time } = formatShowtime(
    booking.showtime.startsAt,
    language,
  )

  const seatLabels = booking.seats
    .map((seat) => `${seat.row}${seat.number}`)
    .join(', ')

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
            {booking.showtime.venue.city}
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            {booking.showtime.title}
          </h2>

          <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {booking.showtime.venue.name}
          </p>

          {booking.showtime.venue.address && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              {booking.showtime.venue.address}
            </p>
          )}
        </div>

        <div className="shrink-0 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/40">
          <p className="text-sm font-black text-blue-700 dark:text-blue-300">
            {t('bookings.bookingNumber', {
              id: booking.id,
            })}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
            {t('bookings.showtime')}
          </dt>

          <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
            {date}
          </dd>

          <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {time}
          </dd>
        </div>

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
            {t('bookings.screen')}
          </dt>

          <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
            {booking.showtime.screen.name}
          </dd>
        </div>

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
            {t('bookings.seats')}
          </dt>

          <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
            {seatLabels || '—'}
          </dd>
        </div>

        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
          <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
            {t('bookings.bookedOn')}
          </dt>

          <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
            {formatBookedAt(booking.createdAt, language)}
          </dd>
        </div>
      </dl>
    </article>
  )
}

export function BookingsPage() {
  const { t, i18n } = useTranslation()
  const {
    accessToken,
    isAuthenticated,
    isRestoring,
  } = useAuth()

  const [bookings, setBookings] = useState<BookingDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (isRestoring || !isAuthenticated || !accessToken) {
      return
    }

    const token = accessToken
    let isCancelled = false

    async function loadBookings() {
      try {
        const result = await getMyBookings(token)

        if (isCancelled) {
          return
        }

        setBookings(result)
        setError(null)
      } catch {
        if (isCancelled) {
          return
        }

        setError(t('bookings.loadError'))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBookings()

    return () => {
      isCancelled = true
    }
  }, [
    accessToken,
    isAuthenticated,
    isRestoring,
    reloadKey,
    t,
  ])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setReloadKey((current) => current + 1)
  }

  const language =
    i18n.resolvedLanguage ?? i18n.language

  if (isRestoring) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        </section>
      </main>
    )
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
              {t('bookings.signInTitle')}
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-600 dark:text-zinc-400">
              {t('bookings.signInDescription')}
            </p>

            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
              to="/login"
            >
              {t('bookings.signIn')}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold tracking-[0.2em] text-blue-600 uppercase dark:text-blue-400">
            {t('bookings.eyebrow')}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl dark:text-white">
            {t('bookings.title')}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
            {t('bookings.description')}
          </p>
        </div>

        {isLoading && (
          <div
            className="mt-10 space-y-5"
            aria-label={t('bookings.loading')}
          >
            {[0, 1].map((item) => (
              <div
                className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                key={item}
              >
                <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-7 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />

                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((block) => (
                    <div
                      className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-950"
                      key={block}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div
            className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-950 dark:bg-red-950/30"
            role="alert"
          >
            <h2 className="font-bold text-red-900 dark:text-red-200">
              {t('bookings.errorTitle')}
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
              {error}
            </p>

            <button
              className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
              onClick={handleRetry}
              type="button"
            >
              {t('bookings.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && bookings.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-12 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">
              {t('bookings.emptyTitle')}
            </h2>

            <p className="mx-auto mt-2 max-w-lg leading-7 text-zinc-600 dark:text-zinc-400">
              {t('bookings.emptyDescription')}
            </p>

            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
              to="/showtimes"
            >
              {t('bookings.browseShowtimes')}
            </Link>
          </div>
        )}

        {!isLoading && !error && bookings.length > 0 && (
          <div className="mt-10 space-y-5">
            {bookings.map((booking) => (
              <BookingCard
                booking={booking}
                key={booking.id}
                language={language}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getShowtimes } from '../services/showtime.service'
import type { ShowtimeSummary } from '../types/showtime'

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
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

function ShowtimeCard({
  showtime,
  language,
}: {
  showtime: ShowtimeSummary
  language: string
}) {
  const { t } = useTranslation()
  const { date, time } = formatShowtime(showtime.startsAt, language)

  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800">
      <div className="flex flex-1 flex-col">
        <div>
          <p className="text-xs font-extrabold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
            {showtime.venue.city}
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            {showtime.title}
          </h2>

          <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {showtime.venue.name}
          </p>

          {showtime.venue.address && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              {showtime.venue.address}
            </p>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
            <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
              {t('showtimes.date')}
            </dt>
            <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
              {date}
            </dd>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
            <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
              {t('showtimes.time')}
            </dt>
            <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
              {time}
            </dd>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
            <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
              {t('showtimes.screen')}
            </dt>
            <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
              {showtime.screen.name}
            </dd>
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
            <dt className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
              {t('showtimes.availability')}
            </dt>
            <dd className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
              {t('showtimes.seatsAvailable', {
                count: showtime.availableSeats,
              })}
            </dd>
          </div>
        </dl>
      </div>

      <Link
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        to={`/showtimes/${showtime.id}`}
      >
        {t('showtimes.viewSeats')}
      </Link>
    </article>
  )
}

export function ShowtimesPage() {
  const { t, i18n } = useTranslation()

  const [showtimes, setShowtimes] = useState<ShowtimeSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isCancelled = false

    async function loadShowtimes() {
      try {
        const result = await getShowtimes()

        if (isCancelled) {
          return
        }

        setShowtimes(result)
        setError(null)
      } catch {
        if (isCancelled) {
          return
        }

        setError(t('showtimes.loadError'))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadShowtimes()

    return () => {
      isCancelled = true
    }
  }, [reloadKey, t])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setReloadKey((current) => current + 1)
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-50 dark:bg-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold tracking-[0.2em] text-blue-600 uppercase dark:text-blue-400">
            {t('showtimes.eyebrow')}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-zinc-950 sm:text-5xl dark:text-white">
            {t('showtimes.title')}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
            {t('showtimes.description')}
          </p>
        </div>

        {isLoading && (
          <div
            className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            aria-label={t('showtimes.loading')}
          >
            {[0, 1, 2].map((item) => (
              <div
                className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                key={item}
              >
                <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-7 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((block) => (
                    <div
                      className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-950"
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
              {t('showtimes.errorTitle')}
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
              {error}
            </p>

            <button
              className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
              onClick={handleRetry}
              type="button"
            >
              {t('showtimes.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && showtimes.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-12 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">
              {t('showtimes.emptyTitle')}
            </h2>

            <p className="mx-auto mt-2 max-w-lg leading-7 text-zinc-600 dark:text-zinc-400">
              {t('showtimes.emptyDescription')}
            </p>
          </div>
        )}

        {!isLoading && !error && showtimes.length > 0 && (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {showtimes.map((showtime) => (
              <ShowtimeCard
                key={showtime.id}
                showtime={showtime}
                language={i18n.resolvedLanguage ?? i18n.language}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
import {
  type FormEvent,
  useEffect,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  createAdminShowtime,
  deleteAdminShowtime,
  getAdminShowtimes,
  updateAdminShowtime,
} from '../../services/admin-showtimes.service'
import type { AdminShowtime } from '../../types/admin-showtime'

type ShowtimeManagementProps = {
  screenId: number
  screenName: string
  accessToken: string
  onBack: () => void
}

type ShowtimeForm = {
  title: string
  startsAt: string
}

const EMPTY_FORM: ShowtimeForm = {
  title: '',
  startsAt: '',
}

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

function formatStartsAt(value: string, language: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const locale =
    DATE_LOCALES[language.split('-')[0]] ?? DATE_LOCALES.en

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function ShowtimeManagement({
  screenId,
  screenName,
  accessToken,
  onBack,
}: ShowtimeManagementProps) {
  const { t, i18n } = useTranslation()

  const [showtimes, setShowtimes] = useState<AdminShowtime[]>([])
  const [form, setForm] = useState<ShowtimeForm>(EMPTY_FORM)
  const [editingShowtime, setEditingShowtime] =
    useState<AdminShowtime | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchShowtimes() {
      try {
        const result = await getAdminShowtimes(screenId)

        if (!cancelled) {
          setShowtimes(result)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t('admin.showtimes.loadError'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchShowtimes()

    return () => {
      cancelled = true
    }
  }, [screenId, t])

  function resetForm() {
    setEditingShowtime(null)
    setForm(EMPTY_FORM)
  }

  function startEditing(showtime: AdminShowtime) {
    setEditingShowtime(showtime)
    setForm({
      title: showtime.title,
      startsAt: toDateTimeLocal(showtime.startsAt),
    })
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = form.title.trim()

    if (!title || !form.startsAt) {
      setError(t('admin.showtimes.required'))
      return
    }

    const startsAt = new Date(form.startsAt)

    if (Number.isNaN(startsAt.getTime())) {
      setError(t('admin.showtimes.invalidStartTime'))
      return
    }

    try {
      setError(null)
      setIsSaving(true)

      const input = {
        title,
        startsAt: startsAt.toISOString(),
      }

      if (editingShowtime) {
        const updated = await updateAdminShowtime(
          editingShowtime.id,
          input,
          accessToken,
        )

        setShowtimes((current) =>
          current.map((showtime) =>
            showtime.id === updated.id ? updated : showtime,
          ),
        )
      } else {
        const created = await createAdminShowtime(
          screenId,
          input,
          accessToken,
        )

        setShowtimes((current) => [...current, created])
      }

      resetForm()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.showtimes.saveError'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(showtime: AdminShowtime) {
    const confirmed = window.confirm(
      t('admin.showtimes.deleteConfirm', {
        title: showtime.title,
      }),
    )

    if (!confirmed) {
      return
    }

    try {
      setError(null)
      setDeletingId(showtime.id)

      await deleteAdminShowtime(showtime.id, accessToken)

      setShowtimes((current) =>
        current.filter((item) => item.id !== showtime.id),
      )

      if (editingShowtime?.id === showtime.id) {
        resetForm()
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t('admin.showtimes.deleteError'),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 text-sm font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400"
      >
        &larr; {t('admin.showtimes.back')}
      </button>

      <div className="mb-8">
        <p className="mb-2 text-sm font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          {t('admin.showtimes.administration')}
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          {t('admin.showtimes.heading')}
        </h1>

        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {t('admin.showtimes.manageFor')}{' '}
          <span className="font-semibold text-zinc-950 dark:text-white">
            {screenName}
          </span>
          .
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                {t('admin.showtimes.listHeading')}
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t('admin.showtimes.count', {
                  count: showtimes.length,
                })}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t('admin.showtimes.loading')}
            </div>
          ) : showtimes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <h3 className="font-bold text-zinc-950 dark:text-white">
                {t('admin.showtimes.emptyTitle')}
              </h3>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('admin.showtimes.emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {showtimes.map((showtime) => (
                <article
                  key={showtime.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                    {showtime.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {formatStartsAt(
                      showtime.startsAt,
                      i18n.resolvedLanguage ?? i18n.language,
                    )}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(showtime)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {t('admin.common.edit')}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(showtime)}
                      disabled={deletingId === showtime.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {deletingId === showtime.id
                        ? t('admin.common.deleting')
                        : t('admin.common.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-24"
          >
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
              {editingShowtime
                ? t('admin.showtimes.edit')
                : t('admin.showtimes.add')}
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {editingShowtime
                ? t('admin.showtimes.editing', {
                    title: editingShowtime.title,
                  })
                : t('admin.showtimes.scheduleFor', {
                    screen: screenName,
                  })}
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('admin.showtimes.title')}
                </span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={200}
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('admin.showtimes.startsAt')}
                </span>

                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? t('admin.common.saving')
                  : editingShowtime
                    ? t('admin.common.saveChanges')
                    : t('admin.showtimes.create')}
              </button>

              {editingShowtime && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t('admin.common.cancel')}
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </main>
  )
}
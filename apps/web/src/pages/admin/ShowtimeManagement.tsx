import {
  type FormEvent,
  
  useEffect,
  useState,
} from 'react'

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

function toDateTimeLocal(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

function formatStartsAt(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
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
              : 'Unable to load showtimes.',
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
  }, [screenId])

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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = form.title.trim()

    if (!title || !form.startsAt) {
      setError('Title and start time are required.')
      return
    }

    const startsAt = new Date(form.startsAt)

    if (Number.isNaN(startsAt.getTime())) {
      setError('Enter a valid start time.')
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
          : 'Unable to save showtime.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(showtime: AdminShowtime) {
    const confirmed = window.confirm(
      `Delete "${showtime.title}"? This action cannot be undone.`,
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
          : 'Unable to delete showtime.',
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
         &larr; Back
      </button>

      <div className="mb-8">
        <p className="mb-2 text-sm font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          Administration
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          Showtime Management
        </h1>

        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Manage showtimes for{' '}
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
                Showtimes
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {showtimes.length}{' '}
                {showtimes.length === 1 ? 'showtime' : 'showtimes'}
              </p>
            </div>

            {/* <button
              type="button"
              onClick={() => void loadShowtimes()}
              disabled={isLoading}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Refresh
            </button> */}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Loading showtimes...
            </div>
          ) : showtimes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <h3 className="font-bold text-zinc-950 dark:text-white">
                No showtimes yet
              </h3>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Schedule the first showtime for this screen.
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
                    {formatStartsAt(showtime.startsAt)}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(showtime)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(showtime)}
                      disabled={deletingId === showtime.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {deletingId === showtime.id
                        ? 'Deleting...'
                        : 'Delete'}
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
              {editingShowtime ? 'Edit showtime' : 'Add showtime'}
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {editingShowtime
                ? `Editing ${editingShowtime.title}`
                : `Schedule a showtime for ${screenName}.`}
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Title
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
                  Starts at
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
                  ? 'Saving...'
                  : editingShowtime
                    ? 'Save changes'
                    : 'Create showtime'}
              </button>

              {editingShowtime && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </main>
  )
}
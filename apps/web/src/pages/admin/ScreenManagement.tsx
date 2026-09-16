import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  createScreen,
  deleteScreen,
  getScreens,
  updateScreen,
} from '../../services/screens.service'
import type { Screen } from '../../types/screen'
import { SeatManagement } from './SeatManagement'
import { ShowtimeManagement } from './ShowtimeManagement'

type ScreenManagementProps = {
  venueId: number
  venueName: string
  accessToken: string
  onBack: () => void
}

export function ScreenManagement({
  venueId,
  venueName,
  accessToken,
  onBack,
}: ScreenManagementProps) {
  const [screens, setScreens] = useState<Screen[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
const [deleteError, setDeleteError] = useState<{
  screenId: number
  message: string
} | null>(null)
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null)
  const [showtimeScreen, setShowtimeScreen] = useState<Screen | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchScreens() {
      try {
        const result = await getScreens(venueId)

        if (!cancelled) {
          setScreens(result)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load screens.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchScreens()

    return () => {
      cancelled = true
    }
  }, [venueId])

  function resetForm() {
    setName('')
    setEditingId(null)
  }

function startEditing(screen: Screen) {
  setEditingId(screen.id)
  setName(screen.name)
  setError(null)
  setDeleteError(null)
}

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Screen name is required.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      if (editingId === null) {
        const created = await createScreen(
          venueId,
          { name: trimmedName },
          accessToken,
        )

        setScreens((current) => [...current, created])
      } else {
        const updated = await updateScreen(
          editingId,
          { name: trimmedName },
          accessToken,
        )

        setScreens((current) =>
          current.map((screen) =>
            screen.id === updated.id ? updated : screen,
          ),
        )
      }

      resetForm()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save screen.',
      )
    } finally {
      setIsSaving(false)
    }
  }

 async function handleDelete(screen: Screen) {
  const confirmed = window.confirm(
    `Delete "${screen.name}"? This action cannot be undone.`,
  )

  if (!confirmed) {
    return
  }

  try {
    setError(null)
    setDeleteError(null)
    setDeletingId(screen.id)

    await deleteScreen(screen.id, accessToken)

    setScreens((current) =>
      current.filter((item) => item.id !== screen.id),
    )

    if (editingId === screen.id) {
      resetForm()
    }
  } catch (deleteError) {
    let message = 'Unable to delete screen.'

    if (deleteError instanceof ApiError) {
      if (deleteError.status === 409) {
        message =
          'This screen still contains seats or showtimes. Remove its showtimes and seats before deleting the screen.'
      } else if (deleteError.status === 401) {
        message = 'Your session has expired. Please sign in again.'
      } else if (deleteError.status === 403) {
        message = 'Administrator access is required to delete screens.'
      } else {
        message = deleteError.message
      }
    } else if (deleteError instanceof Error) {
      message = deleteError.message
    }

    setDeleteError({
      screenId: screen.id,
      message,
    })
  } finally {
    setDeletingId(null)
  }
}


  if (selectedScreen) {
  return (
    <SeatManagement
      screenId={selectedScreen.id}
      screenName={selectedScreen.name}
      venueName={venueName}
      accessToken={accessToken}
      onBack={() => setSelectedScreen(null)}
    />
  )
}


if (showtimeScreen) {
  return (
    <ShowtimeManagement
      screenId={showtimeScreen.id}
      screenName={showtimeScreen.name}
      accessToken={accessToken}
      onBack={() => setShowtimeScreen(null)}
    />
  )
}

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400"
      >
        ← Back to venues
      </button>

      <div className="mt-5">
        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
          Screen management
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
          {venueName}
        </h2>

        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Configure the screens available at this venue.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3 className="font-bold text-zinc-950 dark:text-white">
          {editingId === null ? 'Add screen' : 'Edit screen'}
        </h3>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Screen name
          </span>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            placeholder="Screen 1"
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </label>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'Saving…'
              : editingId === null
                ? 'Add screen'
                : 'Save changes'}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-300 px-5 py-3 font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-zinc-500">Loading screens…</p>
        ) : screens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="font-bold text-zinc-950 dark:text-white">
              No screens yet
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Add the first screen for this venue above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {screens.map((screen) => (
              <article
                key={screen.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                  Screen #{screen.id}
                </p>

                <h3 className="mt-2 text-xl font-black text-zinc-950 dark:text-white">
                  {screen.name}
                </h3>

                {deleteError?.screenId === screen.id && (
                <div
                    role="alert"
                    className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                >
                    {deleteError.message}
                </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(screen)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>

                 <button
                        type="button"
                        onClick={() => void handleDelete(screen)}
                        disabled={deletingId === screen.id}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                        {deletingId === screen.id ? 'Deleting...' : 'Delete'}
                        </button>
                  <button
                        type="button"
                        onClick={() => {
                            setDeleteError(null)
                            setSelectedScreen(screen)
                            }}
                            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                        Manage seats
                        </button>

                        <button
                            type="button"
                           onClick={() => {
                            setDeleteError(null)
                            setShowtimeScreen(screen)
                            }}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
                            >
                            Manage showtimes
                            </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
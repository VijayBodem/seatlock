import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../services/api'
import {
  createVenue,
  deleteVenue,
  getVenues,
  updateVenue,
} from '../../services/venues.service'
import type { Venue } from '../../types/venue'
import { ScreenManagement } from './ScreenManagement'

type VenueForm = {
  name: string
  city: string
  address: string
}

const EMPTY_FORM: VenueForm = {
  name: '',
  city: '',
  address: '',
}

export function AdminPage() {
  const { accessToken } = useAuth()
  const { t } = useTranslation()

  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState<VenueForm>(EMPTY_FORM)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{
    venueId: number
    message: string
  } | null>(null)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  const loadVenues = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)

      const result = await getVenues()
      setVenues(result)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t('admin.venues.loadError'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

useEffect(() => {
  let cancelled = false

  async function fetchVenues() {
    try {
      const result = await getVenues()

      if (!cancelled) {
        setVenues(result)
      }
    } catch (loadError) {
      if (!cancelled) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t('admin.venues.loadError'),
        )
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false)
      }
    }
  }

  void fetchVenues()

  return () => {
    cancelled = true
  }
}, [t])

  function resetForm() {
    setEditingVenue(null)
    setForm(EMPTY_FORM)
  }

  function startEditing(venue: Venue) {
    setEditingVenue(venue)
    setForm({
      name: venue.name,
      city: venue.city,
      address: venue.address ?? '',
    })
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      setError(t('admin.venues.sessionUnavailable'))
      return
    }

    const name = form.name.trim()
    const city = form.city.trim()
    const address = form.address.trim()

    if (!name || !city) {
      setError(t('admin.venues.nameCityRequired'))
      return
    }

    try {
      setError(null)
      setIsSaving(true)

      const input = {
        name,
        city,
        address,
      }

      if (editingVenue) {
        const updated = await updateVenue(
          editingVenue.id,
          input,
          accessToken,
        )

        setVenues((current) =>
          current.map((venue) =>
            venue.id === updated.id ? updated : venue,
          ),
        )
      } else {
        const created = await createVenue(input, accessToken)

        setVenues((current) => [...current, created])
      }

      resetForm()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t('admin.venues.saveError'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(venue: Venue) {
    if (!accessToken) {
      setError(t('admin.venues.sessionUnavailable'))
      return
    }

    const confirmed = window.confirm(
      t('admin.venues.deleteConfirm', {
        name: venue.name,
      }),
    )

    if (!confirmed) {
      return
    }

    try {
      setError(null)
      setDeleteError(null)
      setDeletingId(venue.id)

      await deleteVenue(venue.id, accessToken)

      setVenues((current) =>
        current.filter((item) => item.id !== venue.id),
      )

      if (editingVenue?.id === venue.id) {
        resetForm()
      }
    } catch (deleteError) {
      let message = t('admin.venues.deleteError')

      if (deleteError instanceof ApiError) {
        if (deleteError.status === 409) {
          message = t('admin.venues.deleteHasScreens')
        } else if (deleteError.status === 401) {
          message = t('admin.venues.sessionExpired')
        } else if (deleteError.status === 403) {
          message = t('admin.venues.adminRequired')
        } else {
          message = deleteError.message
        }
      } else if (deleteError instanceof Error) {
        message = deleteError.message
      }

      setDeleteError({
        venueId: venue.id,
        message,
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (selectedVenue && accessToken) {
    return (
      <ScreenManagement
        venueId={selectedVenue.id}
        venueName={selectedVenue.name}
        accessToken={accessToken}
        onBack={() => setSelectedVenue(null)}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          {t('admin.venues.administration')}
        </p>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          {t('admin.venues.heading')}
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          {t('admin.venues.description')}
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
                {t('admin.venues.listHeading')}
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t('admin.venues.count', {
                  count: venues.length,
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadVenues()}
              disabled={isLoading}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t('admin.venues.refresh')}
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {t('admin.venues.loading')}
            </div>
          ) : venues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <h3 className="font-bold text-zinc-950 dark:text-white">
                {t('admin.venues.emptyTitle')}
              </h3>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('admin.venues.emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {venues.map((venue) => (
                <article
                  key={venue.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                    {venue.name}
                  </h3>

                  <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {venue.city}
                  </p>

                  <p className="mt-3 min-h-10 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                    {venue.address ||
                      t('admin.venues.noAddress')}
                  </p>

                  {deleteError?.venueId === venue.id && (
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
                      onClick={() => {
                        setDeleteError(null)
                        setSelectedVenue(venue)
                      }}
                      className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      {t('admin.venues.manageScreens')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null)
                        startEditing(venue)
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {t('admin.common.edit')}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(venue)}
                      disabled={deletingId === venue.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {deletingId === venue.id
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
              {editingVenue
                ? t('admin.venues.edit')
                : t('admin.venues.add')}
            </h2>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {editingVenue
                ? t('admin.venues.editing', {
                    name: editingVenue.name,
                  })
                : t('admin.venues.addDescription')}
            </p>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('admin.venues.name')}
                </span>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  maxLength={120}
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('admin.venues.city')}
                </span>

                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  maxLength={100}
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('admin.venues.address')}
                </span>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  maxLength={255}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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
                  : editingVenue
                    ? t('admin.common.saveChanges')
                    : t('admin.venues.create')}
              </button>

              {editingVenue && (
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
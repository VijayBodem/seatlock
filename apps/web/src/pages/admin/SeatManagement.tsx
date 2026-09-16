import { useEffect, useMemo, useState } from 'react'

import {
  createSeat,
  deleteSeat,
  getSeats,
  updateSeat,
} from '../../services/seats.service'
import type { Seat, SeatType } from '../../types/seat'

type SeatManagementProps = {
  screenId: number
  screenName: string
  venueName: string
  accessToken: string
  onBack: () => void
}

const seatTypes: SeatType[] = ['STANDARD', 'PREMIUM', 'ACCESSIBLE']

function seatTypeLabel(type: SeatType) {
  switch (type) {
    case 'STANDARD':
      return 'Standard'
    case 'PREMIUM':
      return 'Premium'
    case 'ACCESSIBLE':
      return 'Accessible'
  }
}

function seatTypeClasses(type: SeatType) {
  switch (type) {
    case 'STANDARD':
      return 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
    case 'PREMIUM':
      return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
    case 'ACCESSIBLE':
      return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200'
  }
}

export function SeatManagement({
  screenId,
  screenName,
  venueName,
  accessToken,
  onBack,
}: SeatManagementProps) {
  const [seats, setSeats] = useState<Seat[]>([])
  const [row, setRow] = useState('')
  const [number, setNumber] = useState('1')
  const [type, setType] = useState<SeatType>('STANDARD')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSeats() {
      try {
        const result = await getSeats(screenId)

        if (!cancelled) {
          setSeats(result)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load seats.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchSeats()

    return () => {
      cancelled = true
    }
  }, [screenId])

  const sortedSeats = useMemo(
    () =>
      [...seats].sort(
        (left, right) =>
          left.row.localeCompare(right.row, undefined, {
            numeric: true,
          }) || left.number - right.number,
      ),
    [seats],
  )

  function resetForm() {
    setRow('')
    setNumber('1')
    setType('STANDARD')
    setEditingId(null)
  }

  function startEditing(seat: Seat) {
    setEditingId(seat.id)
    setRow(seat.row)
    setNumber(String(seat.number))
    setType(seat.type)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedRow = row.trim().toUpperCase()
    const parsedNumber = Number(number)

    if (!normalizedRow) {
      setError('Seat row is required.')
      return
    }

    if (
      !Number.isInteger(parsedNumber) ||
      parsedNumber < 1
    ) {
      setError('Seat number must be a positive integer.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const input = {
        row: normalizedRow,
        number: parsedNumber,
        type,
      }

      if (editingId === null) {
        const created = await createSeat(
          screenId,
          input,
          accessToken,
        )

        setSeats((current) => [...current, created])
      } else {
        const updated = await updateSeat(
          editingId,
          input,
          accessToken,
        )

        setSeats((current) =>
          current.map((seat) =>
            seat.id === updated.id ? updated : seat,
          ),
        )
      }

      resetForm()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save seat.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(seat: Seat) {
    const confirmed = window.confirm(
      `Delete seat ${seat.row}${seat.number}? This action cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(seat.id)
      setError(null)

      await deleteSeat(seat.id, accessToken)

      setSeats((current) =>
        current.filter((item) => item.id !== seat.id),
      )

      if (editingId === seat.id) {
        resetForm()
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete seat.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-bold text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
      >
        ← Back to screens
      </button>

      <div className="mt-5">
        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
          {venueName} · Seat management
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
          {screenName}
        </h2>

        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Configure the physical seat layout before creating showtimes.
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
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-zinc-950 dark:text-white">
              {editingId === null ? 'Add seat' : 'Edit seat'}
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Seat positions must be unique within this screen.
            </p>
          </div>

          <span className="text-sm font-semibold text-zinc-500">
            {seats.length} {seats.length === 1 ? 'seat' : 'seats'}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Row
            </span>

            <input
              value={row}
              onChange={(event) => setRow(event.target.value)}
              maxLength={10}
              placeholder="A"
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 uppercase text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Number
            </span>

            <input
              type="number"
              min={1}
              step={1}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Type
            </span>

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as SeatType)
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            >
              {seatTypes.map((seatType) => (
                <option key={seatType} value={seatType}>
                  {seatTypeLabel(seatType)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? 'Saving…'
              : editingId === null
                ? 'Add seat'
                : 'Save changes'}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="rounded-xl border border-zinc-300 px-5 py-3 font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h3 className="font-bold text-zinc-950 dark:text-white">
            Seat layout
          </h3>

          <div className="flex flex-wrap gap-3 text-xs font-semibold text-zinc-500">
            {seatTypes.map((seatType) => (
              <span key={seatType}>
                {seatTypeLabel(seatType)}
              </span>
            ))}
          </div>
        </div>

        <div
          className="mx-auto mt-7 h-1.5 max-w-xl rounded-full bg-zinc-300 dark:bg-zinc-700"
          aria-hidden="true"
        />

        <p className="mt-2 text-center text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
          Screen
        </p>

        {isLoading ? (
          <p className="mt-8 text-center text-zinc-500">
            Loading seats…
          </p>
        ) : sortedSeats.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="font-bold text-zinc-950 dark:text-white">
              No seats yet
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Add the first seat using the form above.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {sortedSeats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => startEditing(seat)}
                title={`${seat.row}${seat.number} · ${seatTypeLabel(seat.type)}`}
                className={`min-w-14 rounded-xl border px-3 py-3 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-md ${seatTypeClasses(
                  seat.type,
                )}`}
              >
                {seat.row}
                {seat.number}
              </button>
            ))}
          </div>
        )}

        {editingId !== null && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={deletingId === editingId}
              onClick={() => {
                const seat = seats.find(
                  (item) => item.id === editingId,
                )

                if (seat) {
                  void handleDelete(seat)
                }
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {deletingId === editingId
                ? 'Deleting…'
                : 'Delete selected seat'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
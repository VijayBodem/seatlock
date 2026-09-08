import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../services/api'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { register, isAuthenticated, isRestoring } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isRestoring) {
    return (
      <section className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('common.restoringSession')}
        </p>
      </section>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await register({
        email,
        password,
      })

      navigate('/login', {
        replace: true,
        state: {
          registrationSucceeded: true,
        },
      })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(t('auth.register.genericError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-300/30 dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-2xl dark:shadow-black/30">
        <div className="mb-8">
          <p className="mb-3 text-xs font-extrabold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
            {t('auth.register.eyebrow')}
          </p>

          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            {t('auth.register.title')}
          </h1>

          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
            {t('auth.register.description')}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {t('auth.register.email')}
            </span>

            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              autoComplete="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {t('auth.register.password')}
            </span>

            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              autoComplete="new-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && (
            <p
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('auth.register.submitting')
              : t('auth.register.submit')}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {t('auth.register.existingUser')}{' '}
          <Link
            className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            to="/login"
          >
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </section>
  )
}
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const { t } = useTranslation()
  const { user, isAuthenticated, isRestoring } = useAuth()

  return (
    <section className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_42%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-5 text-xs font-extrabold tracking-[0.22em] text-blue-600 uppercase dark:text-blue-400">
            {t('home.eyebrow')}
          </p>

          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-8xl dark:text-white">
            {t('home.title')}
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
            {t('home.description')}
          </p>

          {isRestoring && (
            <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
              {t('common.restoringSession')}
            </p>
          )}

          {!isRestoring && !isAuthenticated && (
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500"
                to="/register"
              >
                {t('home.createAccount')}
              </Link>

              <Link
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 font-bold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                to="/login"
              >
                {t('home.signIn')}
              </Link>
            </div>
          )}

          {!isRestoring && isAuthenticated && user && (
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-zinc-200 bg-white/80 p-6 text-left shadow-xl shadow-zinc-300/30 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-2xl dark:shadow-black/20">
              <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-500">
                {t('home.signedInAs')}
              </p>

              <p className="mt-2 font-bold text-zinc-950 dark:text-white">
                {user.email}
              </p>

              <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
                {t('home.accountReady')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
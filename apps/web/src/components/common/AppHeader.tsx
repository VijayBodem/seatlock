import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import type { Theme } from '../../constants/theme'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

function getNavLinkClass(isActive: boolean): string {
  const baseClass =
    'text-sm font-semibold transition-colors hover:text-zinc-950 dark:hover:text-white'

  return isActive
    ? `${baseClass} text-zinc-950 dark:text-white`
    : `${baseClass} text-zinc-500 dark:text-zinc-400`
}

export function AppHeader() {
  const { i18n, t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, isRestoring, logout } = useAuth()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  async function handleLanguageChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    await i18n.changeLanguage(event.target.value)
  }

  function handleThemeChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    setTheme(event.target.value as Theme)
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false)
  }

  function handleLogout() {
    logout()
    closeMobileMenu()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-18 items-center justify-between gap-4">
          <Link
            className="shrink-0 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white"
            to="/"
            onClick={closeMobileMenu}
          >
            {t('common.appName')}
          </Link>

          <nav
            className="hidden items-center gap-4 sm:flex"
            aria-label="Primary navigation"
          >
            <NavLink
              className={({ isActive }) => getNavLinkClass(isActive)}
              to="/"
              end
            >
              {t('common.home')}
            </NavLink>

            {!isRestoring && isAuthenticated && (
              <NavLink
                className={({ isActive }) => getNavLinkClass(isActive)}
                to="/bookings"
              >
                {t('common.myBookings')}
              </NavLink>
            )}

            <label className="sr-only" htmlFor="language-selector">
              {t('language.label')}
            </label>

            <select
              id="language-selector"
              className="max-w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              value={i18n.language}
              onChange={handleLanguageChange}
            >
              <option value="en">{t('language.english')}</option>
              <option value="te">{t('language.telugu')}</option>
              <option value="hi">{t('language.hindi')}</option>
            </select>

            <label className="sr-only" htmlFor="theme-selector">
              {t('theme.label')}
            </label>

            <select
              id="theme-selector"
              className="max-w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              value={theme}
              onChange={handleThemeChange}
            >
              <option value="system">{t('theme.system')}</option>
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>

            {!isRestoring && !isAuthenticated && (
              <>
                <NavLink
                  className={({ isActive }) => getNavLinkClass(isActive)}
                  to="/login"
                >
                  {t('common.login')}
                </NavLink>

                <Link
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
                  to="/register"
                >
                  {t('common.register')}
                </Link>
              </>
            )}

            {!isRestoring && isAuthenticated && (
              <>
                <span className="hidden max-w-44 truncate text-sm text-zinc-500 dark:text-zinc-400 lg:block">
                  {user?.email}
                </span>

                <button
                  className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                  type="button"
                  onClick={logout}
                >
                  {t('common.logout')}
                </button>
              </>
            )}
          </nav>

          <button
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:hidden"
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? t('common.close') : t('common.menu')}
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav
            id="mobile-navigation"
            className="space-y-4 border-t border-zinc-200 py-5 dark:border-zinc-800 sm:hidden"
            aria-label="Mobile navigation"
          >
            <NavLink
              className={({ isActive }) =>
                `${getNavLinkClass(isActive)} block`
              }
              to="/"
              end
              onClick={closeMobileMenu}
            >
              {t('common.home')}
            </NavLink>

            {!isRestoring && isAuthenticated && (
              <NavLink
                className={({ isActive }) =>
                  `${getNavLinkClass(isActive)} block`
                }
                to="/bookings"
                onClick={closeMobileMenu}
              >
                {t('common.myBookings')}
              </NavLink>
            )}

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {t('language.label')}
                </span>

                <select
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  value={i18n.language}
                  onChange={handleLanguageChange}
                >
                  <option value="en">{t('language.english')}</option>
                  <option value="te">{t('language.telugu')}</option>
                  <option value="hi">{t('language.hindi')}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {t('theme.label')}
                </span>

                <select
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  value={theme}
                  onChange={handleThemeChange}
                >
                  <option value="system">{t('theme.system')}</option>
                  <option value="light">{t('theme.light')}</option>
                  <option value="dark">{t('theme.dark')}</option>
                </select>
              </label>
            </div>

            {!isRestoring && !isAuthenticated && (
              <div className="flex flex-col gap-3">
                <NavLink
                  className={({ isActive }) =>
                    `${getNavLinkClass(isActive)} block`
                  }
                  to="/login"
                  onClick={closeMobileMenu}
                >
                  {t('common.login')}
                </NavLink>

                <Link
                  className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-500"
                  to="/register"
                  onClick={closeMobileMenu}
                >
                  {t('common.register')}
                </Link>
              </div>
            )}

            {!isRestoring && isAuthenticated && (
              <div className="space-y-3">
                <p className="break-all text-sm text-zinc-500 dark:text-zinc-400">
                  {user?.email}
                </p>

                <button
                  className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  type="button"
                  onClick={handleLogout}
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
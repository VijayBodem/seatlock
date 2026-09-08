import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'

import {
  THEME_STORAGE_KEY,
  themes,
} from '../constants/theme'
import type {
  ResolvedTheme,
  Theme,
} from '../constants/theme'
import type { ThemeContextValue } from '../types/theme'
import { ThemeContext } from './theme-context'

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme === value)
}

function getStoredTheme(): Theme {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

  if (isTheme(storedTheme)) {
    return storedTheme
  }

  return 'system'
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MODE_MEDIA_QUERY).matches
    ? 'dark'
    : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme),
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY)

    function updateResolvedTheme() {
      const nextResolvedTheme = resolveTheme(theme)

      setResolvedTheme(nextResolvedTheme)
      applyTheme(nextResolvedTheme)
    }

    updateResolvedTheme()

    if (theme !== 'system') {
      return
    }

    mediaQuery.addEventListener('change', updateResolvedTheme)

    return () => {
      mediaQuery.removeEventListener('change', updateResolvedTheme)
    }
  }, [theme])

  function setTheme(nextTheme: Theme) {
    if (nextTheme === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }

    setThemeState(nextTheme)
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
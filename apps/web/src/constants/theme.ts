export const THEME_STORAGE_KEY = 'seatlock.theme'

export const themes = ['system', 'light', 'dark'] as const

export type Theme = (typeof themes)[number]

export type ResolvedTheme = Exclude<Theme, 'system'>
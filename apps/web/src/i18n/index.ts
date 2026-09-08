import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hi from './locales/hi.json'
import te from './locales/te.json'

const LANGUAGE_STORAGE_KEY = 'seatlock.language'

const supportedLanguages = ['en', 'te', 'hi'] as const

type SupportedLanguage = (typeof supportedLanguages)[number]

function isSupportedLanguage(
  value: string | null,
): value is SupportedLanguage {
  return supportedLanguages.some((language) => language === value)
}

function getInitialLanguage(): SupportedLanguage {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage
  }

  return 'en'
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      te: {
        translation: te,
      },
      hi: {
        translation: hi,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (language) => {
  if (isSupportedLanguage(language)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }
})

document.documentElement.lang = getInitialLanguage()

export default i18n
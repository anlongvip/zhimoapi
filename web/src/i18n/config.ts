/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { convertDetectedLanguage } from './languages'
import en from './locales/en.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import vi from './locales/vi.json'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh.json'

// Older releases cached the browser-detected locale, which could leave Chinese
// visitors stuck in English after the default language changes. Migrate that
// one-time automatic English value to Simplified Chinese; future user choices
// are still stored and respected by the existing language switcher.
const LANGUAGE_DEFAULT_MIGRATION_KEY = 'zhimo-language-default-v1'
if (typeof window !== 'undefined') {
  try {
    const storage = window.localStorage
    if (!storage.getItem(LANGUAGE_DEFAULT_MIGRATION_KEY)) {
      const savedLanguage = storage.getItem('i18nextLng')?.toLowerCase()
      if (savedLanguage === 'en' || savedLanguage?.startsWith('en-')) {
        storage.setItem('i18nextLng', 'zhCN')
      }
      storage.setItem(LANGUAGE_DEFAULT_MIGRATION_KEY, '1')
    }
  } catch {
    // Browser storage may be disabled; fallbackLng still defaults to Chinese.
  }
}

export const resources = {
  en,
  zhCN,
  fr,
  ru,
  ja,
  vi,
  zhTW,
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zhCN',
    supportedLngs: ['en', 'zhCN', 'fr', 'ru', 'ja', 'vi', 'zhTW'],
    load: 'currentOnly',
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage,
    },
  })

export default i18n

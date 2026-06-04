import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import id from './locales/id.json';
import ms from './locales/ms.json';

const resources = {
  en: { translation: en },
  id: { translation: id },
  ms: { translation: ms },
};

const LANG_STORAGE_KEY = 'i18nextLng';
export const LANG_USER_CHOSEN_KEY = 'i18n_user_chosen';
const LANG_GEO_RESOLVED_KEY = 'i18n_geo_resolved';

function mapCountryToLanguage(countryCode: string): string {
  if (countryCode === 'ID') return 'id';
  if (countryCode === 'MY') return 'ms';
  return 'en';
}

async function applyGeoLanguage() {
  // Skip if the user has manually picked a language.
  if (localStorage.getItem(LANG_USER_CHOSEN_KEY)) return;
  // Skip if we've already done a successful geo-lookup on a previous visit.
  if (localStorage.getItem(LANG_GEO_RESOLVED_KEY)) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return;
    const data = await res.json();
    const lang = mapCountryToLanguage(data.country_code ?? '');
    await i18n.changeLanguage(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem(LANG_GEO_RESOLVED_KEY, '1');
  } catch {
    // silently fall back to English
  } finally {
    clearTimeout(timeout);
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
    },
  })
  .then(() => applyGeoLanguage());

export default i18n;

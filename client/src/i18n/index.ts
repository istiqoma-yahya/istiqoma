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

function mapCountryToLanguage(countryCode: string): string {
  if (countryCode === 'ID') return 'id';
  if (countryCode === 'MY') return 'ms';
  return 'en';
}

async function applyGeoLanguage() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return;
    const data = await res.json();
    const lang = mapCountryToLanguage(data.country_code ?? '');
    i18n.changeLanguage(lang);
  } catch {
    // silently fall back to English
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
      caches: ['localStorage'],
    },
  });

applyGeoLanguage();

export default i18n;

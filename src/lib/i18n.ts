import i18n, { type LanguageDetectorAsyncModule } from 'i18next';
import { localeController } from './locale-selection';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

export const supportedLanguages = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

const countryDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect(callback) {
    void localeController.resolve().then(locale => callback(locale.language));
  },
};

i18n.on('languageChanged', language => { document.documentElement.lang = language; });
i18n
  .use(HttpBackend)
  .use(countryDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es', 'it'],
    defaultNS: 'common',
    ns: ['common', 'home', 'auth', 'dashboard', 'pricing', 'checkout', 'admin', 'legal', 'briefing'],
    interpolation: { 
      escapeValue: false 
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json?v=' + encodeURIComponent(document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src') || 'dev'),
      requestOptions: { cache: 'no-store' },
    },
    load: 'currentOnly',
    react: {
      useSuspense: true,
    },
  });

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export const supportedLanguages = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

// Map browser language to supported language
const mapBrowserLanguage = (browserLang: string): SupportedLanguage => {
  const lang = browserLang.toLowerCase();
  
  // Portuguese variants
  if (lang.startsWith('pt')) return 'pt-BR';
  
  // Spanish variants
  if (lang.startsWith('es')) return 'es';
  
  // Italian variants
  if (lang.startsWith('it')) return 'it';
  
  // English variants and default
  if (lang.startsWith('en')) return 'en';
  
  // Default to Portuguese for Brazil IP or unknown
  return 'pt-BR';
};

// Custom language detector that uses Accept-Language header priority
const customLanguageDetector = {
  name: 'customNavigator',
  lookup() {
    // Check if there's a saved preference
    const saved = localStorage.getItem('criandomusicas-language');
    if (saved && supportedLanguages.some(l => l.code === saved)) {
      return saved;
    }
    
    // Use navigator.languages for better detection
    if (typeof navigator !== 'undefined') {
      const languages = navigator.languages || [navigator.language];
      
      for (const browserLang of languages) {
        const mapped = mapBrowserLanguage(browserLang);
        if (mapped) return mapped;
      }
    }
    
    return 'pt-BR';
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem('criandomusicas-language', lng);
  },
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
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
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'customNavigator', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'criandomusicas-language',
    },
    react: {
      useSuspense: true,
    },
  });

// Register custom detector
const languageDetector = i18n.services?.languageDetector;
if (languageDetector) {
  languageDetector.addDetector(customLanguageDetector);
}

export default i18n;

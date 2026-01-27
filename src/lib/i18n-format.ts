import { ptBR, enUS, es, it, type Locale } from 'date-fns/locale';
import { format as formatDate, formatDistance, formatRelative } from 'date-fns';

// Locale mapping for date-fns
const dateLocales: Record<string, Locale> = {
  'pt-BR': ptBR,
  'en': enUS,
  'es': es,
  'it': it,
};

// Currency mapping by language
const currencyMap: Record<string, { currency: string; locale: string }> = {
  'pt-BR': { currency: 'BRL', locale: 'pt-BR' },
  'en': { currency: 'USD', locale: 'en-US' },
  'es': { currency: 'EUR', locale: 'es-ES' },
  'it': { currency: 'EUR', locale: 'it-IT' },
};

// Exchange rates (approximate - would be updated from an API in production)
const exchangeRates: Record<string, number> = {
  'BRL': 1,      // Base currency
  'USD': 0.20,   // 1 BRL ≈ 0.20 USD
  'EUR': 0.18,   // 1 BRL ≈ 0.18 EUR
};

/**
 * Get the date-fns locale for the current language
 */
export const getDateLocale = (lang: string): Locale => {
  return dateLocales[lang] || dateLocales['pt-BR'];
};

/**
 * Format a date according to the current locale
 */
export const formatLocalizedDate = (
  date: Date | string | number,
  formatStr: string = 'PPP',
  lang: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDate(dateObj, formatStr, { locale: getDateLocale(lang) });
};

/**
 * Format relative time (e.g., \"2 days ago\")
 */
export const formatRelativeTime = (
  date: Date | string | number,
  baseDate: Date = new Date(),
  lang: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistance(dateObj, baseDate, { 
    addSuffix: true, 
    locale: getDateLocale(lang) 
  });
};

/**
 * Format relative date (e.g., \"last Friday at 5:00 PM\")
 */
export const formatRelativeDate = (
  date: Date | string | number,
  baseDate: Date = new Date(),
  lang: string = 'pt-BR'
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatRelative(dateObj, baseDate, { locale: getDateLocale(lang) });
};

/**
 * Convert price from BRL cents to target currency
 */
export const convertPrice = (brlCents: number, targetCurrency: string): number => {
  const brlValue = brlCents / 100;
  const rate = exchangeRates[targetCurrency] || 1;
  return brlValue * rate;
};

/**
 * Format currency according to the current locale
 */
export const formatCurrency = (
  cents: number,
  lang: string = 'pt-BR',
  options: { 
    convert?: boolean;
    showSymbol?: boolean;
  } = {}
): string => {
  const { convert = true, showSymbol = true } = options;
  const currencyInfo = currencyMap[lang] || currencyMap['pt-BR'];
  
  let value: number;
  let currency: string;
  
  if (convert && lang !== 'pt-BR') {
    // Convert from BRL to target currency
    value = convertPrice(cents, currencyInfo.currency);
    currency = currencyInfo.currency;
  } else {
    // Keep as BRL
    value = cents / 100;
    currency = 'BRL';
  }
  
  const formatter = new Intl.NumberFormat(currencyInfo.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: showSymbol ? currency : undefined,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

/**
 * Format price in BRL (original currency) - for when we don't want conversion
 */
export const formatBRL = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

/**
 * Get currency symbol for a language
 */
export const getCurrencySymbol = (lang: string): string => {
  const currencyInfo = currencyMap[lang] || currencyMap['pt-BR'];
  const formatter = new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currencyInfo.currency,
  });
  
  // Extract just the symbol from a formatted number
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value || 'R$';
};

/**
 * Get currency code for a language
 */
export const getCurrencyCode = (lang: string): string => {
  const currencyInfo = currencyMap[lang] || currencyMap['pt-BR'];
  return currencyInfo.currency;
};

// Common date formats by use case
export const DATE_FORMATS = {
  short: 'dd/MM/yyyy',      // 25/01/2026
  medium: 'PP',              // Jan 25, 2026
  long: 'PPP',               // January 25, 2026
  full: 'PPPP',              // Friday, January 25, 2026
  time: 'HH:mm',             // 14:30
  datetime: 'PPP HH:mm',     // January 25, 2026 14:30
  monthYear: 'MMMM yyyy',    // January 2026
} as const;

export type DateFormat = keyof typeof DATE_FORMATS;

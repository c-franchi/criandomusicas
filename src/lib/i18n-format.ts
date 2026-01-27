import { ptBR, enUS, es, it, type Locale } from 'date-fns/locale';
import { format as formatDate, formatDistance, formatRelative } from 'date-fns';

// Locale mapping for date-fns
const dateLocales: Record<string, Locale> = {
  'pt-BR': ptBR,
  'en': enUS,
  'es': es,
  'it': it,
};

// Currency mapping by language (fallback when no region is set)
const currencyMap: Record<string, { currency: string; locale: string }> = {
  'pt-BR': { currency: 'BRL', locale: 'pt-BR' },
  'en': { currency: 'USD', locale: 'en-US' },
  'es': { currency: 'EUR', locale: 'es-ES' },
  'it': { currency: 'EUR', locale: 'it-IT' },
};

// Currency locale mapping for proper formatting
const currencyLocaleMap: Record<string, string> = {
  'BRL': 'pt-BR',
  'USD': 'en-US',
  'EUR': 'es-ES',
  'GBP': 'en-GB',
  'CAD': 'en-CA',
  'AUD': 'en-AU',
  'MXN': 'es-MX',
  'ARS': 'es-AR',
  'COP': 'es-CO',
  'CLP': 'es-CL',
  'PEN': 'es-PE',
  'CHF': 'de-CH',
};

// Exchange rates (approximate - would be updated from an API in production)
// Updated 2026-01: 1 BRL ≈ 0.17 USD ≈ 0.16 EUR
const exchangeRates: Record<string, number> = {
  'BRL': 1,         // Base currency
  'USD': 0.17,      // 1 BRL ≈ 0.17 USD
  'EUR': 0.16,      // 1 BRL ≈ 0.16 EUR
  'GBP': 0.14,      // 1 BRL ≈ 0.14 GBP
  'CAD': 0.24,      // 1 BRL ≈ 0.24 CAD
  'AUD': 0.27,      // 1 BRL ≈ 0.27 AUD
  'MXN': 3.50,      // 1 BRL ≈ 3.50 MXN
  'ARS': 180,       // 1 BRL ≈ 180 ARS
  'COP': 700,       // 1 BRL ≈ 700 COP
  'CLP': 160,       // 1 BRL ≈ 160 CLP
  'PEN': 0.64,      // 1 BRL ≈ 0.64 PEN
  'CHF': 0.15,      // 1 BRL ≈ 0.15 CHF
};

/**
 * Get stored region currency preference
 */
export const getStoredCurrency = (): string | null => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('criandomusicas-currency');
  }
  return null;
};

/**
 * Get formatted price with currency conversion
 * Returns both the converted value and formatted string
 * Now supports region-based currency when available
 */
export const getLocalizedPrice = (
  brlCents: number,
  lang: string = 'pt-BR',
  overrideCurrency?: string
): { value: number; formatted: string; currency: string } => {
  // Priority: override > stored region currency > language default
  const storedCurrency = getStoredCurrency();
  const targetCurrency = overrideCurrency || storedCurrency;
  
  let currency: string;
  let locale: string;
  
  if (targetCurrency && exchangeRates[targetCurrency]) {
    currency = targetCurrency;
    locale = currencyLocaleMap[targetCurrency] || 'en-US';
  } else {
    const currencyInfo = currencyMap[lang] || currencyMap['pt-BR'];
    currency = currencyInfo.currency;
    locale = currencyInfo.locale;
  }
  
  const value = currency === 'BRL' 
    ? brlCents / 100 
    : convertPrice(brlCents, currency);
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return {
    value,
    formatted: formatter.format(value),
    currency
  };
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
 * Format currency according to the current locale or stored region
 */
export const formatCurrency = (
  cents: number,
  lang: string = 'pt-BR',
  options: { 
    convert?: boolean;
    showSymbol?: boolean;
    overrideCurrency?: string;
  } = {}
): string => {
  const { convert = true, showSymbol = true, overrideCurrency } = options;
  
  // Priority: override > stored region currency > language default
  const storedCurrency = getStoredCurrency();
  const targetCurrency = overrideCurrency || storedCurrency;
  
  let value: number;
  let currency: string;
  let locale: string;
  
  if (targetCurrency && exchangeRates[targetCurrency] && convert) {
    currency = targetCurrency;
    locale = currencyLocaleMap[targetCurrency] || 'en-US';
    value = currency === 'BRL' ? cents / 100 : convertPrice(cents, currency);
  } else if (convert && lang !== 'pt-BR') {
    const currencyInfo = currencyMap[lang] || currencyMap['pt-BR'];
    currency = currencyInfo.currency;
    locale = currencyInfo.locale;
    value = convertPrice(cents, currency);
  } else {
    value = cents / 100;
    currency = 'BRL';
    locale = 'pt-BR';
  }
  
  const formatter = new Intl.NumberFormat(locale, {
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

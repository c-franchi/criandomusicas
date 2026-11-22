import { detectAccessCountry } from './locale-selection';

/** Payment presentation depends on access country, never the selected language/currency. */
export function canOfferPix(country: string | null): boolean {
  return country === 'BR';
}

/** Do not silently send a foreign purchaser to BRL while Italian live checkout is unconfigured. */
export function canStartBrazilCard(country: string | null): boolean {
  return country === 'BR';
}

let accessCountry: Promise<string | null> | undefined;
export function resolvePaymentAccessCountry(): Promise<string | null> {
  // In-memory only; no IP, cookies, or persistent location storage.
  accessCountry ??= detectAccessCountry(window.fetch.bind(window));
  return accessCountry;
}
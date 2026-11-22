import { test, expect } from 'bun:test';
import { canOfferPix, canStartBrazilCard } from './access-payment.ts';

test('Brazilian access retains Pix', () => {
  expect(canOfferPix('BR')).toBe(true);
});
test('foreign IP countries never offer Pix, including Portuguese-speaking countries', () => {
  for (const country of ['IT', 'US', 'ES', 'PT', 'AO', 'FR']) {
    expect(canOfferPix(country)).toBe(false);
  }
});
test('pending or failed country detection does not expose Pix', () => {
  expect(canOfferPix(null)).toBe(false);
  expect(canOfferPix('')).toBe(false);
});
test('Brazilian card checkout remains available only for confirmed Brazilian access', () => {
  expect(canStartBrazilCard('BR')).toBe(true);
  for (const country of ['IT', 'US', 'PT', null]) {
    expect(canStartBrazilCard(country)).toBe(false);
  }
});
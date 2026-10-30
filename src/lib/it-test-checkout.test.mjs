import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isTestStripeKey, itTestReturnOrigin, priceMatchesCatalog, isHandledEvent, itTestErrorCode, IT_TEST_ACCOUNT_ID,
} from '../../supabase/functions/_shared/itTestCheckout.ts';

const item = { plan_id: 'gift_short_15', price_id: 'price_1UW1IzBI0iXvcrrHjJUx7MD3', unit_amount: 299 };
const price = { id: item.price_id, active: true, currency: 'eur', unit_amount: 299, livemode: false, type: 'one_time' };

test('only test-mode keys are accepted', () => {
  assert.equal(isTestStripeKey('rk_test_' + 'a'.repeat(20)), true);
  assert.equal(isTestStripeKey('sk_live_' + 'a'.repeat(20)), false);
  assert.equal(isTestStripeKey('rk_live_' + 'a'.repeat(20)), false);
  assert.equal(isTestStripeKey('pk_test_' + 'a'.repeat(20)), false);
  assert.equal(isTestStripeKey(undefined), false);
});

test('return URLs only use existing domains', () => {
  assert.equal(itTestReturnOrigin('https://evil.example'), 'https://criandomusicas.com.br');
  assert.equal(itTestReturnOrigin('https://criandomusicas.lovable.app'), 'https://criandomusicas.lovable.app');
  assert.equal(itTestReturnOrigin(null), 'https://criandomusicas.com.br');
});

test('15s short price must be exactly 2,99 EUR active test price', () => {
  assert.equal(priceMatchesCatalog(price, item), true);
  assert.equal(priceMatchesCatalog({ ...price, unit_amount: 1990 }, item), false);
  assert.equal(priceMatchesCatalog({ ...price, currency: 'brl' }, item), false);
  assert.equal(priceMatchesCatalog({ ...price, livemode: true }, item), false);
  assert.equal(priceMatchesCatalog({ ...price, active: false }, item), false);
  assert.equal(priceMatchesCatalog({ ...price, id: 'price_other' }, item), false);
});

test('webhook handles paid, async, failure and expiry events only', () => {
  for (const t of ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired']) assert.equal(isHandledEvent(t), true);
  assert.equal(isHandledEvent('payment_intent.succeeded'), false);
});

test('database errors map to safe messages', () => {
  assert.equal(itTestErrorCode('ERROR: it_test_voucher_unavailable'), 'it_test_voucher_unavailable');
  assert.equal(itTestErrorCode('other'), null);
});

test('IT functions never read the Brazilian Stripe key', () => {
  for (const f of ['create-it-test-checkout', 'stripe-it-test-webhook']) {
    const src = readFileSync(new URL(`../../supabase/functions/${f}/index.ts`, import.meta.url), 'utf8');
    assert.equal(src.includes('STRIPE_SECRET_KEY'), false, f);
  }
  const shared = readFileSync(new URL('../../supabase/functions/_shared/itTestCheckout.ts', import.meta.url), 'utf8');
  assert.equal(shared.includes("'STRIPE_SECRET_KEY'"), false);
});

test('catalog file matches the sandbox account and short prices 299/499', () => {
  const cat = JSON.parse(readFileSync(new URL('../../docs/stripe-italy-sandbox-catalog.json', import.meta.url), 'utf8'));
  assert.equal(cat.account_id, IT_TEST_ACCOUNT_ID);
  assert.equal(cat.livemode, false);
  const by = Object.fromEntries(cat.products.map(p => [p.plan_id, p.unit_amount]));
  assert.equal(by.gift_short_15, 299);
  assert.equal(by.gift_short_30, 499);
});

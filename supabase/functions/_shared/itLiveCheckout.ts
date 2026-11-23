// Pure helpers for the live Italian (Modena) EUR checkout. Never mix with the Brazilian key or IT test catalog.
export const IT_LIVE_ACCOUNT_ID = 'acct_1UVwbCPdfOmvIwtR';
export const IT_LIVE_CURRENCY = 'eur';
export const IT_LIVE_KEY_NAME = 'STRIPE_IT_LIVE_RESTRICTED_KEY';
export const IT_LIVE_WEBHOOK_NAME = 'STRIPE_IT_LIVE_WEBHOOK_SECRET';

// Verified live catalog (docs/stripe-italy-live-catalog.json). Only music orders are sold for now.
export const IT_LIVE_MUSIC_FULL = { plan_id: 'music_full', product_id: 'prod_VgJ6jrRVEKqjwd', price_id: 'price_1UewUgPdfOmvIwtRtFOUAAuJ', unit_amount: 1999 };
export const IT_LIVE_ALLOWED_ORDER_PLANS = ['single', 'single_instrumental', 'single_custom_lyric'];

export const IT_LIVE_ALLOWED_ORIGINS = [
  'https://criandomusicas.com.br', 'https://www.criandomusicas.com.br',
  'https://creandomusica.it', 'https://www.creandomusica.it',
  'https://criandomusicas.lovable.app',
  'https://id-preview--8b44c89b-d4bc-4aa8-b6fd-85522e79ace9.lovable.app',
  'http://localhost:8080',
];
export function itLiveReturnOrigin(origin: string | null | undefined): string {
  return origin && IT_LIVE_ALLOWED_ORIGINS.includes(origin) ? origin : IT_LIVE_ALLOWED_ORIGINS[0];
}
export function isLiveStripeKey(key: string | undefined | null): boolean {
  return typeof key === 'string' && /^(rk_live_|sk_live_)[A-Za-z0-9]{10,}$/.test(key);
}
export function livePriceMatches(price: { id: string; active: boolean; currency: string; unit_amount: number | null; livemode: boolean; type?: string }): boolean {
  const i = IT_LIVE_MUSIC_FULL;
  return price.id === i.price_id && price.active === true && price.livemode === true &&
    price.currency === IT_LIVE_CURRENCY && price.unit_amount === i.unit_amount && (price.type ?? 'one_time') === 'one_time';
}
export function livePaidSessionValid(s: { livemode: boolean; currency: string | null; amount_total: number | null; payment_status: string; id: string }, expectedAmount: number): boolean {
  return s.livemode === true && s.currency === IT_LIVE_CURRENCY && s.amount_total === expectedAmount && s.payment_status === 'paid' && s.id.startsWith('cs_live_');
}

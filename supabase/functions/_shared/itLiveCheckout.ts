// Pure helpers for the live Italian (Modena) EUR checkout. Never mix with the Brazilian key or IT test catalog.
export const IT_LIVE_ACCOUNT_ID = 'acct_1UVwbCPdfOmvIwtR';
export const IT_LIVE_CURRENCY = 'eur';
export const IT_LIVE_KEY_NAME = 'STRIPE_IT_LIVE_RESTRICTED_KEY';
export const IT_LIVE_WEBHOOK_NAME = 'STRIPE_IT_LIVE_WEBHOOK_SECRET';

// Verified live catalog (docs/stripe-italy-live-catalog.json). Only music orders are sold for now.
export const IT_LIVE_MUSIC_FULL = { plan_id: 'music_full', product_id: 'prod_VgJ6jrRVEKqjwd', price_id: 'price_1UewUgPdfOmvIwtRtFOUAAuJ', unit_amount: 1999 };
export const IT_LIVE_PACKAGE_3 = { plan_id: 'music_package_3', product_id: 'prod_VgLuYP4YvoNS7e', price_id: 'price_1UezD2PdfOmvIwtR9DtBKQRB', unit_amount: 4999, credits: 3 };
export const IT_LIVE_ALLOWED_ORDER_PLANS = ['single', 'single_instrumental', 'single_custom_lyric', 'package', 'package_instrumental'];
export type ItLiveItem = { plan_id: string; product_id: string; price_id: string; unit_amount: number };
/** The EUR catalog item an order's plan is sold as; null when not sold in euros. */
export function itLiveItemForOrderPlan(plan: string | null | undefined): ItLiveItem | null {
  if (!plan || plan.startsWith('single')) return IT_LIVE_MUSIC_FULL;
  if (plan === 'package' || plan === 'package_instrumental') return IT_LIVE_PACKAGE_3;
  return null;
}
export function itLiveItemByPlanId(planId: string): ItLiveItem | null {
  return [IT_LIVE_MUSIC_FULL, IT_LIVE_PACKAGE_3].find(i => i.plan_id === planId) ?? null;
}

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
export function livePriceMatches(price: { id: string; active: boolean; currency: string; unit_amount: number | null; livemode: boolean; type?: string }, i: ItLiveItem = IT_LIVE_MUSIC_FULL): boolean {
  return price.id === i.price_id && price.active === true && price.livemode === true &&
    price.currency === IT_LIVE_CURRENCY && price.unit_amount === i.unit_amount && (price.type ?? 'one_time') === 'one_time';
}
export function livePaidSessionValid(s: { livemode: boolean; currency: string | null; amount_total: number | null; payment_status: string; id: string }, expectedAmount: number): boolean {
  return s.livemode === true && s.currency === IT_LIVE_CURRENCY && s.amount_total === expectedAmount && s.payment_status === 'paid' && s.id.startsWith('cs_live_');
}

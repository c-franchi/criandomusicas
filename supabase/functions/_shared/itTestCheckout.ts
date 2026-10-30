// Pure helpers for the isolated IT/EUR Stripe sandbox checkout. No Deno or network imports,
// so the same rules are unit-tested from src/lib/it-test-checkout.test.mjs.
export const IT_TEST_ACCOUNT_ID = 'acct_1UVMtHBI0iXvcrrH';
export const IT_TEST_CURRENCY = 'eur';
export const IT_TEST_KEY_NAME = 'STRIPE_IT_TEST_RESTRICTED_KEY';
export const IT_TEST_WEBHOOK_NAME = 'STRIPE_IT_TEST_WEBHOOK_SECRET';
export const IT_TEST_RETURN_PATH = '/admin/teste-italia';

export const IT_TEST_ALLOWED_ORIGINS = [
  'https://criandomusicas.com.br',
  'https://www.criandomusicas.com.br',
  'https://criandomusicas.lovable.app',
  'https://id-preview--8b44c89b-d4bc-4aa8-b6fd-85522e79ace9.lovable.app',
  'http://localhost:8080',
];

export function itTestReturnOrigin(origin: string | null | undefined): string {
  return origin && IT_TEST_ALLOWED_ORIGINS.includes(origin) ? origin : IT_TEST_ALLOWED_ORIGINS[0];
}

// Only test-mode credentials are acceptable; a live key (or the Brazilian key) is refused.
export function isTestStripeKey(key: string | undefined | null): boolean {
  return typeof key === 'string' && /^(rk_test_|sk_test_)[A-Za-z0-9]{10,}$/.test(key);
}

export type CatalogItem = { plan_id: string; price_id: string; unit_amount: number };

// The Stripe price must be the exact active EUR test-mode price recorded in the catalog.
export function priceMatchesCatalog(price: { id: string; active: boolean; currency: string; unit_amount: number | null; livemode: boolean; type?: string }, item: CatalogItem): boolean {
  return price.id === item.price_id && price.active === true && price.livemode === false &&
    price.currency === IT_TEST_CURRENCY && price.unit_amount === item.unit_amount && (price.type ?? 'one_time') === 'one_time';
}

export const IT_TEST_HANDLED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
] as const;

export function isHandledEvent(type: string): boolean {
  return (IT_TEST_HANDLED_EVENTS as readonly string[]).includes(type);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// Error codes raised by the database that are safe to show to the administrator.
export const IT_TEST_ERRORS: Record<string, string> = {
  it_test_forbidden: 'Apenas administradores podem testar seus próprios pedidos.',
  it_test_order_not_payable: 'Este pedido não está aguardando pagamento (ou já tem outro pagamento em andamento).',
  it_test_voucher_unavailable: 'Cupons não estão disponíveis no teste Itália (descontos em BRL não se aplicam ao EUR).',
  it_test_physical_unavailable: 'Cartão impresso/frete não está configurado no teste Itália.',
  it_test_plan_unavailable: 'Este tipo de pedido não tem preço no catálogo Itália.',
  it_test_already_paid: 'Este pedido já foi pago no teste Itália.',
  it_test_checkout_open: 'Já existe um checkout de teste aberto para este pedido. Conclua-o ou aguarde expirar.',
  it_test_checkout_busy: 'Checkout ocupado. Tente novamente em instantes.',
};

export function itTestErrorCode(message: string): string | null {
  return Object.keys(IT_TEST_ERRORS).find((code) => message.includes(code)) ?? null;
}

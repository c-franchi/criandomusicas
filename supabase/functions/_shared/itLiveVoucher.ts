// Pure voucher rules for the live Italian EUR checkout.
// Only percentage vouchers apply in EUR: fixed vouchers are stored in BRL cents and must never be reinterpreted.
export const IT_LIVE_MIN_CHARGE_CENTS = 50; // Stripe minimum charge for EUR.

export type ItVoucher = {
  id: string; code: string; discount_type: string; discount_value: number; is_active: boolean | null;
  valid_from: string | null; valid_until: string | null; max_uses: number | null; current_uses: number | null;
  plan_ids: string[] | null; max_uses_per_user: number | null;
};
export type ItVoucherQuote =
  | { ok: true; discount: number; final: number }
  | { ok: false; error: 'inactive' | 'not_started' | 'expired' | 'exhausted' | 'user_limit' | 'plan' | 'currency' | 'below_minimum' };

// Order plan → voucher plan family (vouchers are configured with base plan ids like 'single' / 'package').
export function itVoucherPlanFamily(planId?: string | null): string {
  const p = String(planId || 'single');
  return p.startsWith('package') ? 'package' : 'single';
}

export function quoteItLiveVoucher(v: ItVoucher, base: number, userUses: number, now = new Date(), planId: string | null = 'single'): ItVoucherQuote {
  if (!v.is_active) return { ok: false, error: 'inactive' };
  if (v.valid_from && new Date(v.valid_from) > now) return { ok: false, error: 'not_started' };
  if (v.valid_until && new Date(v.valid_until) < now) return { ok: false, error: 'expired' };
  if (v.max_uses !== null && (v.current_uses ?? 0) >= v.max_uses) return { ok: false, error: 'exhausted' };
  if (v.max_uses_per_user !== null && userUses >= v.max_uses_per_user) return { ok: false, error: 'user_limit' };
  if (v.plan_ids && v.plan_ids.length > 0 && !v.plan_ids.includes(String(planId || 'single')) && !v.plan_ids.includes(itVoucherPlanFamily(planId))) return { ok: false, error: 'plan' };
  if (v.discount_type !== 'percent') return { ok: false, error: 'currency' };
  const discount = Math.round(base * Math.min(100, Math.max(0, v.discount_value)) / 100);
  const final = base - discount;
  if (final < IT_LIVE_MIN_CHARGE_CENTS) return { ok: false, error: 'below_minimum' };
  return { ok: true, discount, final };
}

const MESSAGES: Record<string, Record<string, string>> = {
  it: { invalid: 'Codice non valido', inactive: 'Codice non attivo', not_started: 'Codice non ancora valido', expired: 'Codice scaduto', exhausted: 'Codice esaurito', user_limit: 'Hai già usato questo codice', plan: 'Codice non valido per questo prodotto', currency: 'Questo codice non è valido per i pagamenti in euro', below_minimum: 'Questo codice non è valido per i pagamenti in euro' },
  en: { invalid: 'Invalid code', inactive: 'Code not active', not_started: 'Code not valid yet', expired: 'Code expired', exhausted: 'Code fully used', user_limit: 'You already used this code', plan: 'Code not valid for this product', currency: 'This code is not valid for euro payments', below_minimum: 'This code is not valid for euro payments' },
  es: { invalid: 'Código no válido', inactive: 'Código no activo', not_started: 'Código aún no válido', expired: 'Código caducado', exhausted: 'Código agotado', user_limit: 'Ya usaste este código', plan: 'Código no válido para este producto', currency: 'Este código no es válido para pagos en euros', below_minimum: 'Este código no es válido para pagos en euros' },
  pt: { invalid: 'Código inválido', inactive: 'Código inativo', not_started: 'Código ainda não válido', expired: 'Código expirado', exhausted: 'Código esgotado', user_limit: 'Você já usou este código', plan: 'Código não válido para este produto', currency: 'Este código não vale para pagamentos em euro', below_minimum: 'Este código não vale para pagamentos em euro' },
};
export function itVoucherMessage(code: string, lang?: string | null): string {
  const l = String(lang || 'it').slice(0, 2);
  return (MESSAGES[l] || MESSAGES.it)[code] || (MESSAGES[l] || MESSAGES.it).invalid;
}

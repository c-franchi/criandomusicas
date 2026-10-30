# Teste de compra — Itália (Stripe Sandbox, EUR)

Isolated test checkout for the Sandbox di Modena account (`acct_1UVMtHBI0iXvcrrH`, livemode=false).
Brazilian checkout (`create-payment`, `verify-payment`, `STRIPE_SECRET_KEY`, BRL prices) is untouched.

## Flow
1. Admin creates an order with the normal briefing/gift wizard (stays `PENDING`).
2. `/admin/teste-italia` (admins only; not linked for visitors, no IP/language redirect) → "Pagar em TESTE (EUR)".
3. `create-it-test-checkout`: verifies JWT + `has_role(admin)` server-side, accepts only `orderId`,
   `it_test_begin_checkout` derives plan/price/amount from `it_test_catalog` (owner + state checks, locks the
   gift checkout so the BR checkout cannot run in parallel), re-verifies each Stripe price (active, eur,
   livemode=false, exact amount), creates the session with an idempotency key, then `it_test_attach_session`.
4. `stripe-it-test-webhook`: raw-body signature, livemode=false, re-reads session + line items, calls
   `it_test_apply_event` (event idempotency, amount/currency/price match, paid gate, async success/failure,
   expiry). Only this marks the order `PAID` (`payment_method='stripe_it_test'`, `sandbox_market='IT_TEST'`)
   and sets the gift `payment_confirmed_at`. The card still requires ADM release. No emails, push, Meta or AI.

## Plan mapping (server-side)
- Gift: `gift.plan_id` (short 15/30, digital existing, digital new 15/30/full) + `gift_short_card` when a short has a card.
- Plain order (`single*`, not preview): `music_full`.
- Rejected: physical/shipping, vouchers (BRL discounts don't apply to EUR), `is_test` gifts, credit packs.

## Configuration (Project Settings → Secrets)
- `STRIPE_IT_TEST_RESTRICTED_KEY` — restricted **test** key (rk_test_) from the Sandbox account. Permissions:
  Checkout Sessions: **Write**; Prices: **Read**; Products: **Read**. Everything else: None.
- `STRIPE_IT_TEST_WEBHOOK_SECRET` — signing secret (whsec_) of a Sandbox webhook endpoint pointing at
  `https://haiiaqzhuydsjujtdcnq.supabase.co/functions/v1/stripe-it-test-webhook` with events
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`.
Without them both functions answer 503 `it_test_not_configured` (checkout honestly unavailable).

## Tests
- `node --experimental-strip-types --test src/lib/it-test-checkout.test.mjs`
- `supabase/tests/it_test_checkout.sql` (DO block ending in a raise → full rollback).

## Rollback
```sql
drop function if exists public.it_test_begin_checkout(uuid,uuid), public.it_test_attach_session(uuid,uuid,text,timestamptz),
 public.it_test_abort_checkout(uuid,uuid,text), public.it_test_apply_event(text,text,text,uuid,text,integer,text,boolean,text[]);
drop table if exists public.it_test_webhook_events, public.it_test_checkouts, public.it_test_catalog;
drop schema if exists it_test_private cascade;
-- orders.sandbox_market is additive; keep it (mark deprecated) rather than dropping.
```
Then delete functions `create-it-test-checkout` and `stripe-it-test-webhook`.

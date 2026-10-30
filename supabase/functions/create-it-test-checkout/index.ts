// IT/EUR sandbox checkout. Never uses the Brazilian Stripe key. Price, currency, account and
// mode come from the database catalog and are re-verified against Stripe before a session exists.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  IT_TEST_ERRORS, IT_TEST_KEY_NAME, IT_TEST_RETURN_PATH, IT_TEST_ACCOUNT_ID, IT_TEST_CURRENCY,
  isTestStripeKey, isUuid, itTestErrorCode, itTestReturnOrigin, priceMatchesCatalog, type CatalogItem,
} from "../_shared/itTestCheckout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claims, error: claimsError } = await anon.auth.getClaims(auth.slice(7));
  const userId = claims?.claims?.sub as string | undefined;
  if (claimsError || !userId) return json({ error: "Sessão expirada" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin !== true) return json({ error: IT_TEST_ERRORS.it_test_forbidden, code: "it_test_forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
  // Only the order id is accepted; amount/plan/market/currency from the browser are ignored.
  if (!body || !isUuid(body.orderId)) return json({ error: "orderId inválido" }, 400);
  const orderId = body.orderId as string;

  const key = Deno.env.get(IT_TEST_KEY_NAME);
  if (!isTestStripeKey(key)) {
    return json({ error: "Checkout de teste Itália indisponível até a configuração da credencial de teste.", code: "it_test_not_configured" }, 503);
  }

  const { data: begun, error: beginError } = await admin.rpc("it_test_begin_checkout", { p_order: orderId, p_owner: userId });
  if (beginError) {
    const code = itTestErrorCode(beginError.message);
    return json({ error: code ? IT_TEST_ERRORS[code] : "Não foi possível iniciar o teste.", code }, code ? 409 : 500);
  }
  const checkout = begun as { id: string; items: CatalogItem[]; amount_cents: number; currency: string; account_id: string };
  const abort = async (reason: string) => { await admin.rpc("it_test_abort_checkout", { p_id: checkout.id, p_owner: userId, p_reason: reason }); };

  try {
    if (checkout.currency !== IT_TEST_CURRENCY || checkout.account_id !== IT_TEST_ACCOUNT_ID) throw Error("catalog_invalid");
    const stripe = new Stripe(key!, { apiVersion: "2025-08-27.basil" });
    for (const item of checkout.items) {
      // A price from another account (e.g. Brazil) is not retrievable with this key; a live price fails livemode.
      const price = await stripe.prices.retrieve(item.price_id);
      if (!priceMatchesCatalog(price as any, item)) throw Error("price_mismatch");
    }
    const origin = itTestReturnOrigin(req.headers.get("origin"));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: checkout.items.map((i) => ({ price: i.price_id, quantity: 1 })),
      success_url: `${origin}${IT_TEST_RETURN_PATH}?checkout=${checkout.id}&esito=ok`,
      cancel_url: `${origin}${IT_TEST_RETURN_PATH}?checkout=${checkout.id}&esito=annullato`,
      client_reference_id: checkout.id,
      locale: "it",
      metadata: { it_test_checkout_id: checkout.id, order_id: orderId, market: "IT", sandbox: "true" },
      payment_intent_data: { metadata: { it_test_checkout_id: checkout.id, sandbox: "true" } },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, { idempotencyKey: `it-test-checkout/${checkout.id}` });
    if (session.livemode !== false || session.currency !== IT_TEST_CURRENCY || session.amount_total !== checkout.amount_cents || !session.url) {
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      throw Error("session_mismatch");
    }
    const { error: attachError } = await admin.rpc("it_test_attach_session", {
      p_id: checkout.id, p_owner: userId, p_session: session.id, p_expires: new Date(session.expires_at * 1000).toISOString(),
    });
    if (attachError) { await stripe.checkout.sessions.expire(session.id); throw Error("attach_failed"); }
    return json({ url: session.url, checkoutId: checkout.id, amount_cents: checkout.amount_cents, currency: "eur", test: true });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    console.error("[IT-TEST-CHECKOUT] failed", reason);
    await abort(reason);
    return json({ error: "Checkout de teste indisponível: preço/conta de teste não conferem ou o Stripe recusou a sessão.", code: "it_test_stripe_error" }, 502);
  }
});

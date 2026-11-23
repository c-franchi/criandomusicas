// Live Italian EUR checkout for music orders. Price comes only from the server catalog and is re-checked in Stripe.
import Stripe from "npm:stripe@23.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isItalySandboxOrder } from "../_shared/sandboxOrder.ts";
import { IT_LIVE_ACCOUNT_ID, IT_LIVE_ALLOWED_ORDER_PLANS, IT_LIVE_KEY_NAME, IT_LIVE_MUSIC_FULL, IT_LIVE_WEBHOOK_NAME, isLiveStripeKey, itLiveReturnOrigin, livePriceMatches, itLiveItemForOrderPlan, IT_LIVE_PACKAGE_3 } from "../_shared/itLiveCheckout.ts";
import { isUuid } from "../_shared/itTestCheckout.ts";
import { itVoucherMessage, quoteItLiveVoucher } from "../_shared/itLiveVoucher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claims } = await anon.auth.getClaims(auth.slice(7));
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return json({ error: "unauthorized" }, 401);

  const key = Deno.env.get(IT_LIVE_KEY_NAME);
  const configured = isLiveStripeKey(key) && !!Deno.env.get(IT_LIVE_WEBHOOK_NAME)?.startsWith("whsec_");
  let body: any; try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
  if (body?.action === "status") return json({ configured, amount_cents: IT_LIVE_MUSIC_FULL.unit_amount, package_amount_cents: IT_LIVE_PACKAGE_3.unit_amount, currency: "eur" });
  if (!configured) return json({ error: "not_configured", code: "it_live_not_configured" }, 503);
  if (!isUuid(body?.orderId)) return json({ error: "invalid_order" }, 400);
  const orderId = body.orderId as string;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (await isItalySandboxOrder(admin, orderId)) return json({ error: "sandbox_order", code: "it_live_unavailable" }, 409);
  const { data: order } = await admin.from("orders").select("id,user_id,payment_status,status,plan_id").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== userId) return json({ error: "forbidden" }, 403);
  if (order.payment_status === "PAID" || ["PAID", "CANCELLED", "COMPLETED"].includes(String(order.status))) return json({ error: "not_payable", code: "it_live_not_payable" }, 409);
  const { data: gift } = await admin.from("musical_gifts").select("id").eq("checkout_order_id", orderId).maybeSingle();
  if (gift) return json({ error: "gift_unavailable", code: "it_live_unavailable" }, 409);
  const item = itLiveItemForOrderPlan(order.plan_id);
  if (!item || (order.plan_id && !IT_LIVE_ALLOWED_ORDER_PLANS.includes(order.plan_id))) return json({ error: "plan_unavailable", code: "it_live_unavailable" }, 409);

  // Vouchers are re-validated on the server for every quote and checkout; the client never sends an amount.
  const base = item.unit_amount;
  let voucher: { id: string; code: string; discount: number; final: number } | null = null;
  const rawCode = typeof body?.voucherCode === "string" ? body.voucherCode.trim().toUpperCase().slice(0, 64) : "";
  if (rawCode) {
    const lang = body?.language;
    const { data: v } = await admin.from("vouchers").select("*").eq("code", rawCode).maybeSingle();
    if (!v) return json({ valid: false, error: itVoucherMessage("invalid", lang) }, body?.action === "quote" ? 200 : 409);
    const { count } = await admin.from("voucher_redemptions").select("id", { count: "exact", head: true }).eq("voucher_id", v.id).eq("user_id", userId);
    const q = quoteItLiveVoucher(v as any, base, count ?? 0);
    if (!q.ok) return json({ valid: false, error: itVoucherMessage(q.error, lang) }, body?.action === "quote" ? 200 : 409);
    voucher = { id: v.id, code: v.code, discount: q.discount, final: q.final };
  }
  if (body?.action === "quote") {
    if (!voucher) return json({ valid: false, error: itVoucherMessage("invalid", body?.language) });
    return json({ valid: true, currency: "eur", original_price: base, discount_amount: voucher.discount, final_price: voucher.final, is_free: false, voucher: { code: voucher.code, discount_type: "percent", discount_value: Math.round(voucher.discount * 100 / base) } });
  }
  const amount = voucher ? voucher.final : base;

  try {
    const stripe = new Stripe(key!, { apiVersion: "2026-09-30.endive" });
    const price = await stripe.prices.retrieve(item.price_id);
    if (!livePriceMatches(price as any, item)) throw Error("price_mismatch");
    const { data: row, error: insErr } = await admin.from("it_live_payments").insert({
      order_id: orderId, user_id: userId, plan_id: item.plan_id, price_id: price.id,
      amount_cents: amount, account_id: IT_LIVE_ACCOUNT_ID,
      original_amount_cents: base, discount_cents: voucher?.discount ?? 0, voucher_id: voucher?.id ?? null, voucher_code: voucher?.code ?? null,
    }).select("id").single();
    if (insErr || !row) throw Error("record_failed");
    const origin = itLiveReturnOrigin(req.headers.get("origin"));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      managed_payments: { enabled: false },
      adaptive_pricing: { enabled: false },
      line_items: [voucher
        ? { price_data: { currency: "eur", product: item.product_id, unit_amount: amount, tax_behavior: price.tax_behavior ?? undefined }, quantity: 1 }
        : { price: price.id, quantity: 1 }],
      success_url: `${origin}/pagamento-sucesso?order_id=${orderId}&it_payment=${row.id}`,
      cancel_url: `${origin}/checkout/${orderId}`,
      client_reference_id: row.id,
      metadata: { it_live_payment_id: row.id, order_id: orderId, user_id: userId, market: "IT" },
      payment_intent_data: { metadata: { it_live_payment_id: row.id, order_id: orderId } },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    } as any, { idempotencyKey: `it-live-checkout/${row.id}` });
    if (session.livemode !== true || session.currency !== "eur" || session.amount_total !== amount || !session.url) {
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      await admin.from("it_live_payments").update({ status: "failed" }).eq("id", row.id);
      throw Error("session_mismatch");
    }
    await admin.from("it_live_payments").update({ session_id: session.id, status: "open", updated_at: new Date().toISOString() }).eq("id", row.id);
    return json({ url: session.url, amount_cents: amount, currency: "eur" });
  } catch (e) {
    console.error("[IT-LIVE-CHECKOUT] failed", e instanceof Error ? e.message : "unknown");
    return json({ error: "provider_error", code: "it_live_stripe_error" }, 502);
  }
});

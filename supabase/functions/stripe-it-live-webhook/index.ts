// Live Italian EUR webhook. Only a signed, re-verified paid session marks an order paid.
import Stripe from "npm:stripe@23.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { IT_LIVE_MUSIC_FULL, IT_LIVE_PACKAGE_3, itLiveItemByPlanId, IT_LIVE_KEY_NAME, IT_LIVE_WEBHOOK_NAME, isLiveStripeKey, livePaidSessionValid } from "../_shared/itLiveCheckout.ts";
import { isHandledEvent, isUuid } from "../_shared/itTestCheckout.ts";
import { resolveGenerationLanguage } from "../_shared/generationLanguage.ts";
import { generationNotificationCopy } from "../_shared/orderLanguageCopy.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = Deno.env.get(IT_LIVE_KEY_NAME);
  const secret = Deno.env.get(IT_LIVE_WEBHOOK_NAME);
  if (!isLiveStripeKey(key) || !secret?.startsWith("whsec_")) return json({ error: "not_configured" }, 503);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "missing_signature" }, 400);
  const raw = await req.text();
  const stripe = new Stripe(key!, { apiVersion: "2026-09-30.endive" });
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(raw, signature, secret, undefined, Stripe.createSubtleCryptoProvider()); }
  catch { return json({ error: "invalid_signature" }, 400); }
  if (event.livemode !== true) return json({ error: "test_event_rejected" }, 400);
  if (!isHandledEvent(event.type)) return json({ received: true, result: "ignored" });
  const sent = event.data.object as Stripe.Checkout.Session;
  const paymentId = sent.metadata?.it_live_payment_id;
  if (!isUuid(paymentId)) return json({ received: true, result: "not_it_live" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: dupErr } = await admin.from("it_live_webhook_events").insert({ event_id: event.id, type: event.type, session_id: sent.id });
  if (dupErr) return json({ received: true, result: "duplicate" });
  const finish = (result: string) => admin.from("it_live_webhook_events").update({ result }).eq("event_id", event.id);

  try {
    const { data: pay } = await admin.from("it_live_payments").select("*").eq("id", paymentId).maybeSingle();
    const session = await stripe.checkout.sessions.retrieve(sent.id);
    if (!pay || pay.session_id !== session.id || session.client_reference_id !== pay.id || session.metadata?.order_id !== pay.order_id) throw Error("session_mismatch");

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      if (pay.status !== "paid") await admin.from("it_live_payments").update({ status: event.type.endsWith("expired") ? "expired" : "failed", updated_at: new Date().toISOString() }).eq("id", pay.id);
      await finish("closed"); return json({ received: true, result: "closed" });
    }
    if (session.payment_status !== "paid") { await finish("not_paid"); return json({ received: true, result: "not_paid" }); }
    const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    if (lines.data.length !== 1 || !(lines.data[0].price?.id === pay.price_id || (pay.voucher_id && lines.data[0].price?.product === itLiveItemByPlanId(pay.plan_id)?.product_id)) || lines.data[0].quantity !== 1 || !livePaidSessionValid(session as any, pay.amount_cents)) throw Error("amount_mismatch");
    if (pay.status === "paid") { await finish("already_paid"); return json({ received: true, result: "already_paid" }); }

    const { error: payErr } = await admin.from("it_live_payments").update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", pay.id).neq("status", "paid");
    if (payErr) throw payErr;
    const { data: updated, error: orderErr } = await admin.from("orders").update({ status: "PAID", payment_status: "PAID", payment_method: "card" })
      .eq("id", pay.order_id).eq("user_id", pay.user_id).neq("payment_status", "PAID").select("*");
    if (orderErr) throw orderErr;
    const o = updated?.[0];
    if (o && pay.voucher_id) await recordVoucher(admin, pay);
    // A paid 3-song package gives the remaining songs as credits; this order uses the first one.
    if (o && pay.plan_id === IT_LIVE_PACKAGE_3.plan_id) {
      const { error: credErr } = await admin.from("user_credits").insert({ user_id: pay.user_id, plan_id: o.plan_id || "package", total_credits: IT_LIVE_PACKAGE_3.credits, used_credits: 1, stripe_session_id: session.id, is_active: true });
      if (credErr) console.error("[IT-LIVE-WEBHOOK] credits failed", credErr.message);
    }
    if (o) await startProduction(admin, o, pay.user_id, session);
    await finish("paid");
    return json({ received: true, result: "paid" });
  } catch (e) {
    console.error("[IT-LIVE-WEBHOOK] failed", e instanceof Error ? e.message : "unknown");
    await admin.from("it_live_webhook_events").delete().eq("event_id", event.id); // allow Stripe retry
    return json({ error: "processing_failed" }, 500);
  }
});

async function startProduction(admin: any, o: any, userId: string, session: Stripe.Checkout.Session) {
  const language = resolveGenerationLanguage(o.language, "it");
  const copy = generationNotificationCopy(language);
  const briefing = {
    musicType: o.music_type || "homenagem", emotion: o.emotion || "alegria", emotionIntensity: o.emotion_intensity || 3,
    style: o.music_style || "pop", rhythm: o.rhythm || "moderado", atmosphere: o.atmosphere || "festivo",
    structure: o.music_structure?.split(",") || ["verse", "chorus"], hasMonologue: o.has_monologue || false,
    monologuePosition: o.monologue_position || "bridge", mandatoryWords: o.mandatory_words || "", restrictedWords: o.restricted_words || "",
    voiceType: o.voice_type || "feminina", instruments: o.instruments || [], soloInstrument: o.solo_instrument || null,
    soloMoment: o.solo_moment || null, instrumentationNotes: o.instrumentation_notes || "",
  };
  try {
    if (o.is_instrumental) await admin.functions.invoke("generate-style-prompt", { body: { orderId: o.id, isInstrumental: true, briefing, language } });
    else if (!o.has_custom_lyric) await admin.functions.invoke("generate-lyrics", { body: { orderId: o.id, story: o.story, briefing, language } });
  } catch (e) { console.error("[IT-LIVE-WEBHOOK] generation start failed", String(e)); }
  try {
    await admin.functions.invoke("send-push-notification", { body: { user_id: userId, order_id: o.id, title: copy.paymentTitle, body: copy.paymentBody, url: `/pedido/${o.id}` } });
  } catch { /* non-blocking */ }
  try {
    await admin.functions.invoke("meta-capi-purchase", { body: { transaction_id: o.id, event_id: `purchase_${o.id}`, value: (session.amount_total ?? 0) / 100, currency: "EUR", email: session.customer_details?.email ?? null } });
  } catch { /* non-blocking */ }
}

// Count the voucher only once the signed payment succeeded; a failure here must not undo the paid order.
async function recordVoucher(admin: any, pay: any) {
  try {
    const { error } = await admin.from("voucher_redemptions").insert({ voucher_id: pay.voucher_id, user_id: pay.user_id, order_id: pay.order_id, discount_applied: pay.discount_cents });
    if (error) throw error;
    const { data: v } = await admin.from("vouchers").select("current_uses").eq("id", pay.voucher_id).maybeSingle();
    await admin.from("vouchers").update({ current_uses: (v?.current_uses ?? 0) + 1 }).eq("id", pay.voucher_id);
    await admin.from("orders").update({ voucher_code: pay.voucher_code }).eq("id", pay.order_id);
  } catch (e) { console.error("[IT-LIVE-WEBHOOK] voucher record failed", e instanceof Error ? e.message : "unknown"); }
}

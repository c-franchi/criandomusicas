// Dedicated webhook for the IT/EUR sandbox account. The raw body signature is the only way a
// payment becomes confirmed; the browser success page never marks anything paid.
import Stripe from "npm:stripe@23.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { IT_TEST_KEY_NAME, IT_TEST_WEBHOOK_NAME, isHandledEvent, isTestStripeKey, isUuid } from "../_shared/itTestCheckout.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = Deno.env.get(IT_TEST_KEY_NAME);
  const secret = Deno.env.get(IT_TEST_WEBHOOK_NAME);
  if (!isTestStripeKey(key) || !secret?.startsWith("whsec_")) return json({ error: "it_test_not_configured" }, 503);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "missing_signature" }, 400);
  const raw = await req.text();
  const stripe = new Stripe(key!, { apiVersion: "2026-09-30.endive" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return json({ error: "invalid_signature" }, 400);
  }
  if (event.livemode !== false) return json({ error: "livemode_rejected" }, 400);
  if (!isHandledEvent(event.type)) return json({ received: true, result: "ignored" });

  const sent = event.data.object as Stripe.Checkout.Session;
  const checkoutId = sent.metadata?.it_test_checkout_id;
  if (!isUuid(checkoutId)) return json({ received: true, result: "not_it_test" });

  try {
    // Re-read the session and its line items from Stripe rather than trusting the payload alone.
    const session = await stripe.checkout.sessions.retrieve(sent.id);
    const lines = await stripe.checkout.sessions.listLineItems(sent.id, { limit: 10 });
    if (lines.has_more || session.metadata?.it_test_checkout_id !== checkoutId || session.client_reference_id !== checkoutId || !session.id.startsWith("cs_test_")) throw Error("session_mismatch");
    const priceIds = lines.data.flatMap((l: Stripe.LineItem) => (l.quantity === 1 && l.price?.id ? [l.price.id] : ["invalid_line"]));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("it_test_apply_event", {
      p_event_id: event.id, p_type: event.type, p_session: session.id, p_checkout: checkoutId,
      p_payment_status: session.payment_status, p_amount: session.amount_total, p_currency: session.currency,
      p_livemode: session.livemode, p_price_ids: priceIds,
    });
    if (error) throw error;
    return json({ received: true, result: data });
  } catch (e) {
    console.error("[IT-TEST-WEBHOOK] processing failed");
    return json({ error: "processing_failed" }, 500); // Stripe retries; the event row was rolled back.
  }
});

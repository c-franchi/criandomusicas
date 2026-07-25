// Generic server-side Meta Conversions API event.
// Currently used for InitiateCheckout (browser-side Purchase is handled by meta-capi-purchase).
// NOTE: This endpoint does NOT dedupe like meta-capi-purchase. Only call it once per real event.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "1411399390868441";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const normalizeEmail = (email?: string | null) =>
  email ? email.trim().toLowerCase() : null;

const normalizePhone = (phone?: string | null) => {
  if (!phone) return null;
  let digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return digits;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "META_CAPI_ACCESS_TOKEN not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  try {
    const body = await req.json();
    const {
      event_name,
      event_id,
      value,
      currency = "BRL",
      order_id,
      content_name,
      event_source_url,
      fbp,
      fbc,
      client_ip_address,
      client_user_agent,
      email,
      phone,
    } = body || {};

    if (!event_name || !event_id) {
      return new Response(
        JSON.stringify({ error: "event_name and event_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const testEventCode = Deno.env.get("META_CAPI_TEST_EVENT_CODE")?.trim() || undefined;

    const user_data: Record<string, unknown> = {};
    const em = normalizeEmail(email);
    if (em) user_data.em = [await sha256Hex(em)];
    const ph = normalizePhone(phone);
    if (ph) user_data.ph = [await sha256Hex(ph)];
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const xff = req.headers.get("x-forwarded-for") || "";
    user_data.client_ip_address = client_ip_address || xff.split(",")[0]?.trim() || undefined;
    user_data.client_user_agent = client_user_agent || req.headers.get("user-agent") || undefined;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          action_source: "website",
          event_source_url,
          user_data,
          custom_data: {
            currency,
            ...(typeof value === "number" ? { value } : {}),
            ...(order_id ? { order_id, content_ids: [order_id] } : {}),
            ...(content_name ? { content_name } : {}),
            content_type: "product",
            num_items: 1,
          },
        },
      ],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const respText = await res.text();
    if (!res.ok) console.error(`[META-CAPI-TRACK] ${event_name} failed status=${res.status}`);


    return new Response(
      JSON.stringify({ success: res.ok, status: res.status, body: respText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[META-CAPI-TRACK] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

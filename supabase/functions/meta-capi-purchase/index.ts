import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[META-CAPI] ${step}${d}`);
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
  // digits only, keep country code; assume BR (55) if missing and length 10-11
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json();
    const {
      transaction_id,
      event_id,
      value,
      currency = "BRL",
      event_source_url,
      fbp,
      fbc,
      client_ip_address,
      client_user_agent,
      email,
      phone,
      test_event_code,
    } = body || {};

    if (!transaction_id || !event_id || typeof value !== "number") {
      return new Response(
        JSON.stringify({ error: "transaction_id, event_id and numeric value are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Dedupe: refuse to re-send for the same transaction_id
    const { data: existing } = await supabase
      .from("meta_capi_events")
      .select("id")
      .eq("transaction_id", transaction_id)
      .maybeSingle();

    if (existing) {
      log("Already sent for transaction", { transaction_id });
      return new Response(
        JSON.stringify({ success: true, deduped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const user_data: Record<string, unknown> = {};
    const em = normalizeEmail(email);
    if (em) user_data.em = [await sha256Hex(em)];
    const ph = normalizePhone(phone);
    if (ph) user_data.ph = [await sha256Hex(ph)];
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;
    if (client_ip_address) user_data.client_ip_address = client_ip_address;
    if (client_user_agent) user_data.client_user_agent = client_user_agent;

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          action_source: "website",
          event_source_url,
          user_data,
          custom_data: {
            currency,
            value,
            order_id: transaction_id,
          },
        },
      ],
      ...(test_event_code ? { test_event_code } : {}),
    };

    const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const respText = await res.text();
    log("Meta response", { status: res.status });

    // Persist dedupe record (unique on transaction_id also protects against races)
    const { error: insertErr } = await supabase.from("meta_capi_events").insert({
      transaction_id,
      event_id,
      event_name: "Purchase",
      response_status: res.status,
      response_body: respText.slice(0, 2000),
    });
    if (insertErr) log("Dedupe insert error (non-blocking)", { error: insertErr.message });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, status: res.status, body: respText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Error", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

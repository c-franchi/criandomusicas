import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {




    const reqBody = await req.json();
    const { sessionId, orderId, fbp, fbc, event_source_url } = reqBody || {};
    if (!sessionId || !orderId) {
      throw new Error("Session ID and Order ID are required");
    }

    logStep("Received params", { sessionId, orderId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabaseClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!userId || session.metadata?.user_id !== userId || session.metadata?.order_id !== orderId) throw Error('Payment session does not match this order');
    const { data: gift, error: giftError } = await supabaseClient.from('musical_gifts').select('owner_id,music_source,amount_cents,is_test').eq('checkout_order_id',orderId).maybeSingle();
    if (giftError) throw giftError;
    if (gift && (gift.owner_id !== userId || gift.is_test || session.amount_total !== gift.amount_cents || session.currency !== 'brl')) throw Error('gift_order_mismatch');
    if (session.payment_status === "paid") {
      if(gift){const {error:giftPaymentError}=await supabaseClient.rpc('confirm_gift_stripe',{p_order_id:orderId,p_session:sessionId,p_amount:session.amount_total});if(giftPaymentError)throw giftPaymentError;}


      // Fetch full order data to determine type
      const { data: orderData, error: orderFetchError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderFetchError || !orderData) {
        throw new Error("Order not found");
      }

      const isInstrumental = orderData.is_instrumental === true;
      const hasCustomLyric = orderData.has_custom_lyric === true;
      
      logStep("Order type detected", { isInstrumental, hasCustomLyric });

      const planId = session.metadata?.plan_id || "single";

      const PLAN_CREDITS: Record<string, number> = {
        single: 1, single_instrumental: 1, single_custom_lyric: 1,
        package: 3, package_instrumental: 3,
        subscription: 5, subscription_instrumental: 5,
      };

      const creditsToAdd = PLAN_CREDITS[planId] || 1;

      if (creditsToAdd > 1) {
        await supabaseClient.from("user_credits").insert({
          user_id: userId,
          plan_id: planId,
          total_credits: creditsToAdd,
          used_credits: 1,
          stripe_session_id: sessionId,
          is_active: true,
        });
      }

      // Update order status to PAID (valid enum value)
      const {error:paymentUpdateError}=await supabaseClient
        .from("orders")
        .update({ status: "PAID", payment_status: "PAID" })
        .eq("id", orderId)
        .eq("user_id", userId);

      if(paymentUpdateError)throw paymentUpdateError;
      logStep("Order updated to PAID");

      // Build briefing from order data for generation
      const briefing = {
        musicType: orderData.music_type || 'homenagem',
        emotion: orderData.emotion || 'alegria',
        emotionIntensity: orderData.emotion_intensity || 3,
        style: orderData.music_style || 'pop',
        rhythm: orderData.rhythm || 'moderado',
        atmosphere: orderData.atmosphere || 'festivo',
        structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
        hasMonologue: orderData.has_monologue || false,
        monologuePosition: orderData.monologue_position || 'bridge',
        mandatoryWords: orderData.mandatory_words || '',
        restrictedWords: orderData.restricted_words || '',
        voiceType: orderData.voice_type || 'feminina',
        instruments: orderData.instruments || [],
        soloInstrument: orderData.solo_instrument || null,
        soloMoment: orderData.solo_moment || null,
        instrumentationNotes: orderData.instrumentation_notes || '',
      };

      // Route generation based on order type
      try {
        if (gift?.music_source === 'existing') {
          logStep('Existing song card: no new lyrics or music production required');
        } else if (isInstrumental) {
          // INSTRUMENTAL: generate style prompt directly, skip lyrics
          logStep("Triggering instrumental style prompt generation");
          await supabaseClient.functions.invoke("generate-style-prompt", {
            body: { orderId, isInstrumental: true, briefing },
          });
          logStep("Instrumental style prompt generated");
        } else if (hasCustomLyric) {
          // CUSTOM LYRIC: no generation needed, user approves on CreateSong page
          logStep("Custom lyric order - skipping generation, user will approve");
        } else {
          // VOCAL: generate lyrics via AI
          logStep("Triggering vocal lyrics generation");
          await supabaseClient.functions.invoke("generate-lyrics", {
            body: { orderId, story: orderData.story, briefing },
          });
          logStep("Vocal lyrics generation started");
        }
      } catch (e) {
        console.error("Generation failed:", e);
        // Don't fail the payment verification for generation errors
      }

      // Send push notification to user about payment confirmed
      try {
        await supabaseClient.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            order_id: orderId,
            title: "✅ Pagamento confirmado!",
            body: "Seu pagamento foi aprovado. Estamos criando sua música!",
            url: `/pedido/${orderId}`,
          },
        });
        logStep("User push notification sent");
      } catch (pushErr) {
        logStep("User push notification failed (non-blocking)", { error: String(pushErr) });
      }

      // Send Meta Conversions API Purchase event (server-side, deduped with Pixel via event_id)
      try {
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const currency = (session.currency || "brl").toUpperCase();

        // Prefer profile phone; fall back to customer_details from Stripe
        const { data: profileRow } = await supabaseClient
          .from("profiles")
          .select("phone, whatsapp")
          .eq("user_id", userId)
          .maybeSingle();

        const email =
          session.customer_details?.email ||
          session.customer_email ||
          null;
        const phone =
          profileRow?.whatsapp || profileRow?.phone || session.customer_details?.phone || null;

        const xff = req.headers.get("x-forwarded-for") || "";
        const client_ip_address = xff.split(",")[0]?.trim() || undefined;
        const client_user_agent = req.headers.get("user-agent") || undefined;

        await supabaseClient.functions.invoke("meta-capi-purchase", {
          body: {
            transaction_id: orderId,
            event_id: `purchase_${orderId}`,
            value: amount,
            currency,
            event_source_url,
            fbp,
            fbc,
            client_ip_address,
            client_user_agent,
            email,
            phone,
          },
        });
      } catch (capiErr) {
        console.error("[VERIFY-PAYMENT] Meta CAPI dispatch failed:", String(capiErr));
      }



      // Return order type so frontend can redirect correctly
      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          paid: true,
          message: "Pagamento confirmado.",
          orderType: isInstrumental ? "instrumental" : hasCustomLyric ? "custom_lyric" : "vocal",
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: (session.currency || "brl").toUpperCase(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ success: false, status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

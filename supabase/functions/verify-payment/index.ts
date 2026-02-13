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
    logStep("Function started");

    const { sessionId, orderId } = await req.json();
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

    if (session.payment_status === "paid") {
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
      await supabaseClient
        .from("orders")
        .update({ status: "PAID", payment_status: "PAID" })
        .eq("id", orderId)
        .eq("user_id", userId);

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
        if (isInstrumental) {
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

      // Return order type so frontend can redirect correctly
      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          message: "Pagamento confirmado.",
          orderType: isInstrumental ? "instrumental" : hasCustomLyric ? "custom_lyric" : "vocal",
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

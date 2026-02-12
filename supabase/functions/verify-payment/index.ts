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
        JSON.stringify({
          success: false,
          error: "Não autorizado",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabaseClient.auth.getClaims(token);

    const userId = claimsData?.claims?.sub as string;
    const userEmail = claimsData?.claims?.email as string;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const { data: orderData } = await supabaseClient.from("orders").select("*").eq("id", orderId).single();

      const { data: profileData } = await supabaseClient.from("profiles").select("name").eq("user_id", userId).single();

      const planId = session.metadata?.plan_id || "single";

      const PLAN_CREDITS: Record<string, number> = {
        single: 1,
        single_instrumental: 1,
        single_custom_lyric: 1,
        package: 3,
        package_instrumental: 3,
        subscription: 5,
        subscription_instrumental: 5,
      };

      const PLAN_NAMES: Record<string, string> = {
        single: "Música Única",
        single_instrumental: "Música Única Instrumental",
        single_custom_lyric: "Música com Letra Personalizada",
        package: "Pacote 3 Músicas",
        package_instrumental: "Pacote 3 Músicas Instrumental",
        subscription: "Pacote 5 Músicas",
        subscription_instrumental: "Pacote 5 Músicas Instrumental",
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

      await supabaseClient
        .from("orders")
        .update({
          status: "PROCESSING",
          payment_status: "PAID",
        })
        .eq("id", orderId)
        .eq("user_id", userId);

      logStep("Order updated to PROCESSING");

      // 🔥 DISPARA GERAÇÃO AUTOMÁTICA
      try {
        logStep("Triggering generation");

        const { error: generationError } = await supabaseClient.functions.invoke("generate-lyrics", {
          body: { orderId },
        });

        if (generationError) throw generationError;

        logStep("Generation started successfully");
      } catch (e) {
        console.error("Generation failed:", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          message: "Pagamento confirmado e geração iniciada.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: session.payment_status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

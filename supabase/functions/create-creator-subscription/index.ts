import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREATOR-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map plan IDs to Stripe price IDs and config
const PLAN_PRICES: Record<string, { priceId: string; credits: number; name: string }> = {
  'creator_start': { priceId: 'price_1SttuCCqEk0oYMYYZiZ1STDQ', credits: 50, name: 'Creator Start' },
  'creator_pro': { priceId: 'price_1SttueCqEk0oYMYYw1wy4Obg', credits: 150, name: 'Creator Pro' },
  'creator_studio': { priceId: 'price_1SttuwCqEk0oYMYYRa3G4KIL', credits: 300, name: 'Creator Studio' },
  'creator_start_instrumental': { priceId: 'price_1SttvFCqEk0oYMYYfEimVHzi', credits: 50, name: 'Creator Start Instrumental' },
  'creator_pro_instrumental': { priceId: 'price_1SttvvCqEk0oYMYYr6NCCjTr', credits: 150, name: 'Creator Pro Instrumental' },
  'creator_studio_instrumental': { priceId: 'price_1SttwHCqEk0oYMYY74BSnV1W', credits: 300, name: 'Creator Studio Instrumental' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { planId } = await req.json();
    if (!planId || !PLAN_PRICES[planId]) {
      throw new Error("Invalid plan ID");
    }

    const planConfig = PLAN_PRICES[planId];
    logStep("Plan selected", { planId, ...planConfig });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Check if user already has an active subscription
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
      });
      
      const existingCreatorSub = subscriptions.data.find(
        (sub: Stripe.Subscription) => sub.metadata?.plan_type === 'creator'
      );
      
      if (existingCreatorSub) {
        logStep("User already has active creator subscription");
        throw new Error("Você já possui uma assinatura Creator ativa. Cancele a atual antes de assinar outro plano.");
      }
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://criandomusicas.lovable.app";

    // Create a subscription session with Stripe price ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price: planConfig.priceId,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${origin}/planos?subscription=success&plan=${planId}`,
      cancel_url: `${origin}/planos`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_type: 'creator',
        credits: String(planConfig.credits),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_type: 'creator',
          credits: String(planConfig.credits),
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

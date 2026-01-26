import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CREATOR-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_id: null,
        credits_remaining: 0,
        credits_total: 0,
        subscription_end: null,
        current_period_start: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active creator subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const creatorSub = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.metadata?.plan_type === 'creator'
    );

    if (!creatorSub) {
      logStep("No active creator subscription");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_id: null,
        credits_remaining: 0,
        credits_total: 0,
        subscription_end: null,
        current_period_start: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const planId = creatorSub.metadata?.plan_id || null;
    const creditsTotal = parseInt(creatorSub.metadata?.credits || '0');
    const subscriptionEnd = new Date(creatorSub.current_period_end * 1000).toISOString();
    const currentPeriodStart = new Date(creatorSub.current_period_start * 1000).toISOString();

    logStep("Active creator subscription found", { 
      subscriptionId: creatorSub.id, 
      planId, 
      creditsTotal,
      subscriptionEnd 
    });

    // Count orders created in current billing period
    const { count: usedCredits, error: countError } = await supabaseClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', currentPeriodStart)
      .in('payment_status', ['PAID'])
      .not('plan_id', 'is', null);

    if (countError) {
      logStep("Error counting used credits", { error: countError.message });
    }

    const creditsUsed = usedCredits || 0;
    const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);

    logStep("Credits calculated", { creditsTotal, creditsUsed, creditsRemaining });

    return new Response(JSON.stringify({
      subscribed: true,
      plan_id: planId,
      credits_remaining: creditsRemaining,
      credits_total: creditsTotal,
      credits_used: creditsUsed,
      subscription_end: subscriptionEnd,
      current_period_start: currentPeriodStart,
      subscription_id: creatorSub.id,
    }), {
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

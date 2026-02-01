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
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Authentication failed", { error: claimsError?.message });
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

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    
    if (!userEmail) {
      logStep("User email not available in claims");
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
    
    logStep("User authenticated", { userId, email: userEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

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
    
    // Get period data - try from subscription root first, then from items
    let currentPeriodEndTs = creatorSub.current_period_end;
    let currentPeriodStartTs = creatorSub.current_period_start;

    // Fallback: read from subscription items if not in root (Stripe API 2025-08-27.basil)
    if (!currentPeriodEndTs || !currentPeriodStartTs) {
      logStep("Period data not in root, checking items.data[0]");
      const firstItem = creatorSub.items?.data?.[0];
      if (firstItem) {
        currentPeriodEndTs = firstItem.current_period_end;
        currentPeriodStartTs = firstItem.current_period_start;
        logStep("Found period data in items", { currentPeriodEndTs, currentPeriodStartTs });
      }
    }

    // Ultimate fallback: retrieve full subscription
    if (!currentPeriodEndTs || !currentPeriodStartTs) {
      logStep("Fetching full subscription details via retrieve()");
      const fullSub = await stripe.subscriptions.retrieve(creatorSub.id);
      currentPeriodEndTs = fullSub.current_period_end;
      currentPeriodStartTs = fullSub.current_period_start;
      logStep("Retrieved period data", { currentPeriodEndTs, currentPeriodStartTs });
    }

    if (!currentPeriodEndTs || !currentPeriodStartTs || typeof currentPeriodEndTs !== 'number' || typeof currentPeriodStartTs !== 'number') {
      logStep("Invalid subscription period data after all fallbacks", { currentPeriodEndTs, currentPeriodStartTs });
      throw new Error("Subscription period data is missing or invalid");
    }

    const subscriptionEnd = new Date(currentPeriodEndTs * 1000).toISOString();
    const currentPeriodStart = new Date(currentPeriodStartTs * 1000).toISOString();

    // Check if subscription is scheduled for cancellation
    const cancelAtPeriodEnd = creatorSub.cancel_at_period_end || false;
    const canceledAt = creatorSub.canceled_at 
      ? new Date(creatorSub.canceled_at * 1000).toISOString() 
      : null;

    logStep("Active creator subscription found", { 
      subscriptionId: creatorSub.id, 
      planId, 
      creditsTotal,
      subscriptionEnd,
      currentPeriodStart,
      cancelAtPeriodEnd,
      canceledAt
    });

    // Count orders created in current billing period with relevant statuses
    // Universal credits: count ALL creator orders regardless of type
    const { count: usedCredits, error: countError } = await supabaseClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', currentPeriodStart)
      .in('payment_status', ['PAID'])
      .in('status', ['PAID', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'])
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
      cancel_at_period_end: cancelAtPeriodEnd,
      canceled_at: canceledAt,
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

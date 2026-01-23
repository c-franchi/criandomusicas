import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Get order ID and plan ID from request body
    const { orderId, planId = "single" } = await req.json();
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    logStep("Order ID received", { orderId, planId });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Check order type (instrumental, custom lyric, or vocal) to use correct pricing
    const { data: orderInfo, error: orderError } = await supabaseClient
      .from('orders')
      .select('is_instrumental, has_custom_lyric')
      .eq('id', orderId)
      .single();

    if (orderError) {
      logStep("Error fetching order info", { error: orderError.message });
    }

    const isInstrumental = orderInfo?.is_instrumental === true;
    const hasCustomLyric = orderInfo?.has_custom_lyric === true;
    
    // Determine the effective plan ID based on order type
    let effectivePlanId = planId;
    if (hasCustomLyric) {
      effectivePlanId = 'single_custom_lyric';
    } else if (isInstrumental) {
      effectivePlanId = `${planId}_instrumental`;
    }
    
    logStep("Determined plan", { isInstrumental, hasCustomLyric, effectivePlanId });

    // Get pricing configuration from database - try instrumental variant first
    let pricingConfig = null;
    let priceInCents = 990;
    let productName = "Música Personalizada";
    
    const { data: effectivePricing, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('id', effectivePlanId)
      .single();

    if (!pricingError && effectivePricing) {
      pricingConfig = effectivePricing;
      priceInCents = effectivePricing.price_promo_cents || effectivePricing.price_cents;
      productName = effectivePricing.name;
      logStep("Using effective plan pricing", { priceInCents, productName });
    } else {
      logStep("Pricing config not found for effective plan, trying base plan");
      // Fallback to base plan if instrumental variant not found
      const { data: basePricing } = await supabaseClient
        .from('pricing_config')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (basePricing) {
        pricingConfig = basePricing;
        // Apply 20% discount for instrumental if base plan found, round to .90
        const basePrice = basePricing.price_promo_cents || basePricing.price_cents;
        if (isInstrumental) {
          const discounted = basePrice * 0.8;
          // Round to nearest 100 cents, then subtract 10 to end in .90
          priceInCents = Math.round(discounted / 100) * 100 - 10;
          if (priceInCents < 100) priceInCents = Math.round(discounted);
        } else {
          priceInCents = basePrice;
        }
        productName = isInstrumental 
          ? `${basePricing.name} (Instrumental)` 
          : basePricing.name;
        
        logStep("Using base price with discount", { priceInCents, productName, isInstrumental });
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://id-preview--8b44c89b-d4bc-4aa8-b6fd-85522e79ace9.lovable.app";

    // Use existing stripe_price_id if available in pricing config
    let lineItems;
    if (pricingConfig?.stripe_price_id) {
      lineItems = [{ price: pricingConfig.stripe_price_id, quantity: 1 }];
      logStep("Using Stripe price ID", { priceId: pricingConfig.stripe_price_id });
    } else {
      // Create inline price data for dynamic pricing
      let description = 'Uma música exclusiva criada com IA baseada na sua história';
      if (hasCustomLyric) {
        description = 'Uma música exclusiva criada com sua letra personalizada';
      } else if (isInstrumental) {
        description = 'Uma música instrumental exclusiva criada com IA';
      }
      
      lineItems = [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: productName,
            description
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }];
      logStep("Using inline price data", { priceInCents, productName });
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/pagamento-sucesso?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pedido/${orderId}`,
      metadata: {
        order_id: orderId,
        user_id: user.id,
        plan_id: effectivePlanId,
        is_instrumental: String(isInstrumental),
        has_custom_lyric: String(hasCustomLyric)
      }
    });

    // Update order amount in database
    await supabaseClient
      .from('orders')
      .update({ amount: priceInCents })
      .eq('id', orderId);

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

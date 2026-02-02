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

// Fallback map for plan credits (used when DB doesn't have the info)
const PLAN_CREDITS: Record<string, { credits: number; name: string }> = {
  'creator_start': { credits: 40, name: 'Creator Start' },
  'creator_pro': { credits: 150, name: 'Creator Pro' },
  'creator_studio': { credits: 230, name: 'Creator Studio' },
  'creator_start_instrumental': { credits: 50, name: 'Creator Start Instrumental' },
  'creator_pro_instrumental': { credits: 150, name: 'Creator Pro Instrumental' },
  'creator_studio_instrumental': { credits: 300, name: 'Creator Studio Instrumental' },
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

    const { planId, voucherCode } = await req.json();
    
    // Validate plan ID
    const planCredits = PLAN_CREDITS[planId];
    if (!planId || !planCredits) {
      throw new Error("Invalid plan ID");
    }

    // Fetch stripe_price_id and credits from database
    const { data: pricingConfig, error: pricingError } = await supabaseClient
      .from('pricing_config')
      .select('stripe_price_id, price_cents, price_promo_cents, name, credits')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (pricingError) {
      logStep("Error fetching pricing config", { error: pricingError.message });
      throw new Error("Erro ao buscar configuração de preço");
    }

    if (!pricingConfig?.stripe_price_id) {
      logStep("No stripe_price_id found for plan", { planId });
      throw new Error("Este plano não está configurado corretamente. Por favor, contate o suporte.");
    }

    // Use credits from database, fallback to hardcoded values
    const dbCredits = pricingConfig.credits ?? planCredits.credits;
    const planConfig = {
      priceId: pricingConfig.stripe_price_id,
      credits: dbCredits,
      name: pricingConfig.name || planCredits.name,
    };
    
    logStep("Plan selected from database", { planId, ...planConfig, voucherCode: voucherCode || 'none' });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub || !claimsData?.claims?.email) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Sessão expirada. Por favor, faça login novamente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    logStep("User authenticated", { email: userEmail });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
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

    // Handle voucher/coupon if provided
    let stripeCouponId: string | undefined;
    if (voucherCode) {
      // Fetch voucher from database
      const { data: voucher, error: voucherError } = await supabaseClient
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (voucherError || !voucher) {
        logStep("Voucher not found or invalid", { code: voucherCode });
      } else {
        // Check validity
        const now = new Date();
        const isValid = 
          (!voucher.valid_from || new Date(voucher.valid_from) <= now) &&
          (!voucher.valid_until || new Date(voucher.valid_until) >= now) &&
          (voucher.max_uses === null || voucher.current_uses < voucher.max_uses) &&
          (!voucher.plan_ids || voucher.plan_ids.length === 0 || voucher.plan_ids.includes(planId));

        if (isValid) {
          // Use existing Stripe coupon ID if available, or create one dynamically
          if (voucher.stripe_coupon_id) {
            stripeCouponId = voucher.stripe_coupon_id;
            logStep("Using existing Stripe coupon", { couponId: stripeCouponId });
          } else {
            // Create a Stripe coupon dynamically
            try {
              const couponParams: Stripe.CouponCreateParams = {
                duration: 'once',
                name: `Voucher ${voucher.code}`,
              };

              if (voucher.discount_type === 'percent') {
                couponParams.percent_off = voucher.discount_value;
              } else {
                couponParams.amount_off = voucher.discount_value;
                couponParams.currency = 'brl';
              }

              const stripeCoupon = await stripe.coupons.create(couponParams);
              stripeCouponId = stripeCoupon.id;
              logStep("Created Stripe coupon", { couponId: stripeCouponId });

              // Optionally update the voucher with the Stripe coupon ID for future use
              await supabaseClient
                .from('vouchers')
                .update({ stripe_coupon_id: stripeCouponId })
                .eq('id', voucher.id);
            } catch (couponError) {
              logStep("Error creating Stripe coupon", { error: String(couponError) });
            }
          }
        } else {
          logStep("Voucher validation failed", { code: voucherCode });
        }
      }
    }

    // Create a subscription session with Stripe price ID
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{
        price: planConfig.priceId,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${origin}/dashboard?subscription=success&plan=${planId}`,
      cancel_url: `${origin}/creator-checkout/${planId}`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        plan_type: 'creator',
        credits: String(planConfig.credits),
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId,
          plan_type: 'creator',
          credits: String(planConfig.credits),
        },
      },
    };

    // Add discount if voucher was validated
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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

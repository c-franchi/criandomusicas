import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE-PRICES] ${step}${detailsStr}`);
};

// Map plan IDs to Stripe product metadata
const PLAN_PRODUCT_CONFIG: Record<string, { name: string; description: string; type: 'one_time' | 'recurring'; credits?: number }> = {
  // One-time packages
  'single': { name: '1 Crédito Universal', description: 'Crédito único para criar uma música', type: 'one_time', credits: 1 },
  'package': { name: '3 Créditos Universais', description: 'Pacote com 3 créditos para criação de músicas', type: 'one_time', credits: 3 },
  'subscription': { name: '5 Créditos Universais', description: 'Pacote com 5 créditos para criação de músicas', type: 'one_time', credits: 5 },
  // Creator subscriptions
  'creator_start': { name: 'Creator Start', description: 'Plano mensal com 50 créditos para criadores', type: 'recurring', credits: 50 },
  'creator_pro': { name: 'Creator Pro', description: 'Plano mensal com 150 créditos para criadores profissionais', type: 'recurring', credits: 150 },
  'creator_studio': { name: 'Creator Studio', description: 'Plano mensal com 300 créditos para estúdios', type: 'recurring', credits: 300 },
  // Instrumental variants
  'creator_start_instrumental': { name: 'Creator Start Instrumental', description: 'Plano mensal com 50 créditos instrumentais', type: 'recurring', credits: 50 },
  'creator_pro_instrumental': { name: 'Creator Pro Instrumental', description: 'Plano mensal com 150 créditos instrumentais', type: 'recurring', credits: 150 },
  'creator_studio_instrumental': { name: 'Creator Studio Instrumental', description: 'Plano mensal com 300 créditos instrumentais', type: 'recurring', credits: 300 },
};

interface PricingConfig {
  id: string;
  name: string;
  price_cents: number;
  price_promo_cents: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Verify admin authentication
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

    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Sessão expirada. Por favor, faça login novamente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      logStep("User is not admin", { userId });
      return new Response(JSON.stringify({ error: "Apenas administradores podem sincronizar preços" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin verified");

    // Get plans to sync from request body
    const { plans } = await req.json() as { plans: PricingConfig[] };
    if (!plans || !Array.isArray(plans)) {
      throw new Error("Lista de planos não fornecida");
    }

    logStep("Plans received", { count: plans.length });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const updatedPlans: { id: string; stripe_price_id: string }[] = [];
    const syncResults: { id: string; status: string; error?: string }[] = [];

    for (const plan of plans) {
      try {
        const productConfig = PLAN_PRODUCT_CONFIG[plan.id];
        if (!productConfig) {
          logStep("Unknown plan, skipping", { planId: plan.id });
          syncResults.push({ id: plan.id, status: 'skipped', error: 'Plano desconhecido' });
          continue;
        }

        // Use promo price if available, otherwise use regular price
        const priceInCents = plan.price_promo_cents || plan.price_cents;

        // Validate minimum price (R$ 1,00 = 100 centavos)
        if (priceInCents < 100) {
          logStep("Price too low", { planId: plan.id, price: priceInCents });
          syncResults.push({ id: plan.id, status: 'error', error: 'Preço mínimo é R$ 1,00' });
          continue;
        }

        logStep("Processing plan", { planId: plan.id, price: priceInCents, type: productConfig.type });

        // Find or create product in Stripe
        let productId: string;
        const existingProducts = await stripe.products.search({
          query: `metadata['plan_id']:'${plan.id}'`,
          limit: 1,
        });

        if (existingProducts.data.length > 0) {
          productId = existingProducts.data[0].id;
          logStep("Found existing product", { productId });

          // Update product name if changed
          await stripe.products.update(productId, {
            name: productConfig.name,
            description: productConfig.description,
          });
        } else {
          // Create new product
          const newProduct = await stripe.products.create({
            name: productConfig.name,
            description: productConfig.description,
            metadata: {
              plan_id: plan.id,
              credits: String(productConfig.credits || 0),
            },
          });
          productId = newProduct.id;
          logStep("Created new product", { productId });
        }

        // Check current price in Stripe
        let needsNewPrice = true;
        if (plan.stripe_price_id) {
          try {
            const currentPrice = await stripe.prices.retrieve(plan.stripe_price_id);
            if (currentPrice.unit_amount === priceInCents && currentPrice.active) {
              logStep("Price unchanged", { planId: plan.id, priceId: plan.stripe_price_id });
              needsNewPrice = false;
              syncResults.push({ id: plan.id, status: 'unchanged' });
            }
          } catch (e) {
            logStep("Current price not found, will create new", { planId: plan.id });
          }
        }

        if (needsNewPrice) {
          // Create new price (Stripe prices are immutable)
          const priceParams: Stripe.PriceCreateParams = {
            product: productId,
            unit_amount: priceInCents,
            currency: 'brl',
            metadata: {
              plan_id: plan.id,
            },
          };

          // Add recurring interval for subscription plans
          if (productConfig.type === 'recurring') {
            priceParams.recurring = { interval: 'month' };
          }

          const newPrice = await stripe.prices.create(priceParams);
          logStep("Created new price", { priceId: newPrice.id, amount: priceInCents });

          // Archive old price if exists
          if (plan.stripe_price_id) {
            try {
              await stripe.prices.update(plan.stripe_price_id, { active: false });
              logStep("Archived old price", { oldPriceId: plan.stripe_price_id });
            } catch (e) {
              logStep("Could not archive old price", { oldPriceId: plan.stripe_price_id });
            }
          }

          // Update database with new stripe_price_id
          const { error: updateError } = await supabaseAdmin
            .from('pricing_config')
            .update({ stripe_price_id: newPrice.id })
            .eq('id', plan.id);

          if (updateError) {
            logStep("Error updating database", { error: updateError.message });
            syncResults.push({ id: plan.id, status: 'error', error: 'Erro ao atualizar banco de dados' });
          } else {
            updatedPlans.push({ id: plan.id, stripe_price_id: newPrice.id });
            syncResults.push({ id: plan.id, status: 'synced' });
            logStep("Plan synced successfully", { planId: plan.id, newPriceId: newPrice.id });
          }
        }
      } catch (planError) {
        const errorMessage = planError instanceof Error ? planError.message : String(planError);
        logStep("Error processing plan", { planId: plan.id, error: errorMessage });
        syncResults.push({ id: plan.id, status: 'error', error: errorMessage });
      }
    }

    logStep("Sync completed", { 
      total: plans.length, 
      synced: updatedPlans.length,
      results: syncResults 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      updatedPlans,
      syncResults,
      message: `${updatedPlans.length} plano(s) sincronizado(s) com sucesso`
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

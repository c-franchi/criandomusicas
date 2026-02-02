import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-VOUCHER] ${step}${detailsStr}`);
};

// Normalize plan ID variants to base tier for universal credits
const normalizeToBasePlan = (planId: string): string => {
  if (planId.startsWith('single')) return 'single';
  if (planId.startsWith('package')) return 'package';
  if (planId.startsWith('subscription')) return 'subscription';
  if (planId.startsWith('creator_')) return planId; // Creator plans stay as-is
  return planId;
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

    const { code, planId = "single" } = await req.json();
    if (!code) {
      throw new Error("Voucher code is required");
    }
    logStep("Validating voucher", { code, planId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
      }
    }
    logStep("User auth", { userId: userId ? "authenticated" : "anonymous" });

    // Fetch voucher by code
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (voucherError) {
      logStep("Database error", { error: voucherError.message });
      throw new Error("Erro ao buscar voucher");
    }

    if (!voucher) {
      logStep("Voucher not found");
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Voucher não encontrado ou inativo" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Voucher found", { id: voucher.id, discount_type: voucher.discount_type });

    // Check validity period
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Este voucher ainda não está ativo" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Este voucher expirou" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check max uses
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Este voucher atingiu o limite de usos" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check plan restriction - normalize to base plan for universal credits
    if (voucher.plan_ids && voucher.plan_ids.length > 0) {
      const basePlanId = normalizeToBasePlan(planId);
      const hasValidPlan = voucher.plan_ids.some((allowedPlan: string) => 
        normalizeToBasePlan(allowedPlan) === basePlanId
      );
      
      if (!hasValidPlan) {
        logStep("Plan restriction failed", { planId, basePlanId, allowedPlans: voucher.plan_ids });
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Este voucher não é válido para o plano selecionado" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Check if user already used this voucher too many times (if authenticated)
    if (userId) {
      const { data: userRedemptions, error: redemptionError } = await supabaseClient
        .from('voucher_redemptions')
        .select('id')
        .eq('voucher_id', voucher.id)
        .eq('user_id', userId);

      if (redemptionError) {
        logStep("Redemption check error", { error: redemptionError.message });
      }

      const userUsageCount = userRedemptions?.length || 0;
      const maxUsesPerUser = voucher.max_uses_per_user;

      // Check per-user limit if set
      if (maxUsesPerUser !== null && userUsageCount >= maxUsesPerUser) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: maxUsesPerUser === 1 
            ? "Você já utilizou este voucher" 
            : `Você atingiu o limite de ${maxUsesPerUser} usos deste voucher`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get pricing to calculate final price
    const { data: pricing } = await supabaseClient
      .from('pricing_config')
      .select('price_cents, price_promo_cents')
      .eq('id', planId)
      .single();

    const originalPrice = pricing?.price_promo_cents || pricing?.price_cents || 990;
    let discountAmount = 0;
    let finalPrice = originalPrice;

    if (voucher.discount_type === 'percent') {
      discountAmount = Math.round(originalPrice * voucher.discount_value / 100);
      finalPrice = originalPrice - discountAmount;
    } else if (voucher.discount_type === 'fixed') {
      discountAmount = Math.min(voucher.discount_value, originalPrice);
      finalPrice = originalPrice - discountAmount;
    }

    finalPrice = Math.max(0, finalPrice);

    logStep("Voucher validated", { 
      discountAmount, 
      finalPrice, 
      discountType: voucher.discount_type,
      discountValue: voucher.discount_value 
    });

    return new Response(JSON.stringify({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
      },
      original_price: originalPrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      is_free: finalPrice === 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ valid: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-VOUCHER] ${step}${detailsStr}`);
};

const normalizeToBasePlan = (planId: string): string => {
  if (planId.startsWith('single')) return 'single';
  if (planId.startsWith('package')) return 'package';
  if (planId.startsWith('subscription')) return 'subscription';
  if (planId.startsWith('creator_')) return planId;
  return planId;
};

// Helper: respond with a user-facing failure (HTTP 200 so the client can read the message)
const userError = (message: string, status = 200) =>
  new Response(JSON.stringify({ success: false, error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { code, orderId, planId = "single" } = await req.json();
    if (!code || !orderId) {
      return userError("Código do voucher e pedido são obrigatórios", 400);
    }
    logStep("Applying voucher", { code, orderId, planId });

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return userError("Não autorizado", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Authentication failed", { error: claimsError?.message });
      return userError("Sessão expirada. Por favor, faça login novamente.", 401);
    }
    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, amount, payment_status, is_instrumental, has_custom_lyric')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return userError("Pedido não encontrado");
    }
    if (order.user_id !== userId) {
      return userError("Este pedido não pertence a você");
    }
    if (order.payment_status === 'PAID') {
      return userError("Este pedido já foi pago");
    }

    // Voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (voucherError) {
      logStep("Database error fetching voucher", { error: voucherError.message });
      throw new Error("Erro ao buscar voucher");
    }
    if (!voucher) {
      return userError("Voucher não encontrado ou inativo");
    }
    logStep("Voucher found", { voucherId: voucher.id });

    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      return userError("Este voucher ainda não está ativo");
    }
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return userError("Este voucher expirou");
    }
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      return userError("Este voucher atingiu o limite de usos");
    }

    if (voucher.plan_ids && voucher.plan_ids.length > 0) {
      const basePlanId = normalizeToBasePlan(planId);
      const hasValidPlan = voucher.plan_ids.some((allowedPlan: string) =>
        normalizeToBasePlan(allowedPlan) === basePlanId
      );
      if (!hasValidPlan) {
        logStep("Plan restriction failed", { planId, basePlanId, allowedPlans: voucher.plan_ids });
        return userError("Este voucher não é válido para o plano selecionado");
      }
    }

    // Per-user usage check (mirrors validate-voucher)
    const { data: userRedemptions, error: redemptionCheckError } = await supabaseClient
      .from('voucher_redemptions')
      .select('id')
      .eq('voucher_id', voucher.id)
      .eq('user_id', userId);

    if (redemptionCheckError) {
      logStep("Redemption check error", { error: redemptionCheckError.message });
    }
    const userUsageCount = userRedemptions?.length || 0;
    const maxUsesPerUser = voucher.max_uses_per_user;

    if (maxUsesPerUser !== null && userUsageCount >= maxUsesPerUser) {
      return userError(
        maxUsesPerUser === 1
          ? "Você já utilizou este voucher"
          : `Você atingiu o limite de ${maxUsesPerUser} usos deste voucher`
      );
    }

    // Pricing
    const { data: pricing } = await supabaseClient
      .from('pricing_config')
      .select('price_cents, price_promo_cents')
      .eq('id', planId)
      .single();

    const originalPrice = pricing?.price_promo_cents || pricing?.price_cents || 990;
    let discountAmount = 0;

    if (voucher.discount_type === 'percent') {
      discountAmount = Math.round(originalPrice * voucher.discount_value / 100);
    } else if (voucher.discount_type === 'fixed') {
      discountAmount = Math.min(voucher.discount_value, originalPrice);
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);
    const isFree = finalPrice === 0;

    logStep("Discount calculated", { originalPrice, discountAmount, finalPrice, isFree });

    // Persist redemption
    const { error: redemptionError } = await supabaseClient
      .from('voucher_redemptions')
      .insert({
        voucher_id: voucher.id,
        user_id: userId,
        order_id: orderId,
        discount_applied: discountAmount,
      });

    if (redemptionError) {
      logStep("Redemption insert error", { error: redemptionError.message });
      throw new Error("Erro ao registrar uso do voucher");
    }

    await supabaseClient
      .from('vouchers')
      .update({ current_uses: voucher.current_uses + 1 })
      .eq('id', voucher.id);

    const orderUpdate: Record<string, any> = {
      voucher_code: voucher.code,
      discount_applied: discountAmount,
      amount: finalPrice,
    };

    if (isFree) {
      orderUpdate.payment_status = 'PAID';
      orderUpdate.status = (order.is_instrumental || order.has_custom_lyric) ? 'LYRICS_APPROVED' : 'LYRICS_PENDING';
    }

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId);

    if (updateError) {
      logStep("Order update error", { error: updateError.message });
      throw new Error("Erro ao atualizar pedido");
    }

    if (isFree) {
      logStep("Free voucher order - admin will be notified after lyrics approval");
    }

    logStep("Voucher applied successfully", { isFree, finalPrice });

    return new Response(JSON.stringify({
      success: true,
      is_free: isFree,
      original_price: originalPrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      message: isFree
        ? "Voucher aplicado! Sua música será gerada gratuitamente."
        : `Voucher aplicado! Desconto de R$ ${(discountAmount / 100).toFixed(2).replace('.', ',')}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("UNEXPECTED ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

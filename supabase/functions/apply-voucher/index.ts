import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-VOUCHER] ${step}${detailsStr}`);
};

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
      throw new Error("Voucher code and order ID are required");
    }
    logStep("Applying voucher", { code, orderId, planId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: authData } = await supabaseAuth.auth.getUser(token);
    const user = authData.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, user_id, amount, payment_status, is_instrumental')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Pedido não encontrado");
    }

    if (order.user_id !== user.id) {
      throw new Error("Este pedido não pertence a você");
    }

    if (order.payment_status === 'PAID') {
      throw new Error("Este pedido já foi pago");
    }

    // Fetch voucher by code
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (voucherError || !voucher) {
      throw new Error("Voucher não encontrado ou inativo");
    }

    logStep("Voucher found", { voucherId: voucher.id });

    // Validate voucher (same checks as validate-voucher)
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      throw new Error("Este voucher ainda não está ativo");
    }
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      throw new Error("Este voucher expirou");
    }
    if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
      throw new Error("Este voucher atingiu o limite de usos");
    }
    if (voucher.plan_ids && voucher.plan_ids.length > 0 && !voucher.plan_ids.includes(planId)) {
      throw new Error("Este voucher não é válido para o plano selecionado");
    }

    // Check if user already used this voucher
    const { data: existingRedemption } = await supabaseClient
      .from('voucher_redemptions')
      .select('id')
      .eq('voucher_id', voucher.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRedemption) {
      throw new Error("Você já utilizou este voucher");
    }

    // Get pricing
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

    // Create redemption record
    const { error: redemptionError } = await supabaseClient
      .from('voucher_redemptions')
      .insert({
        voucher_id: voucher.id,
        user_id: user.id,
        order_id: orderId,
        discount_applied: discountAmount,
      });

    if (redemptionError) {
      logStep("Redemption error", { error: redemptionError.message });
      throw new Error("Erro ao registrar uso do voucher");
    }

    // Increment voucher usage
    await supabaseClient
      .from('vouchers')
      .update({ current_uses: voucher.current_uses + 1 })
      .eq('id', voucher.id);

    // Update order with voucher info and potentially mark as paid
    const orderUpdate: Record<string, any> = {
      voucher_code: voucher.code,
      discount_applied: discountAmount,
      amount: finalPrice,
    };

    if (isFree) {
      orderUpdate.payment_status = 'PAID';
      // Instrumental goes directly to production (LYRICS_APPROVED = ready for style prompt)
      // Vocal needs to generate lyrics first (LYRICS_PENDING)
      orderUpdate.status = order.is_instrumental ? 'LYRICS_APPROVED' : 'LYRICS_PENDING';
    }

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId);

    if (updateError) {
      logStep("Order update error", { error: updateError.message });
      throw new Error("Erro ao atualizar pedido");
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
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

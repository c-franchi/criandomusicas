import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[USE-CREDIT] ${step}${detailsStr}`);
};

// Credit type compatibility:
// - 'vocal' credits can be used for: vocal songs, custom lyric songs
// - 'instrumental' credits can be used for: instrumental songs only
const getCreditType = (planId: string): 'vocal' | 'instrumental' => {
  return planId.includes('instrumental') ? 'instrumental' : 'vocal';
};

const isCreditCompatible = (planId: string, orderType: 'vocal' | 'instrumental' | 'custom_lyric'): boolean => {
  const creditType = getCreditType(planId);
  
  if (creditType === 'instrumental') {
    return orderType === 'instrumental';
  }
  
  return orderType === 'vocal' || orderType === 'custom_lyric';
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

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Order ID is required");

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, orderId });

    // Get order to determine type
    const { data: orderData, error: orderFetchError } = await supabaseClient
      .from('orders')
      .select('is_instrumental, has_custom_lyric, user_id')
      .eq('id', orderId)
      .single();
    
    if (orderFetchError || !orderData) {
      throw new Error("Order not found");
    }

    if (orderData.user_id !== user.id) {
      throw new Error("Order does not belong to this user");
    }

    // Determine order type for credit compatibility
    let orderType: 'vocal' | 'instrumental' | 'custom_lyric' = 'vocal';
    if (orderData.is_instrumental) {
      orderType = 'instrumental';
    } else if (orderData.has_custom_lyric) {
      orderType = 'custom_lyric';
    }
    
    logStep("Order type determined", { orderId, orderType });

    // Find an active credit package with available credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('purchased_at', { ascending: true }); // Use oldest credits first (FIFO)

    if (creditsError) {
      throw new Error(`Error fetching credits: ${creditsError.message}`);
    }

    if (!credits || credits.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Nenhum crédito disponível",
        needs_purchase: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find first COMPATIBLE package with available credits
    let creditToUse = null;
    for (const credit of credits) {
      if (credit.total_credits > credit.used_credits) {
        if (isCreditCompatible(credit.plan_id, orderType)) {
          creditToUse = credit;
          break;
        }
      }
    }

    if (!creditToUse) {
      // Check if they have any credits at all
      const hasAnyCredits = credits.some(c => c.total_credits > c.used_credits);
      
      if (hasAnyCredits) {
        // They have credits but wrong type
        const creditTypeName = orderType === 'instrumental' ? 'instrumental' : 'vocal';
        return new Response(JSON.stringify({
          success: false,
          error: `Você não tem créditos ${creditTypeName === 'instrumental' ? 'instrumentais' : 'de música cantada'} disponíveis. Seus créditos são de outro tipo.`,
          needs_purchase: true,
          wrong_type: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: "Todos os créditos foram utilizados",
        needs_purchase: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Compatible credit found", { 
      creditId: creditToUse.id, 
      planId: creditToUse.plan_id,
      creditType: getCreditType(creditToUse.plan_id),
      orderType,
      used: creditToUse.used_credits, 
      total: creditToUse.total_credits 
    });

    // Increment used_credits
    const newUsedCredits = creditToUse.used_credits + 1;
    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({ 
        used_credits: newUsedCredits,
        // Mark as inactive if all credits used
        is_active: newUsedCredits < creditToUse.total_credits,
      })
      .eq('id', creditToUse.id);

    if (updateError) {
      throw new Error(`Error updating credits: ${updateError.message}`);
    }

    // Update order to mark as paid via credits
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'PAID',
        status: 'PAID',
        payment_method: 'credits',
        amount: 0, // No charge for credit-based orders
      })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (orderError) {
      // Rollback credit usage
      await supabaseClient
        .from('user_credits')
        .update({ 
          used_credits: creditToUse.used_credits,
          is_active: true,
        })
        .eq('id', creditToUse.id);
      
      throw new Error(`Error updating order: ${orderError.message}`);
    }

    // Update profile songs_generated
    await supabaseClient
      .from('profiles')
      .update({ 
        songs_generated: supabaseClient.rpc('increment', { x: 1 }) // Will fail silently if RPC doesn't exist
      })
      .eq('user_id', user.id);

    logStep("Credit used successfully", { 
      creditId: creditToUse.id, 
      creditType: getCreditType(creditToUse.plan_id),
      newUsed: newUsedCredits, 
      remainingCredits: creditToUse.total_credits - newUsedCredits 
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Crédito utilizado com sucesso",
      remaining_credits: creditToUse.total_credits - newUsedCredits,
      credit_package: {
        plan_id: creditToUse.plan_id,
        total: creditToUse.total_credits,
        used: newUsedCredits,
        remaining: creditToUse.total_credits - newUsedCredits,
        credit_type: getCreditType(creditToUse.plan_id),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

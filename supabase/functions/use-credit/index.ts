import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({
        success: false,
        error: "Não autorizado",
        needs_purchase: true,
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
        success: false,
        error: "Sessão expirada. Por favor, faça login novamente.",
        needs_purchase: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    logStep("User authenticated", { userId, orderId });

    // Get order to determine type
    const { data: orderData, error: orderFetchError } = await supabaseClient
      .from('orders')
      .select('is_instrumental, has_custom_lyric, user_id')
      .eq('id', orderId)
      .single();
    
    if (orderFetchError || !orderData) {
      throw new Error("Order not found");
    }

    if (orderData.user_id !== userId) {
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
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('purchased_at', { ascending: true }); // Use oldest credits first (FIFO)

    if (creditsError) {
      throw new Error(`Error fetching credits: ${creditsError.message}`);
    }

    // Find first COMPATIBLE package with available credits (priority: packages first)
    let creditToUse = null;
    if (credits && credits.length > 0) {
      for (const credit of credits) {
        if (credit.total_credits > credit.used_credits) {
          if (isCreditCompatible(credit.plan_id, orderType)) {
            creditToUse = credit;
            break;
          }
        }
      }
    }

    // If no package credits found, check for subscription credits from Stripe
    let useSubscription = false;
    let subscriptionPlanId: string | null = null;
    
    if (!creditToUse) {
      logStep("No package credits, checking subscription");
      
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey && userEmail) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          
          // Find customer
          const customers = await stripe.customers.list({ 
            email: userEmail,
            limit: 1 
          });
          
          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;
            
            // Find active creator subscription
            const subscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: "active",
              limit: 10,
            });
            
            const creatorSub = subscriptions.data.find(
              (sub: any) => sub.metadata?.plan_type === 'creator'
            );
            
            if (creatorSub) {
              const creditsTotal = parseInt(creatorSub.metadata?.credits || '0');
              const planId = creatorSub.metadata?.plan_id || 'creator_start';
              const isInstrumental = planId.includes('instrumental');
              
              // Check compatibility
              const isCompatible = isInstrumental 
                ? orderType === 'instrumental' 
                : orderType !== 'instrumental';
              
              if (!isCompatible) {
                const creditTypeName = orderType === 'instrumental' ? 'instrumental' : 'vocal';
                return new Response(JSON.stringify({
                  success: false,
                  error: `Sua assinatura Creator é ${isInstrumental ? 'instrumental' : 'vocal'}, mas este pedido requer créditos ${creditTypeName === 'instrumental' ? 'instrumentais' : 'vocais'}.`,
                  needs_purchase: true,
                  wrong_type: true,
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                });
              }
              
              // Get period data with fallbacks
              let currentPeriodStartTs = creatorSub.current_period_start;
              
              if (!currentPeriodStartTs) {
                const firstItem = creatorSub.items?.data?.[0];
                if (firstItem) {
                  currentPeriodStartTs = (firstItem as any).current_period_start;
                }
              }

              if (!currentPeriodStartTs) {
                const fullSub = await stripe.subscriptions.retrieve(creatorSub.id);
                currentPeriodStartTs = fullSub.current_period_start;
              }

              if (currentPeriodStartTs) {
                const periodStart = new Date(currentPeriodStartTs * 1000).toISOString();
                
                // Count orders in current period
                const { count: usedCount } = await supabaseClient
                  .from('orders')
                  .select('*', { count: 'exact', head: true })
                  .eq('user_id', userId)
                  .gte('created_at', periodStart)
                  .in('status', ['PAID', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'])
                  .like('plan_id', 'creator_%');

                const creditsUsed = usedCount || 0;
                const creditsRemaining = creditsTotal - creditsUsed;
                
                logStep("Subscription credits check", { creditsTotal, creditsUsed, creditsRemaining });
                
                if (creditsRemaining > 0) {
                  useSubscription = true;
                  subscriptionPlanId = planId;
                  logStep("Using subscription credit", { planId, creditsRemaining });
                } else {
                  return new Response(JSON.stringify({
                    success: false,
                    error: `Você já usou todos os ${creditsTotal} créditos da sua assinatura Creator este mês.`,
                    needs_purchase: true,
                  }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                  });
                }
              }
            }
          }
        }
      } catch (stripeError: any) {
        logStep("Stripe check failed", { error: stripeError.message });
        // Continue to show no credits available
      }
    }

    // If still no credits available
    if (!creditToUse && !useSubscription) {
      // Check if they have any credits at all (wrong type)
      const hasAnyPackageCredits = credits?.some(c => c.total_credits > c.used_credits) || false;
      
      if (hasAnyPackageCredits) {
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
        error: "Nenhum crédito disponível",
        needs_purchase: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use the credit
    if (useSubscription && subscriptionPlanId) {
      // Mark order as paid using subscription credit
      const { error: orderError } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'PAID',
          payment_method: 'subscription',
          plan_id: subscriptionPlanId,
          amount: 0,
        })
        .eq('id', orderId)
        .eq('user_id', userId);

      if (orderError) {
        throw new Error(`Error updating order: ${orderError.message}`);
      }

      logStep("Subscription credit used successfully", { 
        planId: subscriptionPlanId,
        orderId 
      });

      return new Response(JSON.stringify({
        success: true,
        message: "Crédito da assinatura utilizado com sucesso",
        source: 'subscription',
        credit_package: {
          plan_id: subscriptionPlanId,
          credit_type: getCreditType(subscriptionPlanId),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use package credit
    if (creditToUse) {
      logStep("Compatible package credit found", { 
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
          plan_id: creditToUse.plan_id,
          amount: 0,
        })
        .eq('id', orderId)
        .eq('user_id', userId);

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

      logStep("Package credit used successfully", { 
        creditId: creditToUse.id, 
        creditType: getCreditType(creditToUse.plan_id),
        newUsed: newUsedCredits, 
        remainingCredits: creditToUse.total_credits - newUsedCredits 
      });

      return new Response(JSON.stringify({
        success: true,
        message: "Crédito utilizado com sucesso",
        source: 'package',
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
    }

    throw new Error("Unexpected state: no credit source available");
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

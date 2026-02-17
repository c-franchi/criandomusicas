import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[USE-CREDIT] ${step}${detailsStr}`);
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

    // Get order to verify ownership and get details for notification
    const { data: orderData, error: orderFetchError } = await supabaseClient
      .from('orders')
      .select('user_id, music_type, music_style, is_instrumental')
      .eq('id', orderId)
      .single();
    
    if (orderFetchError || !orderData) {
      throw new Error("Order not found");
    }

    if (orderData.user_id !== userId) {
      throw new Error("Order does not belong to this user");
    }
    
    // Get user profile for notification
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();
    
    const userName = profileData?.name || userEmail || 'Cliente';
    
    logStep("Order verified", { orderId });

    // Find an active credit package with available credits (FIFO - oldest first)
    // Universal credits: any credit can be used for any order type
    // IMPORTANT: Prioritize regular credits over preview credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('purchased_at', { ascending: true });

    if (creditsError) {
      throw new Error(`Error fetching credits: ${creditsError.message}`);
    }

    // Find first package with available credits
    // Prioritize regular credits over preview credits
    let creditToUse = null;
    let previewCredit = null;
    
    if (credits && credits.length > 0) {
      for (const credit of credits) {
        if (credit.total_credits > credit.used_credits) {
          // Store preview credit separately
          if (credit.plan_id === 'preview_test') {
            previewCredit = credit;
            continue;
          }
          // Use first regular credit found
          creditToUse = credit;
          break;
        }
      }
      
      // If no regular credits, use preview credit
      if (!creditToUse && previewCredit) {
        creditToUse = previewCredit;
        logStep("Using preview credit (no regular credits available)");
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
                
                // Count orders in current period that used subscription credits
                // Include BRIEFING_COMPLETE to avoid missing orders in transition
                const { count: usedCount, error: countError } = await supabaseClient
                  .from('orders')
                  .select('*', { count: 'exact', head: true })
                  .eq('user_id', userId)
                  .gte('created_at', periodStart)
                  .in('status', ['PAID', 'BRIEFING_COMPLETE', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED', 'CANCELLED'])
                  .like('plan_id', 'creator_%');

                if (countError) {
                  logStep("Error counting subscription usage", { error: countError.message });
                  throw new Error(`Error counting subscription credits: ${countError.message}`);
                }

                const creditsUsed = usedCount || 0;
                const creditsRemaining = creditsTotal - creditsUsed;
                
                logStep("Subscription credits check", { creditsTotal, creditsUsed, creditsRemaining, periodStart });
                
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
      const { error: orderError, data: updatedOrder } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'PAID',
          payment_method: 'subscription',
          plan_id: subscriptionPlanId,
          amount: 0,
        })
        .eq('id', orderId)
        .eq('user_id', userId)
        .select('id, status, payment_status, plan_id');

      if (orderError) {
        throw new Error(`Error updating order: ${orderError.message}`);
      }

      // Verify the update actually took effect
      if (!updatedOrder || updatedOrder.length === 0) {
        logStep("WARNING: Order update returned no rows", { orderId });
        throw new Error("Order update failed - no rows affected");
      }

      logStep("Subscription credit used successfully", { 
        planId: subscriptionPlanId,
        orderId,
        verifiedStatus: updatedOrder[0]?.status,
        verifiedPlanId: updatedOrder[0]?.plan_id,
      });

      // Admin notification moved to generate-style-prompt (after lyrics approval)

      // Send push notification to user
      try {
        await supabaseClient.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            order_id: orderId,
            title: "🎵 Pedido recebido!",
            body: "Seu crédito foi utilizado. Estamos criando sua música!",
            url: `/pedido/${orderId}`,
          },
        });
      } catch (pushErr) {
        logStep("User push failed (non-blocking)", { error: String(pushErr) });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Crédito da assinatura utilizado com sucesso",
        source: 'subscription',
        credit_package: {
          plan_id: subscriptionPlanId,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use package credit
    if (creditToUse) {
      logStep("Package credit found", { 
        creditId: creditToUse.id, 
        planId: creditToUse.plan_id,
        used: creditToUse.used_credits, 
        total: creditToUse.total_credits 
      });

      // Increment used_credits atomically
      const newUsedCredits = (creditToUse.used_credits || 0) + 1;
      const { error: updateError, data: updateData } = await supabaseClient
        .from('user_credits')
        .update({ 
          used_credits: newUsedCredits,
          // Mark as inactive if all credits used
          is_active: newUsedCredits < creditToUse.total_credits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditToUse.id)
        .eq('used_credits', creditToUse.used_credits) // Optimistic lock: only update if count hasn't changed
        .select();

      if (updateError) {
        throw new Error(`Error updating credits: ${updateError.message}`);
      }

      // Check if optimistic lock failed (another request consumed the credit)
      if (!updateData || updateData.length === 0) {
        logStep("Optimistic lock failed - credit was consumed by another request, retrying...");
        // Re-fetch and retry once
        const { data: freshCredit } = await supabaseClient
          .from('user_credits')
          .select('*')
          .eq('id', creditToUse.id)
          .single();
        
        if (!freshCredit || freshCredit.total_credits <= freshCredit.used_credits) {
          return new Response(JSON.stringify({
            success: false,
            error: "Crédito já foi utilizado por outro pedido",
            needs_purchase: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        // Retry with fresh data
        const retryUsed = freshCredit.used_credits + 1;
        const { error: retryError } = await supabaseClient
          .from('user_credits')
          .update({ 
            used_credits: retryUsed,
            is_active: retryUsed < freshCredit.total_credits,
            updated_at: new Date().toISOString(),
          })
          .eq('id', freshCredit.id);
        
        if (retryError) {
          throw new Error(`Error on retry updating credits: ${retryError.message}`);
        }
        logStep("Credit consumed on retry", { newUsed: retryUsed });
      }

      // Update order to mark as paid via credits
      // Mark as preview if using preview credit
      const isPreviewCredit = creditToUse.plan_id === 'preview_test';
      
      const { error: orderError } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'PAID',
          payment_method: 'credits',
          plan_id: creditToUse.plan_id,
          amount: 0,
          is_preview: isPreviewCredit,
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
        newUsed: newUsedCredits, 
        remainingCredits: creditToUse.total_credits - newUsedCredits 
      });

      // Admin notification moved to generate-style-prompt (after lyrics approval)

      // Send push notification to user
      try {
        await supabaseClient.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            order_id: orderId,
            title: "🎵 Pedido recebido!",
            body: `Seu crédito foi utilizado. ${creditToUse.total_credits - newUsedCredits > 0 ? `Restam ${creditToUse.total_credits - newUsedCredits} crédito(s).` : 'Estamos criando sua música!'}`,
            url: `/pedido/${orderId}`,
          },
        });
      } catch (pushErr) {
        logStep("User push failed (non-blocking)", { error: String(pushErr) });
      }

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

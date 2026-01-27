import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CREDITS] ${step}${detailsStr}`);
};

// Map plan IDs to credit amounts
const PLAN_CREDITS: Record<string, number> = {
  'single': 1,
  'single_instrumental': 1,
  'single_custom_lyric': 1,
  'package': 3,
  'package_instrumental': 3,
  'subscription': 5,
  'subscription_instrumental': 5,
};

// Credit type compatibility:
// - 'vocal' credits can be used for: vocal songs, custom lyric songs
// - 'instrumental' credits can be used for: instrumental songs only
const getCreditType = (planId: string): 'vocal' | 'instrumental' => {
  return planId.includes('instrumental') ? 'instrumental' : 'vocal';
};

// Check if a credit can be used for a specific order type
const isCreditCompatible = (planId: string, orderType: 'vocal' | 'instrumental' | 'custom_lyric'): boolean => {
  const creditType = getCreditType(planId);
  
  if (creditType === 'instrumental') {
    // Instrumental credits only work for instrumental orders
    return orderType === 'instrumental';
  }
  
  // Vocal credits work for vocal and custom lyric orders
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

    // Parse optional orderType from body
    let orderType: 'vocal' | 'instrumental' | 'custom_lyric' | null = null;
    try {
      const body = await req.json();
      orderType = body?.orderType || null;
    } catch {
      // No body or invalid JSON is fine
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({
        success: false,
        has_credits: false,
        total_available: 0,
        total_vocal: 0,
        total_instrumental: 0,
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
        has_credits: false,
        total_available: 0,
        total_vocal: 0,
        total_instrumental: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    logStep("User authenticated", { userId, orderType });

    // Fetch active credits for this user from user_credits table
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('purchased_at', { ascending: true }); // FIFO - oldest first

    if (creditsError) {
      logStep("Error fetching credits", { error: creditsError.message });
      throw new Error(`Error fetching credits: ${creditsError.message}`);
    }

    logStep("Package credits fetched", { count: credits?.length || 0 });

    // Calculate available credits from packages
    let totalAvailable = 0;
    let totalVocal = 0;
    let totalInstrumental = 0;
    let activePackage = null;

    if (credits && credits.length > 0) {
      for (const credit of credits) {
        const available = credit.total_credits - credit.used_credits;
        if (available > 0) {
          const creditType = getCreditType(credit.plan_id);
          
          if (creditType === 'vocal') {
            totalVocal += available;
          } else {
            totalInstrumental += available;
          }
          
          // If orderType specified, only count compatible credits
          const isCompatible = orderType ? isCreditCompatible(credit.plan_id, orderType) : true;
          
          if (isCompatible) {
            totalAvailable += available;
            if (!activePackage) {
              activePackage = {
                id: credit.id,
                plan_id: credit.plan_id,
                total_credits: credit.total_credits,
                used_credits: credit.used_credits,
                available_credits: available,
                purchased_at: credit.purchased_at,
                expires_at: credit.expires_at,
                credit_type: creditType,
                source: 'package',
              };
            }
          }
        }
      }
    }

    // Check for Creator subscription credits from Stripe
    let subscriptionCredits = 0;
    let subscriptionInfo: {
      plan_id: string | null;
      plan_name: string | null;
      credits_total: number;
      credits_used: number;
      credits_remaining: number;
      is_instrumental: boolean;
      subscription_end: string | null;
      current_period_start: string | null;
    } | null = null;

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
          logStep("Found Stripe customer", { customerId });
          
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
            const planId = creatorSub.metadata?.plan_id || null;
            
            // Get period data with fallbacks
            let currentPeriodEndTs = creatorSub.current_period_end;
            let currentPeriodStartTs = creatorSub.current_period_start;

            if (!currentPeriodEndTs || !currentPeriodStartTs) {
              logStep("Period data not in root, checking items.data[0]");
              const firstItem = creatorSub.items?.data?.[0];
              if (firstItem) {
                currentPeriodEndTs = (firstItem as any).current_period_end;
                currentPeriodStartTs = (firstItem as any).current_period_start;
                logStep("Found period data in items", { currentPeriodEndTs, currentPeriodStartTs });
              }
            }

            if (!currentPeriodEndTs || !currentPeriodStartTs) {
              logStep("Fetching full subscription details");
              const fullSub = await stripe.subscriptions.retrieve(creatorSub.id);
              currentPeriodEndTs = fullSub.current_period_end;
              currentPeriodStartTs = fullSub.current_period_start;
            }

            if (currentPeriodStartTs && currentPeriodEndTs) {
              const periodStart = new Date(currentPeriodStartTs * 1000).toISOString();
              const periodEnd = new Date(currentPeriodEndTs * 1000).toISOString();
              
              // Count orders created in current period that use subscription credits
              // Orders with plan_id starting with 'creator_' are subscription-based
              const { count: usedCount, error: countError } = await supabaseClient
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', periodStart)
                .in('status', ['PAID', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED'])
                .like('plan_id', 'creator_%');

              if (countError) {
                logStep("Error counting subscription usage", { error: countError.message });
              }

              const creditsUsed = usedCount || 0;
              subscriptionCredits = Math.max(0, creditsTotal - creditsUsed);
              
              const isInstrumental = planId?.includes('instrumental') || false;
              
              // Plan name mapping
              const planNames: Record<string, string> = {
                'creator_start': 'Creator Start',
                'creator_pro': 'Creator Pro',
                'creator_studio': 'Creator Studio',
                'creator_start_instrumental': 'Creator Start Instrumental',
                'creator_pro_instrumental': 'Creator Pro Instrumental',
                'creator_studio_instrumental': 'Creator Studio Instrumental',
              };
              
              subscriptionInfo = {
                plan_id: planId,
                plan_name: planNames[planId || ''] || planId,
                credits_total: creditsTotal,
                credits_used: creditsUsed,
                credits_remaining: subscriptionCredits,
                is_instrumental: isInstrumental,
                subscription_end: periodEnd,
                current_period_start: periodStart,
              };

              // Add subscription credits to totals
              if (isInstrumental) {
                totalInstrumental += subscriptionCredits;
              } else {
                totalVocal += subscriptionCredits;
              }
              
              // Check compatibility with order type
              const subIsCompatible = orderType 
                ? (isInstrumental ? orderType === 'instrumental' : orderType !== 'instrumental')
                : true;
              
              if (subIsCompatible) {
                totalAvailable += subscriptionCredits;
                
                // If no active package, subscription becomes the active source
                if (!activePackage && subscriptionCredits > 0) {
                  activePackage = {
                    id: creatorSub.id,
                    plan_id: planId,
                    total_credits: creditsTotal,
                    used_credits: creditsUsed,
                    available_credits: subscriptionCredits,
                    purchased_at: periodStart,
                    expires_at: periodEnd,
                    credit_type: isInstrumental ? 'instrumental' : 'vocal',
                    source: 'subscription',
                  };
                }
              }

              logStep("Creator subscription credits calculated", { 
                planId, 
                creditsTotal, 
                creditsUsed, 
                subscriptionCredits,
                isInstrumental 
              });
            }
          }
        }
      }
    } catch (stripeError: any) {
      logStep("Stripe check failed (non-fatal)", { error: stripeError.message });
      // Continue without subscription credits
    }

    logStep("Credits calculated", { 
      totalAvailable, 
      totalVocal, 
      totalInstrumental, 
      hasActivePackage: !!activePackage,
      hasSubscription: !!subscriptionInfo,
      orderType 
    });

    return new Response(JSON.stringify({
      success: true,
      has_credits: totalAvailable > 0,
      total_available: totalAvailable,
      total_vocal: totalVocal,
      total_instrumental: totalInstrumental,
      active_package: activePackage,
      subscription_info: subscriptionInfo,
      all_packages: credits?.map(c => ({
        id: c.id,
        plan_id: c.plan_id,
        total_credits: c.total_credits,
        used_credits: c.used_credits,
        available_credits: c.total_credits - c.used_credits,
        purchased_at: c.purchased_at,
        is_active: c.is_active,
        credit_type: getCreditType(c.plan_id),
        source: 'package',
      })) || [],
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
      has_credits: false,
      total_available: 0,
      total_vocal: 0,
      total_instrumental: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 even on error so frontend can handle gracefully
    });
  }
});

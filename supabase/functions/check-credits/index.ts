import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CREDITS] ${step}${detailsStr}`);
};

// Map plan IDs to credit amounts (universal credits)
const PLAN_CREDITS: Record<string, number> = {
  'single': 1,
  'single_instrumental': 1,
  'single_custom_lyric': 1,
  'package': 3,
  'package_instrumental': 3,
  'subscription': 5,
  'subscription_instrumental': 5,
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

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({
        success: false,
        has_credits: false,
        total_credits: 0,
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
        total_credits: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    logStep("User authenticated", { userId });

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

    // Calculate available credits from packages (universal - no type distinction)
    // IMPORTANT: Separate preview credits from regular credits
    let totalCredits = 0;
    let activePackage = null;
    let hasPreviewCredit = false;
    let previewCreditUsed = false;
    let previewCreditAvailable = false;

    if (credits && credits.length > 0) {
      for (const credit of credits) {
        const available = credit.total_credits - credit.used_credits;
        
        // Handle preview credits separately
        if (credit.plan_id === 'preview_test') {
          hasPreviewCredit = true;
          previewCreditUsed = available <= 0;
          previewCreditAvailable = available > 0 && credit.is_active;
          // Don't add preview credits to total - they're tracked separately
          continue;
        }
        
        if (available > 0) {
          totalCredits += available;
          
          if (!activePackage) {
            activePackage = {
              id: credit.id,
              plan_id: credit.plan_id,
              total_credits: credit.total_credits,
              used_credits: credit.used_credits,
              available_credits: available,
              purchased_at: credit.purchased_at,
              expires_at: credit.expires_at,
              source: 'package',
            };
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
              const { count: usedCount, error: countError } = await supabaseClient
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', periodStart)
                .in('status', ['PAID', 'LYRICS_PENDING', 'LYRICS_GENERATED', 'LYRICS_APPROVED', 'MUSIC_GENERATING', 'MUSIC_READY', 'COMPLETED', 'CANCELLED'])
                .like('plan_id', 'creator_%');

              if (countError) {
                logStep("Error counting subscription usage", { error: countError.message });
              }

              const creditsUsed = usedCount || 0;
              subscriptionCredits = Math.max(0, creditsTotal - creditsUsed);
              
              // Plan name mapping (universal - no instrumental distinction)
              const planNames: Record<string, string> = {
                'creator_start': 'Creator Start',
                'creator_pro': 'Creator Pro',
                'creator_studio': 'Creator Studio',
                'creator_start_instrumental': 'Creator Start',
                'creator_pro_instrumental': 'Creator Pro',
                'creator_studio_instrumental': 'Creator Studio',
              };
              
              subscriptionInfo = {
                plan_id: planId,
                plan_name: planNames[planId || ''] || planId,
                credits_total: creditsTotal,
                credits_used: creditsUsed,
                credits_remaining: subscriptionCredits,
                subscription_end: periodEnd,
                current_period_start: periodStart,
              };

              // Add subscription credits to total (universal)
              totalCredits += subscriptionCredits;
              
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
                  source: 'subscription',
                };
              }

              logStep("Creator subscription credits calculated", { 
                planId, 
                creditsTotal, 
                creditsUsed, 
                subscriptionCredits,
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
      totalCredits, 
      hasActivePackage: !!activePackage,
      hasSubscription: !!subscriptionInfo,
    });

    return new Response(JSON.stringify({
      success: true,
      has_credits: totalCredits > 0,
      total_credits: totalCredits,
      // Backwards compatibility - all credits are now universal
      total_available: totalCredits,
      total_vocal: totalCredits,
      total_instrumental: totalCredits,
      active_package: activePackage,
      subscription_info: subscriptionInfo,
      // Preview credit info
      has_preview_credit: hasPreviewCredit,
      preview_credit_used: previewCreditUsed,
      preview_credit_available: previewCreditAvailable,
      all_packages: credits?.filter(c => c.plan_id !== 'preview_test').map(c => ({
        id: c.id,
        plan_id: c.plan_id,
        total_credits: c.total_credits,
        used_credits: c.used_credits,
        available_credits: c.total_credits - c.used_credits,
        purchased_at: c.purchased_at,
        is_active: c.is_active,
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
      total_credits: 0,
      total_available: 0,
      total_vocal: 0,
      total_instrumental: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 even on error so frontend can handle gracefully
    });
  }
});

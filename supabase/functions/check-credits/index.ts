import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Fetch active credits for this user
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('purchased_at', { ascending: false });

    if (creditsError) {
      logStep("Error fetching credits", { error: creditsError.message });
      throw new Error(`Error fetching credits: ${creditsError.message}`);
    }

    logStep("Credits fetched", { count: credits?.length || 0 });

    // Calculate available credits
    let totalAvailable = 0;
    let activePackage = null;

    if (credits && credits.length > 0) {
      for (const credit of credits) {
        const available = credit.total_credits - credit.used_credits;
        if (available > 0) {
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
            };
          }
        }
      }
    }

    logStep("Credits calculated", { totalAvailable, hasActivePackage: !!activePackage });

    return new Response(JSON.stringify({
      success: true,
      has_credits: totalAvailable > 0,
      total_available: totalAvailable,
      active_package: activePackage,
      all_packages: credits?.map(c => ({
        id: c.id,
        plan_id: c.plan_id,
        total_credits: c.total_credits,
        used_credits: c.used_credits,
        available_credits: c.total_credits - c.used_credits,
        purchased_at: c.purchased_at,
        is_active: c.is_active,
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 even on error so frontend can handle gracefully
    });
  }
});

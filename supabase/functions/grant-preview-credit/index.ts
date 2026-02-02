import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GRANT-PREVIEW-CREDIT] ${step}${detailsStr}`);
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

    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error("User ID is required");
    }

    logStep("Processing user", { userId });

    // Check if user already has a preview credit
    const { data: existingCredit, error: checkError } = await supabaseClient
      .from('user_credits')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_id', 'preview_test')
      .maybeSingle();

    if (checkError) {
      throw new Error(`Error checking existing credit: ${checkError.message}`);
    }

    if (existingCredit) {
      logStep("User already has preview credit", { creditId: existingCredit.id });
      return new Response(JSON.stringify({
        success: true,
        message: "User already has preview credit",
        already_exists: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Grant new preview credit
    const { data: newCredit, error: insertError } = await supabaseClient
      .from('user_credits')
      .insert({
        user_id: userId,
        plan_id: 'preview_test',
        total_credits: 1,
        used_credits: 0,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error inserting preview credit: ${insertError.message}`);
    }

    logStep("Preview credit granted successfully", { creditId: newCredit.id });

    return new Response(JSON.stringify({
      success: true,
      message: "Preview credit granted",
      credit_id: newCredit.id,
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

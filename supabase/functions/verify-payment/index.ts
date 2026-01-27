import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

    const { sessionId, orderId } = await req.json();
    if (!sessionId || !orderId) {
      throw new Error("Session ID and Order ID are required");
    }
    logStep("Received params", { sessionId, orderId });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Não autorizado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Authentication failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Sessão expirada. Por favor, faça login novamente." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    logStep("User authenticated", { userId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      status: session.payment_status,
      orderId: session.metadata?.order_id
    });

    if (session.payment_status === "paid") {
      // Fetch order details first to get music_type
      const { data: orderData } = await supabaseClient
        .from('orders')
        .select('music_type, is_instrumental')
        .eq('id', orderId)
        .single();

      // Fetch user profile for name
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .single();

      // Get plan ID from session metadata
      const planId = session.metadata?.plan_id || 'single';
      
      // Determine credits based on plan
      const PLAN_CREDITS: Record<string, number> = {
        'single': 1,
        'single_instrumental': 1,
        'single_custom_lyric': 1,
        'package': 3,
        'package_instrumental': 3,
        'subscription': 5,
        'subscription_instrumental': 5,
      };
      
      // Plan display names
      const PLAN_NAMES: Record<string, string> = {
        'single': 'Música Única',
        'single_instrumental': 'Música Única Instrumental',
        'single_custom_lyric': 'Música com Letra Personalizada',
        'package': 'Pacote 3 Músicas',
        'package_instrumental': 'Pacote 3 Músicas Instrumental',
        'subscription': 'Pacote 5 Músicas',
        'subscription_instrumental': 'Pacote 5 Músicas Instrumental',
      };
      
      const creditsToAdd = PLAN_CREDITS[planId] || 1;
      
      // Create credits record for multi-song packages
      if (creditsToAdd > 1) {
        const { error: creditsError } = await supabaseClient
          .from('user_credits')
          .insert({
            user_id: userId,
            plan_id: planId,
            total_credits: creditsToAdd,
            used_credits: 1, // First song is being created now
            stripe_session_id: sessionId,
            is_active: true,
          });
        
        if (creditsError) {
          logStep("Warning: Failed to create credits", { error: creditsError.message });
          // Don't fail the payment verification for this
        } else {
          logStep("Credits created", { planId, credits: creditsToAdd });
        }
      }

      // Update the order status to PAID
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'PAID',
          payment_status: 'PAID'
        })
        .eq('id', orderId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }
      logStep("Order updated to PAID", { orderId, planId, creditsAdded: creditsToAdd > 1 ? creditsToAdd : 0 });

      // Send purchase confirmation email
      try {
        const purchaseType = creditsToAdd > 1 ? 'package' : 'single';
        const planName = PLAN_NAMES[planId] || 'Música Personalizada';
        const isInstrumental = planId.includes('instrumental');
        
        await supabaseClient.functions.invoke('send-purchase-email', {
          body: {
            email: userEmail,
            userName: profileData?.name || 'Cliente',
            purchaseType,
            planName,
            amount: session.amount_total || 0,
            currency: session.currency || 'brl',
            orderId,
            credits: creditsToAdd,
            isInstrumental,
          }
        });
        logStep("Purchase confirmation email sent");
      } catch (emailError) {
        console.error("Failed to send purchase email:", emailError);
        // Don't fail the whole request for this
      }

      // Notify admin about new paid order
      try {
        await supabaseClient.functions.invoke('notify-admin-order', {
          body: {
            orderId,
            userId: userId,
            orderType: orderData?.is_instrumental ? 'instrumental' : 'vocal',
            userName: profileData?.name || 'Cliente',
            musicType: orderData?.music_type || 'personalizada'
          }
        });
        logStep("Admin notified about new order");
      } catch (notifyError) {
        console.error("Failed to notify admin:", notifyError);
        // Don't fail the whole request for this
      }

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'paid',
        message: 'Pagamento confirmado com sucesso!'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(JSON.stringify({ 
        success: false, 
        status: session.payment_status,
        message: 'Pagamento ainda não confirmado'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

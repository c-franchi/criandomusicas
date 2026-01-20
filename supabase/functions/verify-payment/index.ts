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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

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
      // Update the order status to PAID
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'PAID',
          payment_status: 'PAID'
        })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }
      logStep("Order updated to PAID", { orderId });

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

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find paid orders without lyrics
    const { data: paidOrders, error: ordersError } = await supabaseService
      .from('orders')
      .select('id, user_id')
      .eq('status', 'PAID')
      .eq('payment_status', 'PAID');

    if (ordersError) throw ordersError;

    console.log(`Found ${paidOrders?.length || 0} paid orders`);

    let processed = 0;
    const results = [];

    for (const order of paidOrders || []) {
      // Check if lyrics already exist
      const { data: existingLyrics } = await supabaseService
        .from('lyrics')
        .select('id')
        .eq('order_id', order.id);

      if (existingLyrics && existingLyrics.length > 0) {
        console.log(`Order ${order.id} already has lyrics, skipping`);
        continue;
      }

      try {
        // Call generate-lyrics function
        const { data, error } = await supabaseService.functions.invoke('generate-lyrics', {
          body: { orderId: order.id }
        });

        if (error) {
          console.error(`Error generating lyrics for order ${order.id}:`, error);
          results.push({ orderId: order.id, status: 'error', error: error.message });
        } else {
          console.log(`Successfully generated lyrics for order ${order.id}`);
          results.push({ orderId: order.id, status: 'success' });
          processed++;
        }
      } catch (functionError) {
        console.error(`Function error for order ${order.id}:`, functionError);
        results.push({ orderId: order.id, status: 'error', error: functionError.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${processed} orders`,
      totalOrders: paidOrders?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in reprocess-paid-orders function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
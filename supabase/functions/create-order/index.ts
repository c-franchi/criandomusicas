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
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { 
      occasion, 
      style, 
      tone, 
      duration_target_sec, 
      story_raw,
      lgpd_consent 
    } = await req.json();

    // Validate required fields
    if (!occasion || !style || !tone || !duration_target_sec || !story_raw) {
      throw new Error('Campos obrigatórios não preenchidos');
    }

    // Create service client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Create order
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user.id,
        occasion,
        style,
        tone,
        duration_target_sec,
        story_raw,
        status: 'AWAITING_PAYMENT',
        price_cents: 999, // R$ 9.99 (valor promocional, original R$ 30.00)
        payment_status: 'PENDING'
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Erro ao criar pedido: ${orderError.message}`);
    }

    // Save LGPD consent if provided
    if (lgpd_consent) {
      await supabaseService
        .from('consents')
        .insert({
          order_id: order.id,
          user_id: user.id,
          type: 'LGPD',
          ip: req.headers.get('x-forwarded-for') || 'unknown'
        });
    }

    // Log event
    await supabaseService
      .from('event_logs')
      .insert({
        order_id: order.id,
        type: 'ORDER_CREATED',
        payload: { 
          occasion, 
          style, 
          tone, 
          duration_minutes: Math.ceil(duration_target_sec / 60) 
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      order,
      message: 'Pedido criado com sucesso!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-order function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
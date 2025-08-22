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

    const { lyricId, orderId } = await req.json();

    if (!lyricId || !orderId) {
      throw new Error('Lyric ID e Order ID são obrigatórios');
    }

    // Create service client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Pedido não encontrado');
    }

    // Verify lyric belongs to order
    const { data: lyric, error: lyricError } = await supabaseService
      .from('lyrics')
      .select('*')
      .eq('id', lyricId)
      .eq('order_id', orderId)
      .single();

    if (lyricError || !lyric) {
      throw new Error('Letra não encontrada');
    }

    // Update lyric as approved
    await supabaseService
      .from('lyrics')
      .update({ approved_at: new Date().toISOString() })
      .eq('id', lyricId);

    // Update order with approved lyric
    await supabaseService
      .from('orders')
      .update({ 
        approved_lyric_id: lyricId,
        status: 'APPROVED'
      })
      .eq('id', orderId);

    // Create track entry
    const { data: track, error: trackError } = await supabaseService
      .from('tracks')
      .insert({
        order_id: orderId,
        lyric_id: lyricId,
        status: 'QUEUED'
      })
      .select()
      .single();

    if (trackError) {
      throw new Error(`Erro ao criar track: ${trackError.message}`);
    }

    // Log event
    await supabaseService
      .from('event_logs')
      .insert({
        order_id: orderId,
        type: 'LYRIC_APPROVED',
        payload: { 
          lyric_id: lyricId, 
          version: lyric.version,
          track_id: track.id 
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Letra ${lyric.version} aprovada! Música será gerada em breve.`,
      track
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in approve-lyric function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
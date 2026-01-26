import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionRequest {
  transferId: string;
  action: 'accept' | 'reject';
}

serve(async (req) => {
  console.log('[ACCEPT-CREDIT-TRANSFER] Function started');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase();
    const { transferId, action }: ActionRequest = await req.json();

    console.log('[ACCEPT-CREDIT-TRANSFER] Request:', { userId, transferId, action });

    if (!transferId || !action || !['accept', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the transfer
    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('credit_transfers')
      .select('*')
      .eq('id', transferId)
      .single();

    if (transferError || !transfer) {
      console.error('[ACCEPT-CREDIT-TRANSFER] Transfer not found:', transferError);
      return new Response(
        JSON.stringify({ success: false, error: 'Transferência não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the transfer belongs to this user
    const isRecipient = transfer.to_user_id === userId || 
                        transfer.to_user_email === userEmail;

    if (!isRecipient) {
      return new Response(
        JSON.stringify({ success: false, error: 'Você não tem permissão para esta transferência' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transfer is still pending
    if (transfer.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: `Esta transferência já foi ${transfer.status === 'accepted' ? 'aceita' : 'processada'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(transfer.expires_at);
    if (now > expiresAt) {
      // Mark as expired
      await supabaseAdmin
        .from('credit_transfers')
        .update({ status: 'expired' })
        .eq('id', transferId);

      return new Response(
        JSON.stringify({ success: false, error: 'Esta transferência expirou' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accept') {
      // Create new credit package for recipient
      const planId = transfer.credit_type === 'instrumental' 
        ? 'single_instrumental_transfer' 
        : 'single_transfer';

      const { error: createError } = await supabaseAdmin
        .from('user_credits')
        .insert({
          user_id: userId,
          plan_id: planId,
          total_credits: transfer.credits_amount,
          used_credits: 0,
          is_active: true,
        });

      if (createError) {
        console.error('[ACCEPT-CREDIT-TRANSFER] Error creating credits:', createError);
        throw createError;
      }

      // Update transfer status
      const { error: updateError } = await supabaseAdmin
        .from('credit_transfers')
        .update({ 
          status: 'accepted',
          to_user_id: userId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) {
        console.error('[ACCEPT-CREDIT-TRANSFER] Error updating transfer:', updateError);
        throw updateError;
      }

      console.log('[ACCEPT-CREDIT-TRANSFER] Transfer accepted:', transferId);

    } else {
      // Reject: return credits to sender
      const { data: senderCredits, error: senderError } = await supabaseAdmin
        .from('user_credits')
        .select('*')
        .eq('id', transfer.source_credit_id)
        .single();

      if (senderError) {
        console.error('[ACCEPT-CREDIT-TRANSFER] Error fetching sender credits:', senderError);
      } else if (senderCredits) {
        // Return the reserved credits
        const newUsedCredits = Math.max(0, (senderCredits.used_credits || 0) - transfer.credits_amount);
        
        await supabaseAdmin
          .from('user_credits')
          .update({ used_credits: newUsedCredits })
          .eq('id', transfer.source_credit_id);
      }

      // Update transfer status
      const { error: updateError } = await supabaseAdmin
        .from('credit_transfers')
        .update({ 
          status: 'rejected',
          to_user_id: userId,
        })
        .eq('id', transferId);

      if (updateError) {
        console.error('[ACCEPT-CREDIT-TRANSFER] Error updating transfer:', updateError);
        throw updateError;
      }

      console.log('[ACCEPT-CREDIT-TRANSFER] Transfer rejected:', transferId);
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ACCEPT-CREDIT-TRANSFER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

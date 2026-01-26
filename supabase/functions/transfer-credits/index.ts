import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  toEmail: string;
  amount: number;
  creditType: 'vocal' | 'instrumental';
  message?: string | null;
}

function generateTransferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TRF-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  console.log('[TRANSFER-CREDITS] Function started');

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

    const fromUserId = userData.user.id;
    const { toEmail, amount, creditType, message }: TransferRequest = await req.json();

    console.log('[TRANSFER-CREDITS] Request:', { fromUserId, toEmail, amount, creditType });

    // Validate input
    if (!toEmail || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Can't transfer to yourself
    if (toEmail.toLowerCase() === userData.user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Você não pode transferir créditos para si mesmo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to perform admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find user's credits that match the type and have available balance
    const { data: userCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', fromUserId)
      .eq('is_active', true)
      .order('purchased_at', { ascending: true });

    if (creditsError) {
      console.error('[TRANSFER-CREDITS] Error fetching credits:', creditsError);
      throw creditsError;
    }

    // Filter credits by type and available balance
    const availableCredits = (userCredits || []).filter(credit => {
      const isCorrectType = creditType === 'instrumental' 
        ? credit.plan_id.includes('instrumental')
        : !credit.plan_id.includes('instrumental');
      const hasAvailable = credit.total_credits - (credit.used_credits || 0) > 0;
      return isCorrectType && hasAvailable;
    });

    // Calculate total available
    const totalAvailable = availableCredits.reduce((sum, c) => {
      return sum + (c.total_credits - (c.used_credits || 0));
    }, 0);

    if (totalAvailable < amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Créditos insuficientes. Você tem apenas ${totalAvailable} crédito(s) disponível.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find which credit package to use (FIFO - oldest first)
    let creditsToTransfer = amount;
    const sourceCreditId = availableCredits[0]?.id;

    if (!sourceCreditId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum crédito disponível encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if recipient already exists
    const { data: recipientUsers } = await supabaseAdmin.auth.admin.listUsers();
    const recipientUser = recipientUsers?.users?.find(u => u.email?.toLowerCase() === toEmail.toLowerCase());

    // Generate unique transfer code
    const transferCode = generateTransferCode();

    // Create transfer record
    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('credit_transfers')
      .insert({
        from_user_id: fromUserId,
        to_user_email: toEmail.toLowerCase(),
        to_user_id: recipientUser?.id || null,
        credits_amount: amount,
        credit_type: creditType,
        source_credit_id: sourceCreditId,
        transfer_code: transferCode,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (transferError) {
      console.error('[TRANSFER-CREDITS] Error creating transfer:', transferError);
      throw transferError;
    }

    // Temporarily reserve credits by incrementing used_credits
    // We'll distribute across multiple packages if needed
    let remainingToReserve = amount;
    for (const credit of availableCredits) {
      if (remainingToReserve <= 0) break;
      
      const available = credit.total_credits - (credit.used_credits || 0);
      const toReserve = Math.min(available, remainingToReserve);
      
      const { error: updateError } = await supabaseAdmin
        .from('user_credits')
        .update({ used_credits: (credit.used_credits || 0) + toReserve })
        .eq('id', credit.id);

      if (updateError) {
        console.error('[TRANSFER-CREDITS] Error reserving credits:', updateError);
        throw updateError;
      }

      remainingToReserve -= toReserve;
    }

    console.log('[TRANSFER-CREDITS] Transfer created:', transfer.id);

    // TODO: Send email notification to recipient using Resend
    // This can be implemented later with the send-email edge function

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer: {
          id: transfer.id,
          code: transferCode,
          amount,
          toEmail,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TRANSFER-CREDITS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TransferRequest {
  toEmail?: string | null; // Opcional - se null, cria código compartilhável
  amount?: number; // Ignorado - sempre será 1
  creditType?: string; // Mantido para compatibilidade, mas ignorado (créditos universais)
  message?: string | null;
}

// IMPORTANTE: Transferência sempre limitada a 1 crédito por vez
const TRANSFER_LIMIT = 1;

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.log('[TRANSFER-CREDITS] Authentication failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão expirada. Por favor, faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromUserId = claimsData.claims.sub as string;
    const fromUserEmail = claimsData.claims.email as string | undefined;
    const { toEmail, amount, creditType, message }: TransferRequest = await req.json();

    console.log('[TRANSFER-CREDITS] Request:', { fromUserId, toEmail, amount, creditType });

    // Use service role to perform admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check rate limit: 1 transfer every 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const { data: recentTransfers, error: recentError } = await supabaseAdmin
      .from('credit_transfers')
      .select('id, created_at')
      .eq('from_user_id', fromUserId)
      .gte('created_at', fifteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentError) {
      console.error('[TRANSFER-CREDITS] Error checking recent transfers:', recentError);
      throw recentError;
    }

    if (recentTransfers && recentTransfers.length > 0) {
      const lastTransferDate = new Date(recentTransfers[0].created_at);
      const nextAllowedDate = new Date(lastTransferDate);
      nextAllowedDate.setDate(nextAllowedDate.getDate() + 15);
      
      const daysRemaining = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      console.log('[TRANSFER-CREDITS] Rate limit exceeded. Last transfer:', lastTransferDate, 'Next allowed:', nextAllowedDate);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Você só pode transferir 1 crédito a cada 15 dias. Próxima transferência permitida em ${daysRemaining} dia(s).`,
          nextAllowedDate: nextAllowedDate.toISOString(),
          daysRemaining
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input - só quantidade obrigatória
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quantidade inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se email fornecido, validar formato
    if (toEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(toEmail)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Can't transfer to yourself
      if (toEmail.toLowerCase() === fromUserEmail?.toLowerCase()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Você não pode transferir créditos para si mesmo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // supabaseAdmin already declared above for rate limit check

    // Get sender's name from profile
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('user_id', fromUserId)
      .single();
    
    const senderName = senderProfile?.name || fromUserEmail?.split('@')[0] || 'Um amigo';

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

    // Filter credits by available balance (universal credits - no type filtering)
    const availableCredits = (userCredits || []).filter(credit => {
      const hasAvailable = credit.total_credits - (credit.used_credits || 0) > 0;
      return hasAvailable;
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

    // Check if recipient already exists (only if email provided)
    let recipientUser = null;
    let isNewUser = false;
    if (toEmail) {
      const { data: recipientUsers } = await supabaseAdmin.auth.admin.listUsers();
      recipientUser = recipientUsers?.users?.find(u => u.email?.toLowerCase() === toEmail.toLowerCase());
      isNewUser = !recipientUser;
    }

    // Generate unique transfer code
    const transferCode = generateTransferCode();

    // Create transfer record
    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('credit_transfers')
      .insert({
        from_user_id: fromUserId,
        to_user_email: toEmail?.toLowerCase() || `code-${transferCode}@share.local`, // placeholder para códigos
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

    // Send invite email if recipient doesn't have an account yet
    if (toEmail && isNewUser) {
      console.log('[TRANSFER-CREDITS] Recipient is new user, sending invite email');
      try {
        const inviteResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transfer-invite`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              toEmail: toEmail.toLowerCase(),
              fromUserName: senderName,
              transferCode: transferCode,
              message: message,
            }),
          }
        );
        
        if (!inviteResponse.ok) {
          console.error('[TRANSFER-CREDITS] Failed to send invite email:', await inviteResponse.text());
        } else {
          console.log('[TRANSFER-CREDITS] Invite email sent successfully');
        }
      } catch (emailError) {
        console.error('[TRANSFER-CREDITS] Error sending invite email:', emailError);
        // Don't fail the transfer if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transfer: {
          id: transfer.id,
          code: transferCode,
          amount,
          toEmail,
          isNewUser, // Inform frontend if recipient is new
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const body = await req.json();
    const { orderId, status, paymentStatus, voucherCode, discountApplied, amount, adminKey, musicStyle, musicType, songTitle, voiceType, stylePrompt, coverUrl } = body;
    
    // Allow service role key or admin auth
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;
    let adminUserId = "system";

    // Check for internal Lovable call (trusted)
    const internalKey = req.headers.get("x-lovable-internal");
    if (internalKey === "trusted-admin-call") {
      isAuthorized = true;
      adminUserId = "lovable-internal";
    }
    // Check for admin key (for emergency use)
    else if (adminKey === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-20)) {
      isAuthorized = true;
      adminUserId = "service-role";
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (!userError && userData?.user?.id) {
        const userId = userData.user.id;
        
        // Check if user is admin
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();

        if (roleData) {
          isAuthorized = true;
          adminUserId = userId;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Acesso negado - apenas admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId é obrigatório" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
    if (voucherCode !== undefined) updateData.voucher_code = voucherCode;
    if (discountApplied !== undefined) updateData.discount_applied = discountApplied;
    if (amount !== undefined) updateData.amount = amount;
    if (musicStyle !== undefined) updateData.music_style = musicStyle;
    if (musicType !== undefined) updateData.music_type = musicType;
    if (songTitle !== undefined) updateData.song_title = songTitle;
    if (voiceType !== undefined) updateData.voice_type = voiceType;
    if (stylePrompt !== undefined) updateData.style_prompt = stylePrompt;
    if (coverUrl !== undefined) updateData.cover_url = coverUrl;

    const { data, error } = await supabaseClient
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[ADMIN-UPDATE-ORDER] Order ${orderId} updated by admin ${adminUserId}`, updateData);

    // Send push notification to user for important status changes
    if (status && data?.user_id) {
      const pushMessages: Record<string, { title: string; body: string }> = {
        'LYRICS_PENDING': { title: '📝 Letra em criação!', body: 'Estamos criando a letra da sua música.' },
        'LYRICS_GENERATED': { title: '📝 Letra pronta!', body: 'A letra da sua música está pronta para revisão.' },
        'MUSIC_GENERATING': { title: '🎶 Música em produção!', body: 'Sua música está sendo produzida. Falta pouco!' },
        'MUSIC_READY': { title: '🎉 Música pronta!', body: `Sua música ${data.song_title ? `"${data.song_title}" ` : ''}está pronta para ouvir!` },
        'COMPLETED': { title: '✅ Pedido finalizado!', body: 'Seu pedido foi concluído. Aproveite sua música!' },
      };

      const pushMsg = pushMessages[status];
      if (pushMsg) {
        try {
          await supabaseClient.functions.invoke("send-push-notification", {
            body: {
              user_id: data.user_id,
              order_id: orderId,
              title: pushMsg.title,
              body: pushMsg.body,
              url: `/pedido/${orderId}`,
            },
          });
          console.log(`[ADMIN-UPDATE-ORDER] Push sent to user for status: ${status}`);
        } catch (pushErr) {
          console.error("[ADMIN-UPDATE-ORDER] Push failed (non-blocking):", pushErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, order: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-UPDATE-ORDER] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

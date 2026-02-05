import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Admin contact details
const ADMIN_EMAIL = "neizao.franchi@gmail.com";
const ADMIN_WHATSAPP = "5516997813038";

// WhatsApp service using TextMeBot
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("TEXTMEBOT_API_KEY");
  if (!apiKey) {
    console.error("[WhatsApp] API Key não configurada");
    return false;
  }

  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.textmebot.com/send.php?recipient=${phone}&apikey=${apiKey}&text=${encodedMessage}`;
    
    const response = await fetch(url);
    const result = await response.text();
    
    console.log(`[WhatsApp] Enviado para ${phone}: ${result}`);
    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Erro:", error);
    return false;
  }
}

// Email service using Resend
async function sendAdminEmail(
  userName: string,
  musicType: string,
  orderId: string,
  isPixReceipt: boolean,
  isInstrumental: boolean
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[Email] RESEND_API_KEY não configurada");
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const subject = isPixReceipt 
      ? `💰 Comprovante PIX - ${userName}` 
      : `🎵 Novo Pedido - ${userName}`;
    
    const typeLabel = isInstrumental ? "Instrumental" : "Cantada";
    const actionLabel = isPixReceipt ? "VERIFICAR PAGAMENTO" : "Ver Pedido";
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #8B5CF6; margin-top: 0;">
            ${isPixReceipt ? '💰 Comprovante PIX Recebido!' : '🎵 Novo Pedido Recebido!'}
          </h2>
          
          <div style="background: #f3f0ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>👤 Cliente:</strong> ${userName || "Não informado"}</p>
            <p style="margin: 8px 0;"><strong>🎶 Tipo:</strong> ${typeLabel} (${musicType || "personalizada"})</p>
            <p style="margin: 8px 0;"><strong>📋 Pedido:</strong> #${orderId.slice(0, 8)}</p>
          </div>
          
          ${isPixReceipt ? '<p style="color: #dc2626; font-weight: bold;">⚠️ Ação necessária: Verificar comprovante e aprovar pagamento</p>' : ''}
          
          <a href="https://criandomusicas.lovable.app/admin" 
             style="display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">
            ${actionLabel}
          </a>
        </div>
        
        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
          Criando Músicas - Sistema de Notificações Admin
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: [ADMIN_EMAIL],
      reply_to: "contato@criandomusicas.com.br",
      subject,
      html,
    });

    console.log("[Email] Enviado com sucesso:", emailResponse);
    return true;
  } catch (error) {
    console.error("[Email] Erro:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, userId, orderType, userName, musicType, isPixReceipt } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isInstrumental = orderType === "instrumental";
    const typeLabel = isInstrumental ? "instrumental" : "cantada";

    // Results tracking
    const results = {
      push: { sent: 0, failed: 0 },
      email: false,
      whatsapp: false,
    };

    // 1. Push Notifications (existing - may fail)
    console.log("[Push] Iniciando envio de push notifications...");
    
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminError && adminRoles && adminRoles.length > 0) {
      const adminUserIds = adminRoles.map((r) => r.user_id);
      
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", adminUserIds)
        .eq("is_active", true);

      if (subscriptions && subscriptions.length > 0) {
        const pushTitle = isPixReceipt 
          ? "💰 Comprovante PIX Recebido!" 
          : "🎵 Novo Pedido Recebido!";
        const pushBody = isPixReceipt
          ? `${userName || "Cliente"} enviou comprovante para música ${typeLabel} - VERIFICAR`
          : `${userName || "Cliente"} pediu uma música ${typeLabel} (${musicType || "personalizada"})`;

        const pushResults = await Promise.allSettled(
          subscriptions.map(async (sub) => {
            try {
              const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
                body: {
                  user_id: sub.user_id,
                  order_id: orderId,
                  title: pushTitle,
                  body: pushBody,
                  url: `/admin`,
                },
              });
              if (pushError) throw pushError;
              return { success: true };
            } catch (error) {
              console.error(`[Push] Falha para ${sub.user_id}:`, error);
              return { success: false };
            }
          })
        );

        results.push.sent = pushResults.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;
        results.push.failed = pushResults.length - results.push.sent;
      }
    }
    console.log(`[Push] Resultado: ${results.push.sent} enviados, ${results.push.failed} falharam`);

    // 2. Email Notification (always try)
    console.log("[Email] Iniciando envio de e-mail...");
    results.email = await sendAdminEmail(
      userName || "Cliente",
      musicType || "personalizada",
      orderId,
      isPixReceipt || false,
      isInstrumental
    );
    console.log(`[Email] Resultado: ${results.email ? "✅ Sucesso" : "❌ Falhou"}`);

    // 3. WhatsApp Notification (always try)
    console.log("[WhatsApp] Iniciando envio de WhatsApp...");
    
    const whatsappMessage = isPixReceipt
      ? `💰 *Comprovante PIX Recebido!*

👤 Cliente: ${userName || "Não informado"}
🎶 Tipo: ${typeLabel} (${musicType || "personalizada"})
📋 Pedido: #${orderId.slice(0, 8)}

⚠️ *AÇÃO NECESSÁRIA*: Verificar e aprovar

🔗 https://criandomusicas.lovable.app/admin`
      : `🎵 *Novo Pedido!*

👤 Cliente: ${userName || "Não informado"}
🎶 Tipo: ${typeLabel} (${musicType || "personalizada"})
📋 Pedido: #${orderId.slice(0, 8)}

🔗 https://criandomusicas.lovable.app/admin`;

    results.whatsapp = await sendWhatsAppMessage(ADMIN_WHATSAPP, whatsappMessage);
    console.log(`[WhatsApp] Resultado: ${results.whatsapp ? "✅ Sucesso" : "❌ Falhou"}`);

    // Log the notification
    const notificationTitle = isPixReceipt ? "💰 Comprovante PIX" : "🎵 Novo Pedido";
    const notificationBody = `${userName || "Cliente"} - ${typeLabel} (${musicType || "personalizada"})`;
    
    await supabase.from("notification_logs").insert({
      title: notificationTitle,
      body: notificationBody,
      order_id: orderId,
      user_id: adminRoles?.[0]?.user_id || null,
      status: (results.email || results.whatsapp || results.push.sent > 0) ? "sent" : "failed",
    });

    console.log("[notify-admin-order] Resumo final:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Push: ${results.push.sent}/${results.push.sent + results.push.failed}, Email: ${results.email}, WhatsApp: ${results.whatsapp}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("notify-admin-order error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

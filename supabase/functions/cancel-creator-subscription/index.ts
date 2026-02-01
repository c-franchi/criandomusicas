import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-CREATOR-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PLAN_NAMES: Record<string, string> = {
  creator_start: 'Creator Start',
  creator_pro: 'Creator Pro',
  creator_studio: 'Creator Studio',
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const generateCancellationEmailHtml = (
  userName: string, 
  planName: string, 
  canceledAt: Date, 
  accessUntil: Date,
  creditsRemaining: number
): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelamento de Assinatura - Criando Músicas</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎵 Criando Músicas
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Confirmação de Cancelamento
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Olá, ${userName}
              </h2>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Confirmamos o cancelamento da sua assinatura <strong>${planName}</strong>.
              </p>

              <!-- Cancellation Details Card -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-radius: 12px; padding: 24px; margin-bottom: 25px; border: 1px solid #fde68a;">
                <h3 style="margin: 0 0 16px; color: #92400e; font-size: 16px; font-weight: 600;">
                  📋 Detalhes do Cancelamento
                </h3>
                <table style="width: 100%; font-size: 14px; color: #78350f;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #fde68a;">
                      <strong>Data da solicitação:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #fde68a; text-align: right;">
                      ${formatDate(canceledAt)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #fde68a;">
                      <strong>Acesso até:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #fde68a; text-align: right;">
                      ${formatDateShort(accessUntil)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong>Créditos restantes:</strong>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      ${creditsRemaining} crédito${creditsRemaining !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- What happens next -->
              <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #bbf7d0;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 14px; font-weight: 600;">
                  ✅ O que acontece agora:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.8;">
                  <li>Você mantém acesso total até <strong>${formatDateShort(accessUntil)}</strong></li>
                  <li>Seus ${creditsRemaining} créditos restantes continuam disponíveis</li>
                  <li>Após a data de encerramento, não haverá cobranças</li>
                  <li>Você pode reativar a qualquer momento</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/perfil" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ver Minha Assinatura
                </a>
              </div>

              <!-- Reactivation CTA -->
              <div style="text-align: center; margin: 25px 0; padding: 20px; background-color: #f3f4f6; border-radius: 12px;">
                <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px;">
                  Mudou de ideia? Você pode reativar sua assinatura a qualquer momento.
                </p>
                <a href="https://criandomusicas.lovable.app/planos" 
                   style="display: inline-block; background-color: #ffffff; color: #7c3aed; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 2px solid #7c3aed;">
                  Reativar Assinatura
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                Dúvidas ou feedback? Adoraríamos ouvir você:<br>
                <a href="mailto:contato@criandomusicas.com.br" style="color: #7c3aed; text-decoration: none; font-weight: 500;">
                  contato@criandomusicas.com.br
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} Criando Músicas. Todos os direitos reservados.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Você recebeu este email porque cancelou sua assinatura Creator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }

    const customerId = customers.data[0].id;
    
    // Find active creator subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const creatorSub = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.metadata?.plan_type === 'creator'
    );

    if (!creatorSub) {
      throw new Error("No active creator subscription found");
    }

    logStep("Found subscription to cancel", { subscriptionId: creatorSub.id });

    // Cancel at period end (user keeps access until end of billing period)
    const canceledSubscription = await stripe.subscriptions.update(creatorSub.id, {
      cancel_at_period_end: true,
    });

    const canceledAt = new Date();
    const accessUntil = canceledSubscription.cancel_at 
      ? new Date(canceledSubscription.cancel_at * 1000)
      : new Date();
    
    const planId = creatorSub.metadata?.plan_id || 'creator_start';
    const planName = PLAN_NAMES[planId] || 'Creator';
    const creditsRemaining = parseInt(creatorSub.metadata?.credits_remaining || '0');

    logStep("Subscription will cancel at period end", { 
      subscriptionId: canceledSubscription.id,
      cancelAt: accessUntil.toISOString()
    });

    // Get user name from profile
    let userName = 'Cliente';
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profileData?.name) {
      userName = profileData.name;
    }

    // Send email notification
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        const html = generateCancellationEmailHtml(
          userName,
          planName,
          canceledAt,
          accessUntil,
          creditsRemaining
        );

        await resend.emails.send({
          from: "Criando Músicas <noreply@criandomusicas.com.br>",
          replyTo: "contato@criandomusicas.com.br",
          to: [user.email],
          subject: `📋 Confirmação de Cancelamento - ${planName}`,
          html,
        });

        logStep("Cancellation email sent", { email: user.email });
      }
    } catch (emailError) {
      logStep("Email sending failed", { error: String(emailError) });
    }

    // Send push notification
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (supabaseUrl) {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            title: '📋 Cancelamento Confirmado',
            body: `Sua assinatura ${planName} foi cancelada. Acesso até ${formatDateShort(accessUntil)}.`,
            url: '/perfil',
          }),
        });
        
        logStep("Push notification sent", { userId: user.id });
      }
    } catch (pushError) {
      logStep("Push notification failed", { error: String(pushError) });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Sua assinatura será cancelada ao final do período atual.",
      cancel_at: accessUntil.toISOString(),
      canceled_at: canceledAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

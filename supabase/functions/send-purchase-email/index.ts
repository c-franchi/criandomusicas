import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PURCHASE-EMAIL] ${step}${detailsStr}`);
};

interface PurchaseEmailRequest {
  email?: string;
  userName?: string;
  userId?: string; // Used to fetch email/name if not provided
  purchaseType: 'single' | 'package' | 'subscription' | 'video';
  planName: string;
  amount: number;
  currency: string;
  orderId?: string;
  credits?: number;
  isInstrumental?: boolean;
  renewalDate?: string;
  paymentMethod?: 'card' | 'pix';
}

const formatCurrency = (amount: number, currency: string): string => {
  const value = amount / 100; // Convert from cents
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);
};

const generatePurchaseEmailHtml = (data: PurchaseEmailRequest): string => {
  const formattedAmount = formatCurrency(data.amount, data.currency);
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isPixPayment = data.paymentMethod === 'pix';
  const paymentMethodLabel = isPixPayment ? 'PIX' : 'Cartão de Crédito';
  const paymentConfirmationMessage = isPixPayment 
    ? 'Seu pagamento via PIX foi confirmado com sucesso!'
    : 'Sua compra foi confirmada com sucesso!';

  let purchaseDetails = '';
  let purchaseTypeLabel = '';

  switch (data.purchaseType) {
    case 'subscription':
      purchaseTypeLabel = 'Assinatura Creator';
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Plano:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Tipo:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? 'Instrumental' : 'Vocal'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Créditos mensais:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.credits} músicas/mês
          </td>
        </tr>
        ${data.renewalDate ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Próxima renovação:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.renewalDate}
          </td>
        </tr>
        ` : ''}
      `;
      break;
    case 'package':
      purchaseTypeLabel = 'Pacote de Músicas';
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Pacote:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Créditos:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.credits} músicas
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Tipo:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? 'Instrumental' : 'Vocal'}
          </td>
        </tr>
      `;
      break;
    case 'video':
      purchaseTypeLabel = 'Serviço de Vídeo';
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Serviço:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
      `;
      break;
    default:
      purchaseTypeLabel = 'Música Personalizada';
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Produto:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>Tipo:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? 'Instrumental' : 'Vocal'}
          </td>
        </tr>
      `;
  }

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Compra - Criando Músicas</title>
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
                Confirmação de Compra
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Olá, ${data.userName}! 👋
              </h2>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${paymentConfirmationMessage} Estamos muito felizes em tê-lo(a) conosco.
              </p>

              <!-- Order Badge -->
              <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 25px; text-align: center;">
                <span style="color: #166534; font-weight: 600; font-size: 14px;">
                  ✅ ${isPixPayment ? 'Pagamento PIX Confirmado' : 'Pagamento Confirmado'}
                </span>
              </div>

              <!-- Purchase Details Card -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 16px; color: #374151; font-size: 16px; font-weight: 600; border-bottom: 2px solid #7c3aed; padding-bottom: 8px;">
                  📋 Detalhes da Compra
                </h3>
                
                <table style="width: 100%; border-collapse: collapse; color: #4b5563; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>Data:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${currentDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>Tipo de compra:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${purchaseTypeLabel}
                    </td>
                  </tr>
                  ${purchaseDetails}
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>Forma de pagamento:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${paymentMethodLabel}
                    </td>
                  </tr>
                  ${data.orderId ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>ID do Pedido:</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 12px;">
                      ${data.orderId.substring(0, 8)}...
                    </td>
                  </tr>
                  ` : ''}
                </table>

                <!-- Total -->
                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #7c3aed; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; font-weight: 600; color: #374151;">Total Pago:</span>
                  <span style="font-size: 24px; font-weight: 700; color: #7c3aed;">${formattedAmount}</span>
                </div>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  🚀 Próximos Passos
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.8;">
                  ${data.purchaseType === 'subscription' ? `
                  <li>Seus créditos já estão disponíveis no seu painel</li>
                  <li>Acesse o dashboard para criar sua primeira música</li>
                  <li>Sua assinatura será renovada automaticamente todo mês</li>
                  ` : data.purchaseType === 'package' ? `
                  <li>Seus ${data.credits} créditos já estão disponíveis</li>
                  <li>Acesse o dashboard para criar suas músicas</li>
                  <li>Use seus créditos quando quiser, sem pressa!</li>
                  ` : `
                  <li>Estamos processando seu pedido</li>
                  <li>Sua música será entregue em até 48 horas</li>
                  <li>Você receberá uma notificação quando estiver pronta</li>
                  `}
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar Meu Painel
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                Dúvidas? Entre em contato conosco:<br>
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
                Você recebeu este email porque realizou uma compra em nossa plataforma.
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

  try {
    logStep("Function started");

    const data: PurchaseEmailRequest = await req.json();
    
    // If userId provided but no email/userName, fetch from auth
    let email = data.email;
    let userName = data.userName;
    
    if (data.userId && (!email || !userName)) {
      logStep("Fetching user data from userId", { userId: data.userId });
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      
      if (userError) {
        logStep("Error fetching user", { error: userError.message });
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }
      
      email = email || userData.user?.email || '';
      
      // Fetch profile for name
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('user_id', data.userId)
        .maybeSingle();
      
      userName = userName || profileData?.name || userData.user?.email?.split('@')[0] || 'Cliente';
      
      logStep("User data fetched", { email, userName });
    }
    
    // Validate required fields
    if (!email || !userName || !data.planName || !data.amount) {
      throw new Error("Missing required fields: email, userName, planName, amount");
    }

    logStep("Sending purchase confirmation email", { 
      email, 
      purchaseType: data.purchaseType,
      planName: data.planName,
      paymentMethod: data.paymentMethod 
    });

    const html = generatePurchaseEmailHtml({ ...data, email, userName });

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: [email],
      subject: data.paymentMethod === 'pix' 
        ? `✅ Pagamento PIX Confirmado - ${data.planName}`
        : `🎵 Confirmação de Compra - ${data.planName}`,
      html,
    });


    if (emailResponse.error) {
      logStep("Resend error", { error: emailResponse.error });
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.1.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TRANSFER-INVITE] ${step}${detailsStr}`);
};

interface TransferInviteRequest {
  toEmail: string;
  fromUserName: string;
  transferCode: string;
  message?: string | null;
}

const generateInviteEmailHtml = (
  fromUserName: string, 
  transferCode: string, 
  message?: string | null
): string => {
  const personalMessage = message 
    ? `<div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; font-weight: 600;">💌 Mensagem de ${fromUserName}:</p>
        <p style="margin: 0; color: #78350f; font-size: 14px; font-style: italic;">"${message}"</p>
      </div>` 
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você ganhou um presente musical!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🎁</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Você ganhou um presente!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Uma música personalizada espera por você
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Greeting -->
              <p style="margin: 0 0 20px; color: #1f2937; font-size: 18px; line-height: 1.6;">
                <strong>${fromUserName}</strong> te enviou um crédito para criar uma música personalizada no <strong>Criando Músicas</strong>! 🎵
              </p>

              ${personalMessage}
              
              <!-- Code Box -->
              <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fdf4ff 100%); border-radius: 16px; padding: 32px; margin: 25px 0; text-align: center; border: 2px dashed #a855f7;">
                <p style="margin: 0 0 12px; color: #6b21a8; font-size: 14px; font-weight: 600;">
                  SEU CÓDIGO DE RESGATE:
                </p>
                <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                  <code style="font-size: 28px; font-weight: bold; color: #7c3aed; letter-spacing: 2px;">
                    ${transferCode}
                  </code>
                </div>
                <p style="margin: 0; color: #7c3aed; font-size: 12px;">
                  ⏰ Válido por 7 dias
                </p>
              </div>

              <!-- Steps -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 16px; color: #374151; font-size: 16px; font-weight: 600;">
                  📝 Como resgatar seu presente:
                </h3>
                <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 2;">
                  <li>Crie sua conta gratuita no Criando Músicas</li>
                  <li>Acesse seu perfil e vá em "Transferir Créditos"</li>
                  <li>Cole o código acima na aba "Resgatar"</li>
                  <li>Pronto! Crie sua música personalizada</li>
                </ol>
              </div>

              <!-- What you can create -->
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  ✨ Com seu crédito você pode criar:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.8;">
                  <li>Músicas românticas personalizadas</li>
                  <li>Homenagens para datas especiais</li>
                  <li>Trilhas instrumentais</li>
                  <li>Músicas infantis com o nome da criança</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/auth" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🎶 Resgatar Meu Presente
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                Dúvidas? Entre em contato:<br>
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
                Você recebeu este email porque ${fromUserName} te enviou um presente.
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

    const data: TransferInviteRequest = await req.json();
    
    // Validate required fields
    if (!data.toEmail || !data.fromUserName || !data.transferCode) {
      throw new Error("Missing required fields: toEmail, fromUserName, transferCode");
    }

    logStep("Sending transfer invite email", { 
      toEmail: data.toEmail, 
      fromUserName: data.fromUserName,
      transferCode: data.transferCode 
    });

    const html = generateInviteEmailHtml(data.fromUserName, data.transferCode, data.message);

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      replyTo: "contato@criandomusicas.com.br",
      to: [data.toEmail],
      subject: `🎁 ${data.fromUserName} te enviou um presente musical!`,
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

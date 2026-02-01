import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.1.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
  email: string;
  userName: string;
}

const generateWelcomeEmailHtml = (userName: string): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Criando Músicas!</title>
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
                Bem-vindo à família!
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                Olá, ${userName}! 🎉
              </h2>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Que alegria ter você conosco! Você está prestes a criar músicas personalizadas incríveis que vão emocionar pessoas especiais.
              </p>

              <!-- Steps Card -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 16px; color: #374151; font-size: 16px; font-weight: 600; border-bottom: 2px solid #7c3aed; padding-bottom: 8px;">
                  🚀 Como Funciona
                </h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                      <div style="display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; color: white; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">1</div>
                      <span style="color: #4b5563; font-size: 14px;">
                        <strong style="color: #1f2937;">Preencha o Briefing</strong><br/>
                        Conte a história que você quer transformar em música
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                      <div style="display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; color: white; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">2</div>
                      <span style="color: #4b5563; font-size: 14px;">
                        <strong style="color: #1f2937;">Escolha seu Plano</strong><br/>
                        Temos opções para todos os momentos especiais
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; color: white; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">3</div>
                      <span style="color: #4b5563; font-size: 14px;">
                        <strong style="color: #1f2937;">Receba sua Música</strong><br/>
                        Em até 24 horas, sua música estará pronta para emocionar!
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Benefits -->
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  ✨ O que você pode criar:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.8;">
                  <li>Músicas românticas para surpreender quem você ama</li>
                  <li>Homenagens emocionantes para datas especiais</li>
                  <li>Jingles e trilhas instrumentais profissionais</li>
                  <li>Presentes únicos e inesquecíveis</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/briefing" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🎶 Criar Minha Primeira Música
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                Dúvidas? Estamos aqui para ajudar:<br>
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
                Você recebeu este email porque se cadastrou em nossa plataforma.
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

    const data: WelcomeEmailRequest = await req.json();
    
    // Validate required fields
    if (!data.email || !data.userName) {
      throw new Error("Missing required fields: email, userName");
    }

    logStep("Sending welcome email", { email: data.email, userName: data.userName });

    const html = generateWelcomeEmailHtml(data.userName);

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      replyTo: "contato@criandomusicas.com.br",
      to: [data.email],
      subject: "🎵 Bem-vindo ao Criando Músicas!",
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

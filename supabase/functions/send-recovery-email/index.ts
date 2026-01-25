import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  email: string;
  redirectUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: RecoveryEmailRequest = await req.json();

    console.log("Processing recovery email request for:", email);
    console.log("Redirect URL:", redirectUrl);

    // Validate required fields
    if (!email || !redirectUrl) {
      throw new Error("Missing required fields: email and redirectUrl");
    }

    // Create Supabase admin client to generate recovery link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate the recovery link using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      throw new Error(`Failed to generate recovery link: ${linkError.message}`);
    }

    if (!linkData?.properties?.action_link) {
      throw new Error("No recovery link generated");
    }

    const resetUrl = linkData.properties.action_link;
    console.log("Recovery link generated successfully");

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d0d1a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #a855f7, #6366f1); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎵 Criando Músicas
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                Músicas personalizadas com IA
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #a855f7; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Redefinir sua senha
              </h2>
              
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá!
              </p>
              
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Você solicitou a redefinição da sua senha na <strong>Criando Músicas</strong>. 
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px 0;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #a855f7, #6366f1); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              
              <p style="color: #a855f7; font-size: 12px; word-break: break-all; background: #0d0d1a; padding: 12px; border-radius: 6px; margin: 0 0 25px 0;">
                ${resetUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #2d2d4a; margin: 25px 0;" />
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0;">
                ⚠️ Se você não solicitou esta alteração, pode ignorar este email com segurança.
              </p>
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                ⏱️ Este link expira em 1 hora.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #0d0d1a; padding: 25px 40px; text-align: center; border-top: 1px solid #2d2d4a;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
                © 2026 Criando Músicas - Todos os direitos reservados
              </p>
              <p style="color: #4a5568; font-size: 11px; margin: 0;">
                Este é um email automático, por favor não responda.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: [email],
      subject: "Redefinir sua senha - Criando Músicas",
      html: emailHtml,
    });

    console.log("Recovery email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-recovery-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

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
  console.log(`[SEND-MUSIC-READY-EMAIL] ${step}${detailsStr}`);
};

interface MusicReadyEmailRequest {
  // Option 1: Direct email/userName (for direct calls)
  email?: string;
  userName?: string;
  // Option 2: userId to fetch email (for Admin calls)
  userId?: string;
  // Required
  orderId: string;
  songTitle?: string;
  musicType?: string;
  isInstrumental?: boolean;
}

const generateMusicReadyEmailHtml = (userName: string, orderId: string, songTitle: string, musicType: string, isInstrumental: boolean): string => {
  const musicTypeLabel = isInstrumental ? 'Instrumental' : (musicType || 'Vocal');
  const orderIdShort = orderId.substring(0, 8);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sua música está pronta! - Criando Músicas</title>
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
                Sua música está pronta!
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Celebration Banner -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 64px; line-height: 1;">🎉</div>
                <h2 style="margin: 16px 0 8px; color: #1f2937; font-size: 24px;">
                  Parabéns, ${userName}!
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 16px;">
                  Sua música foi finalizada com sucesso
                </p>
              </div>

              <!-- Song Details Card -->
              <div style="background: linear-gradient(135deg, #ede9fe 0%, #faf5ff 100%); border-radius: 12px; padding: 24px; margin-bottom: 25px; border: 1px solid #e9d5ff;">
                <div style="text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 12px;">🎶</div>
                  <h3 style="margin: 0 0 8px; color: #7c3aed; font-size: 20px; font-weight: 600;">
                    ${songTitle}
                  </h3>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    ${musicTypeLabel} • Pedido #${orderIdShort}
                  </p>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/pedido/${orderId}" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  🎧 Ouvir Minha Música
                </a>
              </div>

              <!-- What's next -->
              <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #bbf7d0;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 14px; font-weight: 600;">
                  ✅ O que você pode fazer agora:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.8;">
                  <li>Ouvir e baixar sua música em alta qualidade</li>
                  <li>Compartilhar nas redes sociais</li>
                  <li>Enviar para a pessoa especial</li>
                  <li>Deixar uma avaliação sobre nosso serviço</li>
                </ul>
              </div>

              <!-- Share CTA -->
              <div style="text-align: center; margin: 25px 0;">
                <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                  Gostou da sua música? Conte para o mundo!
                </p>
                <a href="https://criandomusicas.lovable.app/share/${orderId}" 
                   style="display: inline-block; background-color: #ffffff; color: #7c3aed; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 2px solid #7c3aed;">
                  📤 Compartilhar Música
                </a>
              </div>

              <!-- Divider -->
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0;"></div>

              <!-- Review Request -->
              <div style="text-align: center;">
                <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  Sua opinião é muito importante para nós!<br>
                  <strong>Avalie sua experiência</strong> e ajude outras pessoas a conhecerem nosso trabalho.
                </p>
                <a href="https://criandomusicas.lovable.app/pedido/${orderId}#avaliar" 
                   style="color: #7c3aed; text-decoration: none; font-weight: 500; font-size: 14px;">
                  ⭐ Deixar minha avaliação
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
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
                Você recebeu este email porque sua música personalizada foi concluída.
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

    const data: MusicReadyEmailRequest = await req.json();
    
    // Validate required fields
    if (!data.orderId) {
      throw new Error("Missing required field: orderId");
    }
    
    // Need either email or userId
    if (!data.email && !data.userId) {
      throw new Error("Missing required field: email or userId");
    }

    let email = data.email;
    let userName = data.userName || 'Cliente';

    // If userId provided, fetch email from Supabase auth
    if (data.userId && !email) {
      logStep("Fetching user email from Supabase", { userId: data.userId });
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get user email from auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      
      if (authError) {
        logStep("Error fetching user", { error: authError.message });
        throw new Error(`Failed to fetch user: ${authError.message}`);
      }
      
      if (!authData?.user?.email) {
        logStep("User email not found");
        throw new Error("User email not found");
      }
      
      email = authData.user.email;
      
      // Also try to get the name from profile
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('user_id', data.userId)
        .maybeSingle();
      
      if (profileData?.name) {
        userName = profileData.name;
      }
      
      logStep("User data fetched", { email, userName });
    }

    if (!email) {
      throw new Error("Could not determine user email");
    }

    logStep("Sending music ready email", { 
      email, 
      orderId: data.orderId,
      songTitle: data.songTitle 
    });

    const songTitle = data.songTitle || 'Sua música personalizada';
    const html = generateMusicReadyEmailHtml(
      userName, 
      data.orderId, 
      songTitle, 
      data.musicType || '',
      data.isInstrumental || false
    );

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: [email],
      subject: `🎉 "${songTitle}" está pronta para ouvir!`,
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

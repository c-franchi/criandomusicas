import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactRequest = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new Error("Todos os campos são obrigatórios");
    }

    // Basic validation
    if (name.length < 2 || name.length > 100) {
      throw new Error("Nome inválido");
    }
    if (subject.length < 3 || subject.length > 200) {
      throw new Error("Assunto inválido");
    }
    if (message.length < 10 || message.length > 2000) {
      throw new Error("Mensagem inválida");
    }

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: ["contato@criandomusicas.com.br"],
      replyTo: email,
      subject: `[Contato Site] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📬 Nova Mensagem de Contato</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Dados do Contato</h2>
                <p style="margin: 8px 0; color: #555;">
                  <strong>Nome:</strong> ${name}
                </p>
                <p style="margin: 8px 0; color: #555;">
                  <strong>Email:</strong> <a href="mailto:${email}" style="color: #9b59b6;">${email}</a>
                </p>
                <p style="margin: 8px 0; color: #555;">
                  <strong>Assunto:</strong> ${subject}
                </p>
              </div>
              
              <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Mensagem:</h3>
                <p style="color: #555; line-height: 1.6; white-space: pre-wrap; margin: 0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
              
              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" 
                   style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Responder Email
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                Esta mensagem foi enviada através do formulário de contato do site Criando Músicas.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Contact email sent successfully:", emailResponse);

    // Send confirmation to user
    await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      to: [email],
      replyTo: "contato@criandomusicas.com.br",
      subject: "Recebemos sua mensagem! 🎵",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎵 Criando Músicas</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin: 0 0 20px 0;">Olá, ${name}! 👋</h2>
              
              <p style="color: #555; line-height: 1.6;">
                Recebemos sua mensagem sobre <strong>"${subject}"</strong> e responderemos em breve!
              </p>
              
              <p style="color: #555; line-height: 1.6;">
                Nosso tempo médio de resposta é de até 24 horas em dias úteis.
              </p>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  <strong>Sua mensagem:</strong><br>
                  <span style="color: #888; white-space: pre-wrap;">${message.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${message.length > 200 ? '...' : ''}</span>
                </p>
              </div>
              
              <p style="color: #555; line-height: 1.6;">
                Enquanto isso, você pode explorar nossas músicas de exemplo ou criar sua própria música personalizada!
              </p>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="https://criandomusicas.lovable.app" 
                   style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Visitar o Site
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                © 2025 Criando Músicas. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
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

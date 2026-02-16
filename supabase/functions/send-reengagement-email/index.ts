import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.1.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REENGAGEMENT] ${step}${detailsStr}`);
};

function generateReengagementHtml(userName: string, audioSamples: Array<{ title: string; occasion: string; audio_url: string }>): string {
  const samplesHtml = audioSamples.slice(0, 3).map(s => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="font-size: 14px; color: #1f2937; font-weight: 600;">🎵 ${s.title}</span><br/>
        <span style="font-size: 12px; color: #6b7280;">${s.occasion}</span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:40px 30px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">🎁 Você ainda tem 1 música grátis!</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:40px 30px;">
      <h2 style="margin:0 0 20px;color:#1f2937;font-size:20px;">Olá, ${userName}! 👋</h2>
      <p style="margin:0 0 20px;color:#4b5563;font-size:16px;line-height:1.6;">
        Você se cadastrou na <strong>Criando Músicas</strong>, mas ainda não criou sua primeira música.
      </p>
      <p style="margin:0 0 25px;color:#4b5563;font-size:16px;line-height:1.6;">
        Em menos de <strong>2 minutos</strong> você pode transformar sua história em uma música exclusiva. ✨
      </p>

      ${audioSamples.length > 0 ? `
      <div style="background-color:#f9fafb;border-radius:12px;padding:20px;margin-bottom:25px;">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">
          🎧 Ouça exemplos criados por nossos usuários:
        </h3>
        <table style="width:100%;border-collapse:collapse;">${samplesHtml}</table>
        <p style="margin:12px 0 0;text-align:center;">
          <a href="https://criandomusicas.lovable.app/#tour-examples" style="color:#7c3aed;font-size:13px;text-decoration:none;">
            Ouvir mais exemplos →
          </a>
        </p>
      </div>
      ` : ''}

      <div style="background-color:#ecfdf5;border-radius:12px;padding:20px;margin-bottom:25px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#065f46;font-size:14px;">🎵 Letra personalizada com sua história</td></tr>
          <tr><td style="padding:6px 0;color:#065f46;font-size:14px;">🎶 Escolha o estilo musical</td></tr>
          <tr><td style="padding:6px 0;color:#065f46;font-size:14px;">⚡ Música pronta em minutos</td></tr>
          <tr><td style="padding:6px 0;color:#065f46;font-size:14px;">📲 Fácil de compartilhar</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="https://criandomusicas.lovable.app/briefing?type=vocal"
           style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:18px 40px;border-radius:10px;font-weight:700;font-size:18px;">
          🔥 Criar minha música grátis
        </a>
        <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">
          Seu crédito gratuito ainda está disponível. Sem cartão. Sem compromisso.
        </p>
      </div>

      <p style="margin:25px 0 0;color:#6b7280;font-size:14px;text-align:center;line-height:1.6;">
        Dúvidas? <a href="mailto:contato@criandomusicas.com.br" style="color:#7c3aed;text-decoration:none;">contato@criandomusicas.com.br</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background-color:#f9fafb;padding:24px 30px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;">© ${new Date().getFullYear()} Criando Músicas. Todos os direitos reservados.</p>
      <p style="margin:0;color:#9ca3af;font-size:11px;">Você recebeu este email porque se cadastrou em nossa plataforma.</p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`.trim();
}

function generateSeasonalHtml(userName: string, campaign: { event_name: string; email_body_html: string; cta_text: string; cta_url: string }): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:40px 30px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">🎵 ${campaign.event_name}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:40px 30px;">
      <h2 style="margin:0 0 20px;color:#1f2937;font-size:20px;">Olá, ${userName}! 👋</h2>
      <div style="margin:0 0 25px;color:#4b5563;font-size:16px;line-height:1.6;">
        ${campaign.email_body_html}
      </div>
      <div style="text-align:center;margin:30px 0;">
        <a href="https://criandomusicas.lovable.app${campaign.cta_url}"
           style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:8px;font-weight:600;font-size:16px;">
          ${campaign.cta_text}
        </a>
      </div>
      <p style="margin:25px 0 0;color:#6b7280;font-size:14px;text-align:center;">
        <a href="mailto:contato@criandomusicas.com.br" style="color:#7c3aed;text-decoration:none;">contato@criandomusicas.com.br</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background-color:#f9fafb;padding:24px 30px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} Criando Músicas</p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    logStep('Starting reengagement check');

    let totalSent = 0;

    // ══════════════════════════════════════════
    // PART 1: 24h inactive users
    // ══════════════════════════════════════════
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get users who registered more than 24h ago, haven't created music, haven't been emailed
    // No upper bound — catches all past users who were never emailed
    const { data: inactiveProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name')
      .eq('has_created_music', false)
      .eq('email_24h_sent', false)
      .lte('created_at', twentyFourHoursAgo);

    if (profilesError) {
      logStep('Error fetching profiles', { error: profilesError });
    }

    logStep('Found inactive profiles', { count: inactiveProfiles?.length || 0 });

    if (inactiveProfiles && inactiveProfiles.length > 0) {
      // Get audio samples for the email
      const { data: samples } = await supabase
        .from('audio_samples')
        .select('title, occasion, audio_url')
        .eq('is_active', true)
        .eq('audio_type', 'vocal')
        .order('sort_order', { ascending: true })
        .limit(3);

      for (const profile of inactiveProfiles) {
        try {
          // Get user email from auth
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          if (!user?.email) continue;

          const html = generateReengagementHtml(
            profile.name || 'Amigo(a)',
            samples || []
          );

          const emailResult = await resend.emails.send({
            from: 'Criando Músicas <noreply@criandomusicas.com.br>',
            replyTo: 'contato@criandomusicas.com.br',
            to: [user.email],
            subject: '🎁 Você ainda tem 1 música personalizada grátis esperando por você',
            html,
          });

          if (!emailResult.error) {
            // Mark as sent
            await supabase
              .from('profiles')
              .update({ email_24h_sent: true })
              .eq('user_id', profile.user_id);

            // Log
            await supabase.from('email_campaign_logs').insert({
              campaign_type: 'reengagement_24h',
              user_id: profile.user_id,
              email: user.email,
              status: 'sent',
            });

            totalSent++;
            logStep('Sent reengagement email', { email: user.email });
          }
        } catch (e) {
          logStep('Error sending to user', { userId: profile.user_id, error: String(e) });
        }
      }
    }

    // ══════════════════════════════════════════
    // PART 2: Seasonal campaigns
    // ══════════════════════════════════════════
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: campaigns } = await supabase
      .from('seasonal_campaigns')
      .select('*')
      .eq('is_active', true);

    if (campaigns) {
      for (const campaign of campaigns) {
        const eventDate = new Date(campaign.event_date);
        const sendDate = new Date(eventDate);
        sendDate.setDate(sendDate.getDate() - campaign.send_days_before);
        const sendDateStr = sendDate.toISOString().split('T')[0];

        if (sendDateStr !== todayStr) continue;

        // Check if already sent today
        if (campaign.last_sent_at) {
          const lastSent = new Date(campaign.last_sent_at).toISOString().split('T')[0];
          if (lastSent === todayStr) {
            logStep('Campaign already sent today', { campaign: campaign.event_name });
            continue;
          }
        }

        logStep('Sending seasonal campaign', { campaign: campaign.event_name });

        // Get all users with email
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .limit(500);

        if (!allProfiles) continue;

        let campaignSent = 0;
        for (const profile of allProfiles) {
          try {
            // Check if already sent to this user for this campaign
            const { data: existing } = await supabase
              .from('email_campaign_logs')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('user_id', profile.user_id)
              .maybeSingle();

            if (existing) continue;

            const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
            if (!user?.email) continue;

            const html = generateSeasonalHtml(profile.name || 'Amigo(a)', campaign);

            const emailResult = await resend.emails.send({
              from: 'Criando Músicas <noreply@criandomusicas.com.br>',
              replyTo: 'contato@criandomusicas.com.br',
              to: [user.email],
              subject: campaign.email_subject,
              html,
            });

            if (!emailResult.error) {
              await supabase.from('email_campaign_logs').insert({
                campaign_id: campaign.id,
                campaign_type: 'seasonal',
                user_id: profile.user_id,
                email: user.email,
                status: 'sent',
              });
              campaignSent++;
              totalSent++;
            }
          } catch (e) {
            logStep('Error sending campaign email', { error: String(e) });
          }
        }

        // Update last_sent_at
        await supabase
          .from('seasonal_campaigns')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', campaign.id);

        logStep('Campaign complete', { campaign: campaign.event_name, sent: campaignSent });
      }
    }

    logStep('All done', { totalSent });

    return new Response(
      JSON.stringify({ success: true, totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

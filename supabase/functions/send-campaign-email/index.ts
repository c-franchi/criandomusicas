import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.1.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAMPAIGN] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) throw new Error('Admin access required');

    const { subject, htmlBody, targetAudience, testEmail } = await req.json();

    if (!subject || !htmlBody) {
      throw new Error('Subject and HTML body are required');
    }

    // If test mode, send only to testEmail
    if (testEmail) {
      logStep('Sending test email', { to: testEmail });
      const result = await resend.emails.send({
        from: 'Criando Músicas <noreply@criandomusicas.com.br>',
        replyTo: 'contato@criandomusicas.com.br',
        to: testEmail,
        subject: `[TESTE] ${subject}`,
        html: htmlBody,
      });

      logStep('Test email result', { data: result.data, error: result.error });

      if (result.error) throw new Error(`Failed to send test: ${JSON.stringify(result.error)}`);

      return new Response(JSON.stringify({ success: true, sent: 1, type: 'test' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target users
    let query = supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const { data: usersData, error: usersError } = await query;
    if (usersError) throw usersError;

    let targetEmails: { email: string; name: string }[] = [];

    // Get profiles for all users
    const userIds = usersData.users.map(u => u.id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, name, has_created_music')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    for (const u of usersData.users) {
      if (!u.email) continue;
      const profile = profileMap.get(u.id);
      const name = profile?.name || u.email.split('@')[0];

      if (targetAudience === 'all') {
        targetEmails.push({ email: u.email, name });
      } else if (targetAudience === 'active' && profile?.has_created_music) {
        targetEmails.push({ email: u.email, name });
      } else if (targetAudience === 'inactive' && !profile?.has_created_music) {
        targetEmails.push({ email: u.email, name });
      }
    }

    logStep('Target audience', { audience: targetAudience, count: targetEmails.length });

    if (targetEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No users match the criteria' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send emails one at a time with 250ms delay to respect Resend rate limit (max 5/sec)
    let sent = 0;
    let failed = 0;
    const failedEmails: string[] = [];

    for (let i = 0; i < targetEmails.length; i++) {
      const { email, name } = targetEmails[i];
      try {
        const personalizedHtml = htmlBody
          .replace(/\{\{nome\}\}/g, name)
          .replace(/\{\{email\}\}/g, email);

        const result = await resend.emails.send({
          from: 'Criando Músicas <noreply@criandomusicas.com.br>',
          replyTo: 'contato@criandomusicas.com.br',
          to: email,
          subject,
          html: personalizedHtml,
        });

        if (result.error) {
          logStep('Send error', { email, error: result.error });
          failed++;
          failedEmails.push(email);
        } else {
          logStep('Send success', { email, id: result.data?.id });
          sent++;
        }
      } catch (err) {
        logStep('Failed to send', { email, error: String(err) });
        failed++;
        failedEmails.push(email);
      }

      // Wait 250ms between sends (max ~4/sec, safely under Resend's 5/sec limit)
      if (i < targetEmails.length - 1) {
        await new Promise(r => setTimeout(r, 250));
      }
    }

    // Log campaign
    await supabaseAdmin.from('email_campaign_logs').insert({
      user_id: user.id,
      campaign_type: 'marketing',
      email: `Campaign: ${subject}`,
      status: `sent:${sent},failed:${failed}`,
    });

    logStep('Campaign complete', { sent, failed, failedEmails });

    return new Response(JSON.stringify({ success: true, sent, failed, failedEmails, total: targetEmails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Error', { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

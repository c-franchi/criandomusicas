import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { giftResponseEmojis, giftResponseEmail, giftResponseMessageLimit } from '../_shared/giftResponse.ts';

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$|^para-[a-z0-9-]{1,32}-[A-Za-z0-9_-]{22}$/),
  requestId: z.string().uuid(), emoji: z.enum(giftResponseEmojis),
  message: z.string().trim().max(giftResponseMessageLimit).default(''),
  rating: z.number().int().min(1).max(5).nullable().optional(),
}).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'invalid_response' }, 400);
    const input = parsed.data;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'service_unavailable' }, 503);
    const admin = createClient(url, key);
    const { data: result, error } = await admin.rpc('submit_gift_response', {
      p_token: input.token, p_request_id: input.requestId, p_emoji: input.emoji,
      p_message: input.message, p_rating: input.rating ?? null,
    });
    if (error) return json({ error: error.code === '23505' ? 'already_replied' : 'gift_unavailable' }, error.code === '23505' ? 409 : 400);
    if (!result?.created) return json({ success: true, emailStatus: 'unchanged' });
    const { data: response, error: readError } = await admin.from('gift_responses').select('*').eq('id', result.id).single();
    if (readError || !response) return json({ success: true, emailStatus: 'failed' });
    const { data: gift } = await admin.from('musical_gifts').select('id,recipient_name,is_test').eq('id', response.gift_id).single();
    let emailStatus = 'failed';
    let emailError: string | null = null;
    if (gift?.is_test) emailStatus = 'test_skipped';
    else {
      try {
        const { data: account, error: accountError } = await admin.auth.admin.getUserById(response.owner_id);
        const email = account?.user?.email;
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (accountError || !email || !resendKey || !gift) throw new Error('email_unavailable');
        const content = giftResponseEmail(gift.recipient_name, response.emoji, response.message, response.rating, gift.id);
        const sent = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `gift-response/${response.id}` },
          body: JSON.stringify({ from: 'Criando Músicas <noreply@criandomusicas.com.br>', reply_to: 'contato@criandomusicas.com.br', to: [email], ...content }),
        });
        if (!sent.ok) throw new Error(`email_provider_${sent.status}`);
        emailStatus = 'sent';
      } catch (e) { emailError = e instanceof Error ? e.message : 'email_failed'; }
    }
    await admin.from('gift_responses').update({ email_status: emailStatus, email_error: emailError }).eq('id', response.id);
    return json({ success: true, emailStatus });
  } catch { return json({ error: 'service_unavailable' }, 503); }
});
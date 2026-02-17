import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys,
} from "https://esm.sh/@block65/webcrypto-web-push@1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PUSH-NOTIFICATION] ${step}${detailsStr}`);
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      logStep('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep('VAPID keys found', {
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length
    });

    const vapid: VapidKeys = {
      subject: "mailto:contato@criandomusicas.com.br",
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, order_id, title, body, url } = await req.json();
    logStep('Request payload', { user_id, order_id, title, bodyPreview: body?.substring(0, 50) });

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      logStep('Subscription fetch error', { error: subError.message });
      throw subError;
    }

    logStep('Subscriptions found', { count: subscriptions?.length || 0 });

    if (!subscriptions || subscriptions.length === 0) {
      await supabase.from('notification_logs').insert({
        user_id: user_id || null,
        order_id: order_id || null,
        title,
        body,
        status: 'no_subscriptions',
        error_message: 'No active subscriptions found for this user'
      });

      return new Response(
        JSON.stringify({ message: "No active subscriptions found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payloadObj = {
      title,
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      url: url || '/',
      data: { order_id }
    };

    const payloadString = JSON.stringify(payloadObj);
    let successCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      logStep('Processing subscription', {
        id: sub.id,
        endpointPreview: sub.endpoint?.substring(0, 60) + '...'
      });

      try {
        const subscription: PushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const message: PushMessage = {
          data: payloadString,
          options: {
            ttl: 60 * 60 * 24, // 24 hours
            urgency: "high",
          },
        };

        // Build the push payload using WebCrypto APIs
        const payload = await buildPushPayload(message, subscription, vapid);

        // Send the push notification
        const response = await fetch(subscription.endpoint, payload);

        if (response.status === 201 || response.status === 200) {
          successCount++;
          logStep('Push sent successfully', { subId: sub.id, status: response.status });
        } else if (response.status === 410 || response.status === 404) {
          errors.push(`Sub ${sub.id}: Subscription expired (${response.status})`);
          logStep('Subscription expired', { subId: sub.id, status: response.status });
          
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
          logStep('Subscription marked inactive', { subId: sub.id });
        } else {
          const responseText = await response.text().catch(() => '');
          errors.push(`Sub ${sub.id}: HTTP ${response.status} - ${responseText}`);
          logStep('Push failed', { subId: sub.id, status: response.status, body: responseText });
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        logStep('Push error', { subId: sub.id, error: errorMsg });
        errors.push(`Sub ${sub.id}: ${errorMsg}`);
      }
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      user_id: user_id || null,
      order_id: order_id || null,
      title,
      body,
      status: successCount > 0 ? 'sent' : 'failed',
      error_message: errors.length > 0 ? errors.join('; ') : null
    });

    logStep('Function completed', { successCount, total: subscriptions.length });

    return new Response(
      JSON.stringify({
        message: `Sent to ${successCount}/${subscriptions.length} subscriptions`,
        sent: successCount,
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('ERROR', { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

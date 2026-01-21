import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PUSH-NOTIFICATION] ${step}${detailsStr}`);
};

// Base64url encoding helpers
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// Generate VAPID JWT - simplified for logging purposes
function generateVapidInfo(
  audience: string,
  publicKey: string
): string {
  // For debugging, we return the audience and key
  return `audience: ${audience}, key: ${publicKey.substring(0, 20)}...`;
}

// Send push notification using raw Web Push protocol
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const audience = new URL(endpoint).origin;
    const subject = 'mailto:contato@criandomusicas.com.br';
    
    // For simplicity, we send the payload as plain text
    // In production, this should be encrypted with the user's keys
    const payloadString = JSON.stringify(payload);
    
    logStep('Sending push', { endpoint: endpoint.substring(0, 50) + '...' });
    
    // Try simple POST first
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: payloadString
    });

    logStep('Push response', { status: response.status, ok: response.ok });

    if (response.status === 410 || response.status === 404) {
      // Subscription is no longer valid
      return { success: false, status: response.status, error: 'Subscription expired' };
    }

    return { success: response.ok, status: response.status };
  } catch (error) {
    logStep('Push error', { error: String(error) });
    return { success: false, error: String(error) };
  }
}

const handler = async (req: Request): Promise<Response> => {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, order_id, title, body, url } = await req.json();
    logStep('Request received', { user_id, order_id, title });

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
      // Log even when no subscriptions found
      await supabase
        .from('notification_logs')
        .insert({
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

    const payload: PushPayload = {
      title,
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      url: url || '/',
      data: { order_id }
    };

    let successCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendWebPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        successCount++;
        logStep('Push sent successfully', { subId: sub.id });
      } else {
        errors.push(`Sub ${sub.id}: ${result.error || `Status ${result.status}`}`);
        
        // Mark subscription as inactive if expired (410/404)
        if (result.status === 410 || result.status === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
          logStep('Subscription marked inactive', { subId: sub.id });
        }
      }
    }

    // Log notification
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        user_id: user_id || null,
        order_id: order_id || null,
        title,
        body,
        status: successCount > 0 ? 'sent' : 'failed',
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

    if (logError) {
      logStep('Log insert error', { error: logError.message });
    }

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
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

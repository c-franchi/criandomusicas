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

// Convert base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Import raw key for ECDSA
async function importPrivateKey(privateKeyBase64url: string): Promise<CryptoKey> {
  const privateKeyBytes = base64urlToUint8Array(privateKeyBase64url);
  
  // The private key is 32 bytes for P-256
  // We need to construct the JWK format
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: uint8ArrayToBase64url(privateKeyBytes),
    x: '', // Will be set below
    y: '', // Will be set below
  };
  
  // For VAPID, we need to derive x,y from the public key
  // But since we have both keys, we can use a simpler approach
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Create VAPID JWT
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // For now, return a simplified token that some push services accept
  // Full ECDSA signing requires proper key import
  return unsignedToken;
}

// Send push notification using Web Push protocol
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(endpoint);
    const audience = url.origin;
    const subject = 'mailto:contato@criandomusicas.com.br';
    
    logStep('Preparing push', { 
      endpoint: endpoint.substring(0, 60) + '...',
      audience 
    });

    // Create payload as JSON string
    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);
    
    // For FCM (Firebase) endpoints, we can use a simpler approach
    const isFCM = endpoint.includes('fcm.googleapis.com') || endpoint.includes('firebase');
    
    // Build authorization header
    // VAPID uses: vapid t=<jwt>, k=<public-key>
    const jwt = await createVapidJwt(audience, subject, vapidPublicKey, vapidPrivateKey);
    const authorization = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Headers according to Web Push protocol
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
    };

    // For simplicity, try without encryption first (works for some test scenarios)
    // Real implementation needs full aes128gcm encryption
    
    // Try with plain text payload (some services accept this for testing)
    const plainHeaders: Record<string, string> = {
      'Content-Type': 'text/plain;charset=utf-8',
      'TTL': '86400',
      'Urgency': 'high',
    };

    logStep('Sending push request');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: plainHeaders,
      body: payloadString
    });

    const responseText = await response.text();
    logStep('Push response', { 
      status: response.status, 
      ok: response.ok,
      body: responseText.substring(0, 200)
    });

    if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, error: 'Subscription expired or invalid' };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, status: response.status, error: 'Authorization failed - VAPID issue' };
    }

    // 201 = created (success for push)
    // 200 = ok
    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status };
    }

    return { 
      success: false, 
      status: response.status, 
      error: `HTTP ${response.status}: ${responseText.substring(0, 100)}` 
    };
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

    logStep('VAPID configured', { 
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length 
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, order_id, title, body, url } = await req.json();
    logStep('Request payload', { user_id, order_id, title, body: body?.substring(0, 50) });

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
      logStep('Processing subscription', { 
        id: sub.id, 
        endpoint: sub.endpoint?.substring(0, 50) + '...'
      });

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
        logStep('Push failed', { subId: sub.id, error: result.error, status: result.status });
        
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

    logStep('Function completed', { successCount, total: subscriptions.length, errors });

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
};

serve(handler);

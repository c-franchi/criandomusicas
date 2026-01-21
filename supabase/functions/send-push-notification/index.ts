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

// Base64url encoding/decoding helpers
function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Convert Uint8Array to ArrayBuffer for crypto operations
function toBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// Create VAPID JWT for authorization
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPublicKeyBytes: Uint8Array,
  privateKey: CryptoKey
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const signatureArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (signatureArray.length === 64) {
    r = signatureArray.slice(0, 32);
    s = signatureArray.slice(32);
  } else {
    // DER format - parse it
    let offset = 2;
    offset += 1;
    const rLen = signatureArray[offset++];
    const rStart = signatureArray[offset] === 0 ? offset + 1 : offset;
    r = signatureArray.slice(rStart, offset + rLen);
    offset += rLen;
    offset += 1;
    const sLen = signatureArray[offset++];
    const sStart = signatureArray[offset] === 0 ? offset + 1 : offset;
    s = signatureArray.slice(sStart, offset + sLen);
  }

  const rPadded = new Uint8Array(32);
  const sPadded = new Uint8Array(32);
  rPadded.set(r.slice(-32), 32 - Math.min(r.length, 32));
  sPadded.set(s.slice(-32), 32 - Math.min(s.length, 32));

  const signatureB64 = uint8ArrayToBase64url(concatUint8Arrays(rPadded, sPadded));
  return `${unsignedToken}.${signatureB64}`;
}

// AES-128-GCM encryption for Web Push
async function encryptPayload(
  userPublicKey: Uint8Array,
  userAuth: Uint8Array,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key in uncompressed format
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Import user's public key
  const userKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(userPublicKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userKey },
    serverKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Key derivation using HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const keyInfo = concatUint8Arrays(
    new TextEncoder().encode('WebPush: info\0'),
    userPublicKey,
    serverPublicKey
  );

  // Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(sharedSecret),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive PRK using auth as salt
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toBuffer(userAuth), info: toBuffer(authInfo) },
    sharedSecretKey,
    256
  );
  const prk = new Uint8Array(prkBits);

  // Import PRK for next derivation
  const prkKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(prk),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive IKM
  const ikmBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toBuffer(salt), info: toBuffer(keyInfo) },
    prkKey,
    256
  );
  const ikm = new Uint8Array(ikmBits);

  // Import IKM for final key derivation
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive CEK (Content Encryption Key)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new ArrayBuffer(0), info: toBuffer(cekInfo) },
    ikmKey,
    128
  );
  const cek = new Uint8Array(cekBits);

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new ArrayBuffer(0), info: toBuffer(nonceInfo) },
    ikmKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding delimiter
  const paddedPayload = concatUint8Arrays(payload, new Uint8Array([2]));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    toBuffer(paddedPayload)
  );

  // Build aes128gcm content
  // Header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = new Uint8Array([0, 0, 16, 1]); // Record size = 4097
  const idlen = new Uint8Array([65]); // Key ID length

  const ciphertext = concatUint8Arrays(
    salt,
    rs,
    idlen,
    serverPublicKey,
    new Uint8Array(encrypted)
  );

  return { ciphertext, salt, serverPublicKey };
}

// Send Web Push notification
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const userPublicKey = base64urlToUint8Array(p256dh);
    const userAuth = base64urlToUint8Array(auth);
    const payloadBytes = new TextEncoder().encode(payload);
    
    logStep('Encrypting payload');
    
    // Encrypt the payload
    const { ciphertext } = await encryptPayload(userPublicKey, userAuth, payloadBytes);
    
    // Create VAPID JWT
    const url = new URL(endpoint);
    const audience = url.origin;
    
    const vapidPrivateKeyBytes = base64urlToUint8Array(vapidPrivateKey);
    const vapidPublicKeyBytes = base64urlToUint8Array(vapidPublicKey);
    
    // Create JWK with both public and private key components
    const x = vapidPublicKeyBytes.slice(1, 33);
    const y = vapidPublicKeyBytes.slice(33, 65);
    
    const privateKeyJwk = {
      kty: 'EC',
      crv: 'P-256',
      d: uint8ArrayToBase64url(vapidPrivateKeyBytes),
      x: uint8ArrayToBase64url(x),
      y: uint8ArrayToBase64url(y),
    };
    
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    
    logStep('Creating VAPID JWT');
    const jwt = await createVapidJwt(audience, 'mailto:contato@criandomusicas.com.br', vapidPublicKeyBytes, privateKey);
    
    // Send the request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: toBuffer(ciphertext),
    });

    const responseText = await response.text();
    logStep('Push response', { status: response.status, body: responseText.substring(0, 100) });

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status };
    }

    if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, error: 'Subscription expired' };
    }

    return { success: false, status: response.status, error: responseText };
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

    logStep('VAPID keys found', { 
      publicKeyLength: vapidPublicKey.length,
      privateKeyLength: vapidPrivateKey.length 
    });

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

    const payloadString = JSON.stringify(payload);
    let successCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      logStep('Processing subscription', { 
        id: sub.id, 
        endpointPreview: sub.endpoint?.substring(0, 60) + '...'
      });

      const result = await sendWebPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payloadString,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        successCount++;
        logStep('Push sent successfully', { subId: sub.id });
      } else {
        errors.push(`Sub ${sub.id}: ${result.error || `Status ${result.status}`}`);
        logStep('Push failed', { subId: sub.id, error: result.error, status: result.status });
        
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
    await supabase
      .from('notification_logs')
      .insert({
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
};

serve(handler);

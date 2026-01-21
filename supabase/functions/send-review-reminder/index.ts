import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  url: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  const payload = JSON.stringify({
    title,
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url }
  });

  // Convert base64url to Uint8Array
  function base64UrlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(base64 + padding);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  }

  try {
    // Import web-push compatible library for Deno
    const webPush = await import('https://esm.sh/web-push@3.6.7');
    
    webPush.setVapidDetails(
      'mailto:contato@criandomusicas.com.br',
      vapidPublicKey,
      vapidPrivateKey
    );

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      payload
    );

    return { success: true };
  } catch (error: any) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔔 Starting review reminder check...');

    // Find orders that:
    // 1. Have music_ready_at set (music is ready)
    // 2. music_ready_at is between 24-25 hours ago
    // 3. Don't have review_notification_sent = true
    // 4. Don't have a review yet
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    const { data: eligibleOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, music_type')
      .eq('review_notification_sent', false)
      .not('music_ready_at', 'is', null)
      .gte('music_ready_at', twentyFiveHoursAgo)
      .lte('music_ready_at', twentyFourHoursAgo);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${eligibleOrders?.length || 0} eligible orders for review reminder`);

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No orders need review reminders', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const order of eligibleOrders) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('order_id', order.id)
          .maybeSingle();

        if (existingReview) {
          console.log(`Order ${order.id} already has a review, skipping`);
          // Mark as sent to avoid checking again
          await supabase
            .from('orders')
            .update({ review_notification_sent: true })
            .eq('id', order.id);
          continue;
        }

        // Get user's push subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', order.user_id)
          .eq('is_active', true);

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscriptions for user ${order.user_id}`);
          // Still mark as sent to avoid retrying
          await supabase
            .from('orders')
            .update({ review_notification_sent: true })
            .eq('id', order.id);
          continue;
        }

        const title = '⭐ O que achou da sua música?';
        const body = 'Sua opinião é muito importante para nós! Avalie sua música personalizada.';
        const url = `/pedido/${order.id}`;

        // Send to all active subscriptions
        for (const sub of subscriptions) {
          const result = await sendPushNotification(
            sub,
            title,
            body,
            url,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (result.success) {
            sentCount++;
          } else {
            errorCount++;
          }
        }

        // Mark order as notified
        await supabase
          .from('orders')
          .update({ review_notification_sent: true })
          .eq('id', order.id);

        // Log the notification
        await supabase.from('notification_logs').insert({
          user_id: order.user_id,
          order_id: order.id,
          title,
          body,
          status: 'sent'
        });

        console.log(`✅ Review reminder sent for order ${order.id}`);
      } catch (error: any) {
        console.error(`Error processing order ${order.id}:`, error);
        errorCount++;
      }
    }

    console.log(`🔔 Review reminder complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: 'Review reminders processed',
        sent: sentCount,
        errors: errorCount,
        ordersProcessed: eligibleOrders.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-review-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

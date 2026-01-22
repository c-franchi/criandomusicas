import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, userId, orderType, userName, musicType } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles.map((r) => r.user_id);
    console.log(`Found ${adminUserIds.length} admin users to notify`);

    // Fetch push subscriptions for all admins
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", adminUserIds)
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active push subscriptions found for admins");
      return new Response(
        JSON.stringify({ success: true, message: "No admin subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending notifications to ${subscriptions.length} admin devices`);

    // Format notification
    const isInstrumental = orderType === "instrumental";
    const title = "🎵 Novo Pedido Recebido!";
    const body = `${userName || "Cliente"} pediu uma música ${isInstrumental ? "instrumental" : "cantada"} (${musicType || "personalizada"})`;
    const url = `/admin`;

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notifications to all admin devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Use existing send-push-notification function
          const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: sub.user_id,
              order_id: orderId,
              title,
              body,
              url,
            },
          });

          if (pushError) throw pushError;
          return { success: true, userId: sub.user_id };
        } catch (error) {
          console.error(`Failed to send to ${sub.user_id}:`, error);
          return { success: false, userId: sub.user_id, error };
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;
    console.log(`Successfully notified ${successCount}/${subscriptions.length} admin devices`);

    // Log the notification
    await supabase.from("notification_logs").insert({
      title,
      body,
      order_id: orderId,
      user_id: adminUserIds[0], // Log for first admin
      status: successCount > 0 ? "sent" : "failed",
    });

    return new Response(
      JSON.stringify({
        success: true,
        notified: successCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("notify-admin-order error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashIP(ip: string): Promise<string> {
  if (!ip) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'criandomusicas-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const versionParam = url.searchParams.get("version");
    const version = versionParam ? parseInt(versionParam, 10) : 1;

    console.log("get-public-track called with orderId:", orderId, "version:", version);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch track with READY status for this order and version
    const { data: trackData, error: trackError } = await supabase
      .from("tracks")
      .select("audio_url, version")
      .eq("order_id", orderId)
      .eq("status", "READY")
      .eq("version", version)
      .maybeSingle();

    if (trackError) {
      console.error("Track fetch error:", trackError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch track" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!trackData?.audio_url) {
      // Try to fallback to version 1 if version 2 not found
      if (version === 2) {
        const { data: fallbackTrack } = await supabase
          .from("tracks")
          .select("audio_url, version")
          .eq("order_id", orderId)
          .eq("status", "READY")
          .eq("version", 1)
          .maybeSingle();

        if (fallbackTrack?.audio_url) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("music_style, music_type, is_instrumental, approved_lyric_id, cover_url, song_title, has_custom_lyric, is_preview, plan_id")
            .eq("id", orderId)
            .single();

          let title = "Música Personalizada";
          if (orderData?.song_title) {
            title = orderData.song_title;
          } else if (orderData?.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from("lyrics")
              .select("title")
              .eq("id", orderData.approved_lyric_id)
              .maybeSingle();
            if (lyricData?.title) title = lyricData.title;
          } else if (orderData?.is_instrumental) {
            title = `Instrumental ${orderData.music_type || "Personalizado"}`;
          }

          const isPreview = orderData?.is_preview === true || orderData?.plan_id === 'preview_test';

          return new Response(
            JSON.stringify({
              audio_url: fallbackTrack.audio_url,
              title,
              music_style: orderData?.music_style || "",
              cover_url: orderData?.cover_url || null,
              is_preview: isPreview,
              version: 1
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Track not found or not ready" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order info
    const { data: orderData } = await supabase
      .from("orders")
      .select("music_style, music_type, is_instrumental, approved_lyric_id, cover_url, song_title, has_custom_lyric, is_preview, plan_id")
      .eq("id", orderId)
      .single();

    let title = "Música Personalizada";
    if (orderData?.song_title) {
      title = orderData.song_title;
    } else if (orderData?.approved_lyric_id) {
      const { data: lyricData } = await supabase
        .from("lyrics")
        .select("title")
        .eq("id", orderData.approved_lyric_id)
        .maybeSingle();
      if (lyricData?.title) {
        title = lyricData.title;
      }
    } else if (orderData?.is_instrumental) {
      title = `Instrumental ${orderData.music_type || "Personalizado"}`;
    }

    // Track view event asynchronously
    const referrer = req.headers.get("referer") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ipHash = await hashIP(forwardedFor.split(",")[0]?.trim() || "");

    supabase.from("share_analytics").insert({
      order_id: orderId,
      event_type: "view",
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
      platform: "direct",
      metadata: { version }
    }).then(() => {
      console.log("View event tracked for order:", orderId, "version:", version);
    }).catch((err: unknown) => {
      console.error("Failed to track view:", err);
    });

    const isPreview = orderData?.is_preview === true || orderData?.plan_id === 'preview_test';

    return new Response(
      JSON.stringify({
        audio_url: trackData.audio_url,
        title,
        music_style: orderData?.music_style || "",
        cover_url: orderData?.cover_url || null,
        is_preview: isPreview,
        version: trackData.version || version
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-public-track:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

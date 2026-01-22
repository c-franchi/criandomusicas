import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch track with READY status for this order
    const { data: trackData, error: trackError } = await supabase
      .from("tracks")
      .select("audio_url")
      .eq("order_id", orderId)
      .eq("status", "READY")
      .maybeSingle();

    if (trackError) {
      console.error("Track fetch error:", trackError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch track" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!trackData?.audio_url) {
      return new Response(
        JSON.stringify({ error: "Track not found or not ready" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order info for title/style
    const { data: orderData } = await supabase
      .from("orders")
      .select("music_style, music_type, is_instrumental, approved_lyric_id")
      .eq("id", orderId)
      .single();

    let title = "Música Personalizada";
    
    if (orderData?.approved_lyric_id) {
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

    return new Response(
      JSON.stringify({
        audio_url: trackData.audio_url,
        title,
        music_style: orderData?.music_style || ""
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

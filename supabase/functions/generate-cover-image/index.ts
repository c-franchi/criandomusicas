import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customPrompt } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, style_prompt, music_style, music_type, emotion, tone, purpose, song_title, is_instrumental')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', order.id);

    // Build visual prompt from style_prompt or order details
    let basePrompt = customPrompt;
    
    if (!basePrompt) {
      if (order.style_prompt) {
        basePrompt = order.style_prompt;
      } else {
        // Build from order details
        const parts = [];
        if (order.music_style) parts.push(order.music_style);
        if (order.emotion) parts.push(`mood: ${order.emotion}`);
        if (order.purpose) parts.push(`occasion: ${order.purpose}`);
        if (order.tone) parts.push(`tone: ${order.tone}`);
        basePrompt = parts.join(', ') || 'beautiful music album cover';
      }
    }

    // Convert musical prompt to visual art prompt
    const visualPrompt = `Create a stunning, professional album cover art. Style: ${basePrompt}. 
    Requirements: 
    - High quality digital art or photography style
    - Vibrant, emotionally resonant colors
    - NO text, NO letters, NO words, NO typography
    - Suitable as a music streaming cover image
    - ${order.is_instrumental ? 'Abstract, instrumental music vibe' : 'Soulful, emotional vocal music atmosphere'}
    - Professional, polished, ready for commercial use`;

    console.log('Generating image with prompt:', visualPrompt.substring(0, 200) + '...');

    // Call OpenAI DALL-E 3 API
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: visualPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.json();
      console.error('DALL-E API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate image', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dalleResult = await dalleResponse.json();
    const generatedImageUrl = dalleResult.data?.[0]?.url;

    if (!generatedImageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image URL returned from DALL-E' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully, downloading...');

    // Download the image
    const imageResponse = await fetch(generatedImageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download generated image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Generate filename
    const filename = `${orderId}/${Date.now()}.png`;

    console.log('Uploading to storage:', filename);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image to storage', details: uploadError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('covers')
      .getPublicUrl(filename);

    const coverUrl = publicUrlData.publicUrl;

    console.log('Image uploaded, URL:', coverUrl);

    // Update order with cover_url
    const { error: updateError } = await supabase
      .from('orders')
      .update({ cover_url: coverUrl })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
      // Don't fail - image was still generated and uploaded
    }

    console.log('Order updated with cover_url');

    return new Response(
      JSON.stringify({ 
        success: true, 
        cover_url: coverUrl,
        message: 'Cover image generated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

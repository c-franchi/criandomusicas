import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate contextual visual prompt using Lovable AI
async function generateContextualPrompt(
  lovableApiKey: string,
  story: string | null,
  lyricsBody: string | null,
  musicType: string | null,
  emotion: string | null,
  purpose: string | null,
  isInstrumental: boolean
): Promise<string | null> {
  try {
    const systemPrompt = `Você é um diretor de arte especializado em capas de álbuns musicais de alta qualidade.

TAREFA:
Crie uma descrição visual EXTREMAMENTE detalhada (máximo 200 palavras) para uma capa de álbum que represente fielmente o contexto e a letra fornecidos.

DIRETRIZES PARA PESSOAS (quando apropriado ao contexto):
- Descreva pessoas de forma MUITO detalhada: idade aproximada, expressão facial, postura, vestimenta, iluminação no rosto
- Especifique ângulo de câmera (close-up, plano médio, corpo inteiro, de costas, perfil)
- Para evitar distorções, seja PRECISO: "mulher de 30 anos, cabelos castanhos ondulados até os ombros, pele clara, vestido azul marinho"

ELEMENTOS VISUAIS ESSENCIAIS:
- NUNCA inclua texto, letras, palavras ou tipografia
- Use linguagem cinematográfica: "iluminação Rembrandt", "golden hour", "bokeh suave ao fundo"
- Especifique composição: regra dos terços, ponto focal, profundidade de campo
- Descreva atmosfera: cores dominantes, temperatura da luz, mood geral
- Conecte elementos visuais simbolicamente à ocasião e emoção da música`;

    const lyricsSection = isInstrumental 
      ? "Música instrumental - sem letra. Foque na atmosfera e ocasião descritas."
      : (lyricsBody || "Letra não disponível - use apenas o contexto.");

    const userPrompt = `CONTEXTO DA SOLICITAÇÃO:
${story || "Contexto não especificado"}

TIPO DE MÚSICA: ${musicType || "Não especificado"}
EMOÇÃO: ${emotion || "Não especificada"}
OCASIÃO/PROPÓSITO: ${purpose || "Não especificado"}

LETRA DA MÚSICA:
${lyricsSection}

Crie a descrição visual para a capa:`;

    console.log('Calling Lovable AI for contextual prompt generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Lovable AI API error:', errorData);
      return null;
    }

    const data = await response.json();
    const contextualPrompt = data.choices?.[0]?.message?.content?.trim();

    if (contextualPrompt) {
      console.log('Contextual prompt generated successfully:', contextualPrompt.substring(0, 100) + '...');
      return contextualPrompt;
    }

    return null;
  } catch (error) {
    console.error('Error generating contextual prompt:', error);
    return null;
  }
}

// Enhance an existing image using AI image editing
async function enhanceImage(
  lovableApiKey: string,
  imageUrl: string,
  musicType: string | null,
  emotion: string | null,
  purpose: string | null
): Promise<string | null> {
  try {
    const editPrompt = `Transform this photo into a stunning, professional album cover art. 
NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY.
Apply cinematic color grading, dramatic lighting, and artistic composition.
Music genre context: ${musicType || 'pop'}, emotion: ${emotion || 'joy'}, occasion: ${purpose || 'celebration'}.
Make it look like a premium Spotify/Apple Music album cover. Square format (1:1).
Enhance colors, add depth, and create an atmospheric, polished look while keeping the main subject recognizable.`;

    console.log('Enhancing image with Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: editPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Image enhancement API error:', errorData);
      return null;
    }

    const data = await response.json();
    const enhancedImageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (enhancedImageData) {
      console.log('Image enhanced successfully');
      return enhancedImageData;
    }

    return null;
  } catch (error) {
    console.error('Error enhancing image:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, customPrompt, enhanceMode } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, style_prompt, music_style, music_type, emotion, tone, purpose, song_title, is_instrumental, story, approved_lyric_id, atmosphere, cover_url')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle enhance mode - enhance an existing custom cover
    if (enhanceMode && order.cover_url) {
      console.log('Enhance mode: enhancing custom cover image:', order.cover_url);
      
      const enhancedImageData = await enhanceImage(
        lovableApiKey,
        order.cover_url,
        order.music_type,
        order.emotion,
        order.purpose
      );

      if (!enhancedImageData) {
        console.log('Enhancement failed, keeping original cover');
        return new Response(
          JSON.stringify({ ok: true, cover_url: order.cover_url, enhanced: false, message: 'Enhancement failed, keeping original' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert base64 to binary and upload
      const base64Data = enhancedImageData.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const filename = `${orderId}/cover-enhanced.png`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filename, binaryData, { contentType: 'image/png', upsert: true });

      if (uploadError) {
        console.error('Enhanced cover upload error:', uploadError);
        return new Response(
          JSON.stringify({ ok: true, cover_url: order.cover_url, enhanced: false, message: 'Upload failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: publicUrlData } = supabase.storage.from('covers').getPublicUrl(filename);
      const enhancedUrl = publicUrlData.publicUrl;

      // Update order with enhanced cover
      await supabase.from('orders').update({ cover_url: enhancedUrl }).eq('id', orderId);

      return new Response(
        JSON.stringify({ success: true, cover_url: enhancedUrl, enhanced: true, message: 'Cover enhanced successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip AI generation if user already uploaded a custom cover
    if (order.cover_url && order.cover_url.includes('custom-cover')) {
      console.log('Order already has custom cover, skipping AI generation:', order.cover_url);
      return new Response(
        JSON.stringify({ ok: true, cover_url: order.cover_url, skipped: true, message: 'Custom cover already set' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order found:', order.id, '| Has story:', !!order.story, '| Has approved_lyric_id:', !!order.approved_lyric_id);

    // Fetch approved lyrics if available
    let lyricsBody: string | null = null;
    if (order.approved_lyric_id) {
      const { data: lyric, error: lyricError } = await supabase
        .from('lyrics')
        .select('body')
        .eq('id', order.approved_lyric_id)
        .maybeSingle();

      if (lyricError) {
        console.error('Lyrics fetch error:', lyricError);
      } else if (lyric) {
        lyricsBody = lyric.body;
        console.log('Lyrics fetched successfully, length:', lyricsBody?.length);
      }
    }

    // Generate contextual prompt using Lovable AI
    let basePrompt = customPrompt;
    
    if (!basePrompt) {
      const hasContextualData = order.story || lyricsBody;
      
      if (hasContextualData) {
        const contextualPrompt = await generateContextualPrompt(
          lovableApiKey,
          order.story,
          lyricsBody,
          order.music_type,
          order.emotion,
          order.purpose,
          order.is_instrumental || false
        );

        if (contextualPrompt) {
          basePrompt = contextualPrompt;
          console.log('Using AI-generated contextual prompt');
        }
      }
      
      // Fallback to original logic
      if (!basePrompt) {
        console.log('Falling back to original prompt logic');
        if (order.style_prompt) {
          basePrompt = order.style_prompt;
        } else {
          const parts = [];
          if (order.music_style) parts.push(order.music_style);
          if (order.emotion) parts.push(`mood: ${order.emotion}`);
          if (order.purpose) parts.push(`occasion: ${order.purpose}`);
          if (order.tone) parts.push(`tone: ${order.tone}`);
          if (order.atmosphere) parts.push(`atmosphere: ${order.atmosphere}`);
          basePrompt = parts.join(', ') || 'beautiful music album cover';
        }
      }
    }

    // Generate image using Lovable AI image model
    const imagePrompt = `Generate a stunning album cover art. NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY.
Theme: ${basePrompt}.
Style: Professional DSLR photography, cinematic color grading, 8K quality.
${order.is_instrumental ? 'Focus on atmospheric landscapes or symbolic objects with dramatic lighting.' : 'Capture the emotional essence of the music.'}
Square format (1:1 aspect ratio), suitable for Spotify/Apple Music covers.`;

    console.log('Generating cover image with Lovable AI...');

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          { role: 'user', content: imagePrompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.text();
      console.error('Image generation API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate image', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageResult = await imageResponse.json();
    const generatedImageData = imageResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageData) {
      console.error('No image data returned from AI');
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully, uploading to storage...');

    // Convert base64 to binary
    const base64Data = generatedImageData.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate filename - only 1 cover per order
    const filename = `${orderId}/cover.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filename, binaryData, {
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

    // Update order with cover_url (single cover for both Suno versions)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ cover_url: coverUrl })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cover_url: coverUrl,
        message: 'Cover image generated successfully',
        used_contextual_ai: !!order.story || !!lyricsBody
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

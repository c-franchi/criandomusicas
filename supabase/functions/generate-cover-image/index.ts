import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate contextual visual prompt using GPT-4o-mini
async function generateContextualPrompt(
  openaiApiKey: string,
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
- Descreva interações entre pessoas se houver mais de uma
- Inclua detalhes como: "mãos entrelaçadas com detalhes das veias", "olhos brilhantes refletindo luz", "sorriso suave com covinhas"
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

    console.log('Calling GPT-4o-mini for contextual prompt generation...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GPT-4o-mini API error:', errorData);
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

    // Fetch order data including story and approved_lyric_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, style_prompt, music_style, music_type, emotion, tone, purpose, song_title, is_instrumental, story, approved_lyric_id, atmosphere')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Generate contextual prompt using GPT-4o-mini
    let basePrompt = customPrompt;
    
    if (!basePrompt) {
      // Try to generate contextual prompt with story and lyrics
      const hasContextualData = order.story || lyricsBody;
      
      if (hasContextualData) {
        const contextualPrompt = await generateContextualPrompt(
          openaiApiKey,
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
      
      // Fallback to original logic if contextual generation failed
      if (!basePrompt) {
        console.log('Falling back to original prompt logic');
        if (order.style_prompt) {
          basePrompt = order.style_prompt;
        } else {
          // Build from order details
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

    // Convert to visual art prompt - RICH DETAILED FOCUS
    const visualPrompt = `Create a stunning PHOTOREALISTIC album cover art. Theme: ${basePrompt}. 
    
    VISUAL EXCELLENCE REQUIREMENTS:
    - Professional DSLR photography style, 85mm lens, f/1.8 aperture for beautiful bokeh
    - Cinematic color grading: rich shadows, vibrant highlights, film-like tones
    - If people are described: render them with EXTREME detail - skin texture, hair strands, fabric folds, natural expressions
    - Lighting: use Rembrandt lighting, golden hour, or dramatic rim lighting as appropriate
    - Composition: rule of thirds, clear focal point, intentional negative space
    - NO text, NO letters, NO words, NO typography whatsoever
    - ${order.is_instrumental ? 'Focus on atmospheric landscapes, nature, or symbolic objects with dramatic lighting' : 'Capture the emotional essence - can include people if contextually appropriate'}
    - 8K resolution quality, sharp focus on subject, cinematic depth of field
    - Commercial quality suitable for Spotify/Apple Music covers
    - Style: high-end music industry photography, editorial quality`;

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

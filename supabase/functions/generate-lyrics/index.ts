import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { orderId, order_id } = await req.json();
    const finalOrderId = orderId || order_id;

    if (!finalOrderId) {
      throw new Error('Order ID é obrigatório');
    }

    // Create service client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get order details
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .eq('id', finalOrderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Generate 3 lyric variations
    const lyrics = [];
    const versions = ['A', 'B', 'C'];
    
    for (const version of versions) {
      const prompt = createLyricPrompt(order, version);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Você é um compositor profissional especializado em criar letras originais e emocionantes. Sempre siga exatamente o formato solicitado.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: version === 'A' ? 0.7 : version === 'B' ? 0.8 : 0.9,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const lyricText = data.choices[0].message.content;
      
      // Extract title from the generated text
      const titleMatch = lyricText.match(/TÍTULO:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `${order.occasion} - Versão ${version}`;
      
      lyrics.push({
        version,
        title,
        text: lyricText,
        prompt_json: { prompt, temperature: version === 'A' ? 0.7 : version === 'B' ? 0.8 : 0.9 }
      });
    }

    // Save lyrics to database
    const { data: savedLyrics, error: lyricsError } = await supabaseService
      .from('lyrics')
      .insert(
        lyrics.map(lyric => ({
          order_id: finalOrderId,
          version: lyric.version,
          title: lyric.title,
          text: lyric.text,
          prompt_json: lyric.prompt_json
        }))
      )
      .select();

    if (lyricsError) {
      throw new Error(`Error saving lyrics: ${lyricsError.message}`);
    }

    // Update order status
    await supabaseService
      .from('orders')
      .update({ 
        status: 'LYRICS_DELIVERED',
        story_summary: summarizeStory(order.story_raw)
      })
      .eq('id', finalOrderId);

    // Log event
    await supabaseService
      .from('event_logs')
      .insert({
        order_id: finalOrderId,
        type: 'LYRICS_GENERATED',
        payload: { lyrics_count: 3, versions: ['A', 'B', 'C'] }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      lyrics: savedLyrics,
      message: '3 letras geradas com sucesso!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lyrics function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createLyricPrompt(order: any, version: string): string {
  const durationMinutes = Math.ceil(order.duration_target_sec / 60);
  
  return `[Objetivo]
Escreva uma letra ORIGINAL, cantável, com duração-alvo de ${durationMinutes} minutos, para ${order.occasion}, em estilo ${order.style}, tom ${order.tone}.

[História do cliente]
${order.story_raw}

[Regras específicas para versão ${version}]
${version === 'A' ? '- Foco na melodia e refrão cativante' : 
  version === 'B' ? '- Mais detalhes da história, versão narrativa' : 
  '- Versão mais emotional e intimista'}
- Versos curtos e cantáveis
- Refrão forte e repetível (hook marcante)
- NUNCA cite artistas, marcas ou obras protegidas
- Linguagem apropriada para todas as idades
- Inclua elementos específicos da história fornecida

[Formato de saída OBRIGATÓRIO]
TÍTULO: [título criativo e marcante]

V1:
[primeiro verso - 4 linhas]

PRÉ-REFRÃO:
[transição - 2 linhas]

REFRÃO:
[refrão principal - 4 linhas]

V2:
[segundo verso - 4 linhas]

PONTE:
[ponte/middle 8 - 2-4 linhas]

REFRÃO:
[refrão final com variação - 4 linhas]

OUTRO:
[finalização - 2 linhas]

Crie uma letra ${version === 'A' ? 'cativante e comercial' : 
                version === 'B' ? 'narrativa e detalhada' : 
                'emocional e tocante'}.`;
}

function summarizeStory(storyRaw: string): string {
  // Simple summarization - could be enhanced with AI
  const words = storyRaw.split(' ');
  if (words.length <= 50) return storyRaw;
  
  return words.slice(0, 50).join(' ') + '...';
}
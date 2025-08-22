import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { callOpenAI } from '../_shared/openai-helper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check required environment variables
const requiredEnvs = {
  'OPENAI_API_KEY': Deno.env.get('OPENAI_API_KEY'),
  'SUPABASE_URL': Deno.env.get('SUPABASE_URL'),
  'SUPABASE_SERVICE_ROLE_KEY': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
};

console.log('Environment check:', Object.keys(requiredEnvs).map(key => 
  `${key}: ${requiredEnvs[key] ? 'FOUND' : 'MISSING'}`
).join(', '));

const missingEnvs = Object.entries(requiredEnvs)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key);

if (missingEnvs.length > 0) {
  console.error('Missing required environment variables:', missingEnvs.join(', '));
}

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
      return new Response(JSON.stringify({ 
        error: 'Order ID é obrigatório' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check environment variables again for this request
    if (missingEnvs.length > 0) {
      console.error('Missing environment variables for order:', finalOrderId, missingEnvs);
      return new Response(JSON.stringify({ 
        ok: false,
        error: `Missing configuration: ${missingEnvs.join(', ')}. Configure secrets with: supabase secrets set OPENAI_API_KEY="..." SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..."` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    const versions = [
      { name: 'A', description: 'Foco na melodia e refrão cativante', temperature: 0.7 },
      { name: 'B', description: 'Mais detalhes da história, versão narrativa', temperature: 0.8 },
      { name: 'C', description: 'Versão mais emotional e intimista', temperature: 0.9 }
    ];
    
    console.log(`Generating ${versions.length} lyric versions for order:`, finalOrderId);
    
    for (const version of versions) {
      console.log(`Generating version ${version.name}...`);
      
      const systemPrompt = 'Você é um compositor profissional especializado em criar letras originais e emocionantes em português do Brasil. Crie letras com rimas e métrica simples, tom emotivo, duração 2:30-3:00 min. Sempre siga exatamente o formato solicitado.';
      const userPrompt = createLyricPrompt(order, version.name);
      
      const openAIResult = await callOpenAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: version.temperature,
        maxTokens: 1200,
        timeoutMs: 60000 // Timeout aumentado para 60s
      });
      
      if (!openAIResult.ok) {
        console.error(`Failed to generate version ${version.name}:`, openAIResult.error);
        throw new Error(`Erro ao gerar versão ${version.name}: ${openAIResult.error}`);
      }
      
      const lyricText = openAIResult.content!;
      
      // Extract title from the generated text
      const titleMatch = lyricText.match(/TÍTULO:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `${order.occasion} - Versão ${version.name}`;
      
      lyrics.push({
        version: version.name,
        title,
        text: lyricText,
        prompt_json: { 
          prompt: userPrompt, 
          temperature: version.temperature,
          model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
          usage: openAIResult.usage
        }
      });
      
      console.log(`Version ${version.name} generated successfully: "${title}"`);
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

    console.log(`Successfully generated and saved ${savedLyrics.length} lyrics for order:`, finalOrderId);
    
    return new Response(JSON.stringify({ 
      ok: true,
      success: true, 
      lyrics: savedLyrics,
      message: `${savedLyrics.length} letras geradas com sucesso!`,
      orderId: finalOrderId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-lyrics function:', error);
    
    // Detailed error logging for debugging
    if (error.message?.includes('OpenAI')) {
      console.error('OpenAI-related error details:', {
        orderId: orderId || order_id,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return new Response(JSON.stringify({ 
      ok: false,
      error: error.message || 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createLyricPrompt(order: any, version: string): string {
  const durationMinutes = Math.ceil(order.duration_target_sec / 60);
  
  const versionSpecs = {
    'A': { focus: 'Foco na melodia e refrão cativante', style: 'cativante e comercial' },
    'B': { focus: 'Mais detalhes da história, versão narrativa', style: 'narrativa e detalhada' },
    'C': { focus: 'Versão mais emocional e intimista', style: 'emocional e tocante' }
  };
  
  const spec = versionSpecs[version] || versionSpecs['A'];
  
  return `[OBJETIVO]
Escreva uma letra ORIGINAL e cantável em português do Brasil, com duração-alvo de ${durationMinutes} minutos, para ${order.occasion}, em estilo ${order.style}, tom ${order.tone}.

[HISTÓRIA DO CLIENTE]
${order.story_raw}

[REGRAS ESPECÍFICAS PARA VERSÃO ${version}]
- ${spec.focus}
- Versos curtos e cantáveis (máximo 4 linhas cada)
- Refrão forte e repetível (hook marcante)
- Rimas naturais e fluidas
- NUNCA cite artistas, marcas ou obras protegidas por direitos autorais
- Linguagem apropriada para todas as idades
- Inclua elementos específicos da história fornecida
- Use métrica consistente para facilitar a composição musical

[FORMATO DE SAÍDA OBRIGATÓRIO]
TÍTULO: [título criativo e marcante]

VERSO 1:
[4 linhas rimadas]

PRÉ-REFRÃO:
[2 linhas de transição]

REFRÃO:
[4 linhas principais - o gancho da música]

VERSO 2:
[4 linhas rimadas, continuando a história]

PRÉ-REFRÃO:
[2 linhas de transição - pode ser igual ou variação]

REFRÃO:
[4 linhas principais - repetir ou pequena variação]

PONTE:
[2-4 linhas diferentes, clímax emocional]

REFRÃO FINAL:
[4 linhas - pode ter pequenas variações para finalizar]

OUTRO:
[2 linhas de finalização]

Crie uma letra ${spec.style}, com elementos da história pessoal fornecida.`;
}

function summarizeStory(storyRaw: string): string {
  // Simple summarization - could be enhanced with AI
  const words = storyRaw.split(' ');
  if (words.length <= 50) return storyRaw;
  
  return words.slice(0, 50).join(' ') + '...';
}
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, style, purpose, story, lyricBody, userName, musicType } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    // Build context for AI
    const contextParts = [];
    if (title) contextParts.push(`Título: "${title}"`);
    if (style) contextParts.push(`Estilo musical: ${style}`);
    if (purpose) contextParts.push(`Propósito: ${purpose}`);
    if (musicType) contextParts.push(`Tipo: ${musicType === 'instrumental' ? 'Música instrumental' : 'Música com vocal'}`);
    if (userName) contextParts.push(`Criada para: ${userName}`);
    if (story) contextParts.push(`História: ${story.substring(0, 200)}`);
    if (lyricBody) {
      const cleanLines = lyricBody.split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('[') && line.length > 5)
        .slice(0, 3)
        .join(' / ');
      if (cleanLines) contextParts.push(`Trecho da letra: "${cleanLines}"`);
    }

    const prompt = `Você é um copywriter especializado em músicas personalizadas. Crie uma descrição CURTA e ENVOLVENTE (máximo 2 frases, 100 caracteres) para uma música que será exibida como exemplo no site.

A descrição deve:
- Transmitir emoção e humanidade
- Ser direta e impactante
- Usar linguagem acessível e acolhedora
- Destacar o que torna essa música especial
- NÃO usar aspas
- NÃO mencionar "personalizada" ou termos técnicos

Contexto da música:
${contextParts.join('\n')}

Responda APENAS com a descrição, sem explicações ou formatação adicional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um copywriter brasileiro especializado em conteúdo emocional e humano para músicas.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating description:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

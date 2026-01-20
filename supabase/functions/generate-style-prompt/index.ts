import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BriefingData {
  musicType?: string;
  emotion?: string;
  emotionIntensity?: number;
  style?: string;
  rhythm?: string;
  atmosphere?: string;
  hasMonologue?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, lyricId, approvedLyrics, songTitle, briefing } = await req.json() as {
      orderId: string;
      lyricId: string;
      approvedLyrics: string;
      songTitle?: string;
      briefing: BriefingData;
    };

    console.log("generate-style-prompt called with orderId:", orderId);

    if (!orderId || !approvedLyrics) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios: orderId e approvedLyrics" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      musicType = 'homenagem',
      emotion = 'alegria',
      emotionIntensity = 3,
      style = 'pop',
      rhythm = 'moderado',
      atmosphere = 'festivo',
      hasMonologue = false
    } = briefing || {};

    // Map rhythm to BPM range
    const bpmMap: Record<string, string> = {
      'lento': '60-80 BPM (Ballad)',
      'moderado': '90-110 BPM (Mid-tempo)',
      'animado': '120-140 BPM (Upbeat)'
    };

    // Map atmosphere to production notes
    const atmosphereMap: Record<string, string> = {
      'intimo': 'Intimate, acoustic, minimal reverb, close-mic vocals',
      'festivo': 'Celebratory, bright mix, energetic dynamics, choir-like backing vocals',
      'melancolico': 'Melancholic, subtle pads, tasteful string arrangements, emotional dynamics',
      'epico': 'Epic, orchestral elements, big drums, cinematic build-ups',
      'leve': 'Light, airy production, soft dynamics, gentle instrumentation'
    };

    const systemPrompt = `Você é um produtor musical profissional especializado em criar prompts técnicos para IAs de geração musical (Suno, Udio, etc).

Sua tarefa é criar um prompt de estilo musical detalhado e técnico que será usado para gerar a música.

REGRAS CRÍTICAS:
1. O prompt deve ser em INGLÊS (padrão da indústria musical)
2. Seja específico com gêneros, subgêneros e características sonoras
3. Inclua detalhes técnicos de produção
4. ${hasMonologue ? 'IMPORTANTE: A música contém trechos falados/declamados. Inclua instruções para spoken word sections.' : 'Não há trechos falados'}
5. ⚠️ NÃO MENCIONE NOMES DE ARTISTAS FAMOSOS OU BANDAS como referência (isso pode bloquear a geração no Suno/Udio)
6. Em vez de artistas, descreva características sonoras específicas (tipo de voz, instrumentação, produção)

FORMATO DE SAÍDA OBRIGATÓRIO (siga exatamente, em inglês):

[Style]
Genre: (gênero musical principal e subgênero, SEM nomes de artistas)
Mood/Atmosphere: (clima emocional detalhado)
Instrumentation: (instrumentos principais, separados por vírgula)
Vocal Style: (tipo de voz e estilo vocal - descreva características, NÃO compare com artistas)
Tempo: (BPM e feel)
Key: (tonalidade sugerida)
Production Notes: (notas técnicas de produção, mix, efeitos)
${hasMonologue ? 'Spoken Word: (instruções específicas para partes faladas - deve ser claramente diferenciado do canto)' : ''}

Não inclua explicações, apenas o prompt técnico estruturado.
NUNCA mencione nomes de artistas, bandas ou músicas específicas.`;

    const userPrompt = `Crie o prompt de estilo musical para esta música:

CONTEXTO DA MÚSICA:
- Tipo: ${musicType}
- Emoção desejada: ${emotion} (intensidade ${emotionIntensity}/5)
- Estilo musical: ${style}
- Ritmo: ${rhythm} (${bpmMap[rhythm] || '90-110 BPM'})
- Atmosfera: ${atmosphere} (${atmosphereMap[atmosphere] || 'balanced production'})
- Contém monólogo/spoken word: ${hasMonologue ? 'SIM - deve ter seções claramente faladas, não cantadas' : 'NÃO'}

LETRA APROVADA (para contexto do mood e narrativa):
${approvedLyrics.substring(0, 1500)}

LEMBRE-SE: 
- NÃO mencione nomes de artistas, bandas ou músicas como referência
- Descreva características sonoras específicas em vez de comparar com artistas`;

    console.log("Calling Lovable AI Gateway for style prompt generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ ok: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ ok: false, error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ ok: false, error: "Erro ao gerar prompt de estilo. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const stylePrompt = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!stylePrompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Style prompt generated successfully");

    // Create final prompt combining style and approved lyrics
    const finalPrompt = `${stylePrompt}

[Lyrics]
${approvedLyrics}`;

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update order with style prompt and final prompt
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        style_prompt: stylePrompt,
        final_prompt: finalPrompt,
        approved_lyric_id: lyricId,
        status: 'LYRICS_APPROVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Mark lyric as approved and update title if provided
    if (lyricId) {
      const updateData: Record<string, any> = { 
        is_approved: true, 
        approved_at: new Date().toISOString() 
      };
      
      if (songTitle) {
        updateData.title = songTitle;
      }
      
      const { error: lyricError } = await supabase
        .from('lyrics')
        .update(updateData)
        .eq('id', lyricId);

      if (lyricError) {
        console.error("Error marking lyric as approved:", lyricError);
      }
    }

    console.log("Order updated with approved lyrics and style prompt");

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Prompt de estilo gerado com sucesso"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("generate-style-prompt error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

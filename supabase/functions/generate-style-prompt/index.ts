import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, lyricId, approvedLyrics, briefing } = await req.json();

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

    const systemPrompt = `Você é um produtor musical profissional especializado em criar prompts técnicos para IAs de geração musical.

Sua tarefa é criar um prompt de estilo musical detalhado e técnico que será usado para gerar a música.

FORMATO DE SAÍDA OBRIGATÓRIO (siga exatamente):

[Style]
Genre: (gênero musical principal e subgênero se aplicável)
Mood/Atmosphere: (clima emocional detalhado)
Instrumentation: (instrumentos principais separados por vírgula)
Vocal Style: (tipo de voz e estilo vocal)
Tempo: (BPM aproximado, ex: 90-100 BPM)
Key: (tonalidade sugerida, ex: C Major, A minor)
Production Notes: (notas técnicas de produção)
${hasMonologue ? 'Spoken Word: (instruções para parte falada)' : ''}

Não inclua explicações, apenas o prompt técnico.`;

    const userPrompt = `Crie o prompt de estilo musical para esta música:

CONTEXTO:
- Tipo de música: ${musicType}
- Emoção desejada: ${emotion} (intensidade ${emotionIntensity}/5)
- Estilo musical: ${style}
- Ritmo: ${rhythm}
- Atmosfera: ${atmosphere}
- Contém monólogo falado: ${hasMonologue ? 'SIM' : 'NÃO'}

LETRA APROVADA (para contexto):
${approvedLyrics.substring(0, 800)}...

Crie um prompt técnico detalhado que capture perfeitamente a essência desta música.`;

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
        max_tokens: 800,
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

    // Create final prompt combining style and lyrics
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
        status: 'lyrics_approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Mark lyric as approved
    if (lyricId) {
      await supabase
        .from('lyrics')
        .update({ approved: true, approved_at: new Date().toISOString() })
        .eq('id', lyricId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Prompt de estilo gerado com sucesso",
        stylePrompt,
        finalPrompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("generate-style-prompt error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

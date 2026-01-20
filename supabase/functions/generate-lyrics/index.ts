import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BriefingData {
  musicType: string;
  emotion: string;
  emotionIntensity: number;
  style: string;
  rhythm: string;
  atmosphere: string;
  structure: string[];
  hasMonologue: boolean;
  monologuePosition: string;
  occasion: string;
  mandatoryWords: string;
  restrictedWords: string;
}

function splitTwoLyrics(text: string): { v1: string; v2: string } {
  const byDelimiter = text.split(/\n\s*---+\s*\n/);
  if (byDelimiter.length >= 2) {
    return { v1: byDelimiter[0].trim(), v2: byDelimiter[1].trim() };
  }
  const paras = text.split(/\n{2,}/);
  const mid = Math.max(1, Math.floor(paras.length / 2));
  return { v1: paras.slice(0, mid).join("\n\n").trim(), v2: paras.slice(mid).join("\n\n").trim() };
}

function extractTitleAndBody(raw: string) {
  const lines = raw.split(/\r?\n/).map(l => l.trim());
  const titleIdx = lines.findIndex(l => l && !/^#|^\[|^\d+\./.test(l));
  const title = titleIdx >= 0 ? lines[titleIdx] : "Letra";
  const body = lines.filter((_, i) => i !== titleIdx).join("\n").trim();
  return { title: title.slice(0, 120), text: body };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, story, briefing } = await req.json() as {
      orderId: string;
      story: string;
      briefing: BriefingData;
    };

    if (!orderId || !story) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios: orderId e story" }),
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
      structure = ['verse', 'chorus'],
      hasMonologue = false,
      monologuePosition = '',
      mandatoryWords = '',
      restrictedWords = ''
    } = briefing || {};

    const systemPrompt = `Você é um letrista profissional brasileiro especializado em músicas personalizadas.

REGRAS OBRIGATÓRIAS:
1. Gere APENAS a letra final, sem comentários ou explicações
2. Use tags estruturadas obrigatórias: [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]
3. ${hasMonologue ? `INCLUA OBRIGATORIAMENTE a tag [monologue] na ${monologuePosition || 'bridge'} com texto FALADO, NÃO cantado` : 'Não inclua monólogo'}
4. Palavras obrigatórias DEVEM aparecer naturalmente na letra
5. Palavras restritas NÃO PODEM aparecer em hipótese alguma
6. Mantenha métrica e rima coerentes para canto
7. A letra deve ter entre 150-250 palavras para ~2-3 minutos de música
8. Capture a essência emocional da história fornecida

FORMATO DE SAÍDA OBRIGATÓRIO:

[Intro]
(2-4 versos de abertura)

[Verse 1]
(4-6 versos narrativos)

[Chorus]
(4-6 versos - refrão principal, memorável)

${hasMonologue ? `[monologue]
(texto declamado/falado, NÃO cantado - 2-4 frases emocionais)

` : ''}[Verse 2]
(4-6 versos desenvolvendo a história)

[Bridge]
(2-4 versos de transição emocional)

[Chorus]
(repetição do refrão)

[Outro]
(2-4 versos de encerramento)`;

    const userPrompt = `Crie DUAS versões de letra completas para uma música personalizada.

DADOS DA MÚSICA:
- Tipo: ${musicType}
- Emoção principal: ${emotion} (intensidade ${emotionIntensity}/5)
- Estilo musical: ${style}
- Ritmo: ${rhythm}
- Atmosfera: ${atmosphere}
- Estrutura desejada: ${structure.join(', ')}
- Incluir monólogo: ${hasMonologue ? `SIM, na seção ${monologuePosition}` : 'NÃO'}
- Palavras obrigatórias: ${mandatoryWords || 'nenhuma específica'}
- Palavras proibidas: ${restrictedWords || 'nenhuma específica'}

HISTÓRIA/CONTEXTO BASE (use fielmente):
${story}

IMPORTANTE:
- Crie duas versões DIFERENTES mas baseadas na mesma história
- Separe as duas versões com uma linha contendo apenas: ---
- Cada versão deve ser completa e independente
- Não inclua comentários, apenas as letras`;

    console.log("Calling Lovable AI Gateway for lyrics generation...");

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
        max_tokens: 2500,
        temperature: 0.9,
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
        JSON.stringify({ ok: false, error: "Erro ao gerar letras. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return new Response(
        JSON.stringify({ ok: false, error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("AI Response received, processing lyrics...");

    const { v1, v2 } = splitTwoLyrics(content);
    const l1 = extractTitleAndBody(v1);
    const l2 = extractTitleAndBody(v2);

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert lyrics
    const { data: insertedLyrics, error: insertError } = await supabase
      .from('lyrics')
      .insert([
        { order_id: orderId, version: 1, title: l1.title, text: l1.text, approved: false },
        { order_id: orderId, version: 2, title: l2.title, text: l2.text, approved: false }
      ])
      .select();

    if (insertError) {
      console.error("Error inserting lyrics:", insertError);
      // Still return the lyrics even if DB insert fails
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'lyrics_generated', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Letras geradas com sucesso",
        lyrics: [
          { id: insertedLyrics?.[0]?.id || '1', version: 1, title: l1.title, text: l1.text },
          { id: insertedLyrics?.[1]?.id || '2', version: 2, title: l2.title, text: l2.text }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("generate-lyrics error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

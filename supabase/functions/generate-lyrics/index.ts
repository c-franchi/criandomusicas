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
  mandatoryWords: string;
  restrictedWords: string;
  songName?: string;
  autoGenerateName?: boolean;
  voiceType?: string;
}

interface Pronunciation {
  term: string;
  phonetic: string;
}

// Detectar termos que precisam de pronúncia fonética
function detectCriticalTerms(text: string): string[] {
  const patterns = [
    /\b[A-Z]{2,}[0-9]*\b/g,                    // Siglas: NYV8, WEB3, ABC
    /\b[A-Z]+[0-9]+[A-Z0-9]*\b/g,              // Letras+números: NYV8, W3C
    /\b[A-Z][a-z]*[A-Z][a-zA-Z]*\b/g,          // CamelCase: iPhone, PowerBI
    /\b[A-Z]{2,}[a-z]+\b/g,                    // Siglas com sufixo: POKERfi
  ];
  
  const terms = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        // Filtrar termos comuns que não precisam de pronúncia
        if (!['EU', 'EUA', 'OK', 'TV', 'DVD', 'CD'].includes(m) && m.length >= 2) {
          terms.add(m);
        }
      });
    }
  });
  
  return Array.from(terms);
}

// Aplicar pronúncias ao texto
function applyPronunciations(text: string, pronunciations: Pronunciation[]): string {
  let result = text;
  pronunciations.forEach(({ term, phonetic }) => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, phonetic);
  });
  return result;
}

function splitTwoLyrics(text: string): { v1: string; v2: string } {
  // Try splitting by delimiter
  const byDelimiter = text.split(/\n\s*---+\s*\n/);
  if (byDelimiter.length >= 2) {
    return { v1: byDelimiter[0].trim(), v2: byDelimiter[1].trim() };
  }
  
  // Try splitting by version markers
  const versionMatch = text.match(/(?:versão\s*[ab12]|version\s*[ab12])/gi);
  if (versionMatch && versionMatch.length >= 2) {
    const parts = text.split(/versão\s*[ab12]|version\s*[ab12]/gi).filter(p => p.trim());
    if (parts.length >= 2) {
      return { v1: parts[0].trim(), v2: parts[1].trim() };
    }
  }
  
  // Fallback: split by paragraphs
  const paras = text.split(/\n{2,}/);
  const mid = Math.max(1, Math.floor(paras.length / 2));
  return { v1: paras.slice(0, mid).join("\n\n").trim(), v2: paras.slice(mid).join("\n\n").trim() };
}

function extractTitleAndBody(raw: string, providedTitle?: string): { title: string; body: string } {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  
  // If title was provided by user, use it
  if (providedTitle && providedTitle.trim()) {
    return { title: providedTitle.trim(), body: raw.trim() };
  }
  
  // Look for a title line (not a tag like [Intro])
  let titleIdx = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line && !line.startsWith('[') && !line.startsWith('#') && line.length < 100) {
      titleIdx = i;
      break;
    }
  }
  
  if (titleIdx >= 0) {
    const title = lines[titleIdx].replace(/^["']|["']$/g, '').slice(0, 120);
    const body = lines.filter((_, i) => i !== titleIdx).join('\n').trim();
    return { title, body };
  }
  
  return { title: "Música Personalizada", body: raw.trim() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, story, briefing, pronunciations = [] } = await req.json() as {
      orderId: string;
      story: string;
      briefing: BriefingData;
      pronunciations?: Pronunciation[];
    };

    console.log("generate-lyrics called with orderId:", orderId);

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
      monologuePosition = 'bridge',
      mandatoryWords = '',
      restrictedWords = '',
      songName = '',
      autoGenerateName = true,
      voiceType = 'feminina'
    } = briefing || {};

    // Detectar termos críticos nas palavras obrigatórias
    const criticalTerms = detectCriticalTerms(mandatoryWords);
    
    // Verificar se há termos sem pronúncia definida
    const missingPronunciations = criticalTerms.filter(
      term => !pronunciations.some(p => p.term === term)
    );

    // Build structure tags based on user selection
    const structureTags = structure.map(s => `[${s.charAt(0).toUpperCase() + s.slice(1)}]`).join(', ');

    // Map voice type to Portuguese description
    const voiceTypeMap: Record<string, string> = {
      'masculina': 'voz masculina solo',
      'feminina': 'voz feminina solo',
      'dueto': 'dueto masculino e feminino',
      'dupla_masc': 'dupla masculina',
      'dupla_fem': 'dupla feminina',
      'coral': 'coral/grupo vocal'
    };
    const voiceDescription = voiceTypeMap[voiceType] || 'voz feminina solo';

    const systemPrompt = `Você é um letrista profissional brasileiro especializado em músicas personalizadas para ${musicType === 'parodia' ? 'paródias e humor' : 'momentos especiais'}.

REGRAS OBRIGATÓRIAS:
1. Gere APENAS a letra final, sem comentários, explicações ou metadados
2. Use OBRIGATORIAMENTE as tags estruturadas: ${structureTags}
3. ${hasMonologue ? `INCLUA OBRIGATORIAMENTE a tag [monologue] ou [spoken word] na seção ${monologuePosition}. O texto dentro dessa tag deve ser FALADO/DECLAMADO, NÃO cantado. Nunca misture monólogo com [Verse], [Chorus] ou [Bridge].` : 'NÃO inclua monólogo ou spoken word'}
4. ${mandatoryWords ? `Palavras/nomes OBRIGATÓRIOS que devem aparecer: ${mandatoryWords}` : 'Nenhuma palavra obrigatória específica'}
5. ${restrictedWords ? `Palavras/assuntos PROIBIDOS que NÃO podem aparecer: ${restrictedWords}` : 'Nenhuma restrição específica'}
6. Mantenha métrica e rima coerentes para canto
7. A letra deve ter entre 150-300 palavras para ~2-3 minutos de música
8. Capture a essência emocional da história fornecida
9. Intensidade emocional: ${emotionIntensity}/5 - ${emotionIntensity <= 2 ? 'sutil' : emotionIntensity <= 3 ? 'moderada' : 'intensa'}
10. ${autoGenerateName ? 'CRIE UM TÍTULO CRIATIVO E ÚNICO para cada versão da letra, baseado na história. O título deve vir na PRIMEIRA LINHA, antes do [Intro].' : `O título da música é: "${songName}". Use-o na primeira linha.`}
11. A música será cantada por ${voiceDescription}. Adapte o tom e as referências de gênero adequadamente.

${hasMonologue ? `
⚠️ REGRA CRÍTICA DE MONÓLOGO:
- SEMPRE use a tag [monologue] ou [spoken word] para trechos declamados
- TODO o texto falado DEVE estar DENTRO dessa tag
- NUNCA trate declamação como verso cantado
- NUNCA misture declamação com outras seções

✅ CORRETO:
[monologue]
"Texto declamado aqui..."

❌ ERRADO:
[Verse]
Texto falado...
` : ''}

FORMATO DE SAÍDA OBRIGATÓRIO:

TÍTULO DA MÚSICA (primeira linha, sem colchetes)

[Intro]
(2-4 versos de abertura)

[Verse 1]
(4-6 versos narrativos)

[Chorus]
(4-6 versos - refrão principal, memorável e fácil de cantar)

${hasMonologue && monologuePosition === 'intro' ? '' : `[Verse 2]
(4-6 versos desenvolvendo a história)

`}${hasMonologue && monologuePosition === 'bridge' ? `[monologue]
(texto declamado/falado, NÃO cantado - 2-4 frases emocionais entre aspas)

` : `[Bridge]
(2-4 versos de transição emocional)

`}[Chorus]
(repetição do refrão)

[Outro]
(2-4 versos de encerramento)${hasMonologue && monologuePosition === 'outro' ? `

[monologue]
(texto declamado final entre aspas)` : ''}`;

    const userPrompt = `Crie DUAS versões de letra completas para uma música personalizada.

DADOS DA MÚSICA:
- Tipo: ${musicType}
- Emoção principal: ${emotion} (intensidade ${emotionIntensity}/5)
- Estilo musical: ${style}
- Ritmo: ${rhythm}
- Atmosfera: ${atmosphere}
- Tipo de voz: ${voiceDescription}
- Estrutura desejada: ${structure.join(', ')}
- Incluir monólogo/declamação: ${hasMonologue ? `SIM - na seção ${monologuePosition}` : 'NÃO'}
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras/assuntos proibidos: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `- Nome da música: ${songName}` : '- Crie um título criativo para cada versão'}

HISTÓRIA/CONTEXTO BASE (use fielmente):
${story}

INSTRUÇÕES FINAIS:
- Crie DUAS versões DIFERENTES mas baseadas na mesma história
- Separe as duas versões com uma linha contendo apenas: ---
- Cada versão deve ser completa e independente
- ${autoGenerateName ? 'Cada versão deve ter um título criativo diferente na primeira linha' : `Use o título "${songName}" para ambas as versões`}
- NÃO inclua comentários, explicações ou metadados
- APENAS as letras com as tags estruturadas`;

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
        max_tokens: 3000,
        temperature: 0.85,
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
    const l1 = extractTitleAndBody(v1, autoGenerateName ? undefined : songName);
    const l2 = extractTitleAndBody(v2, autoGenerateName ? undefined : songName);

    // Gerar versões fonéticas se houver pronúncias definidas
    let phonetic1 = null;
    let phonetic2 = null;
    
    if (pronunciations.length > 0) {
      phonetic1 = applyPronunciations(l1.body, pronunciations);
      phonetic2 = applyPronunciations(l2.body, pronunciations);
    }

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert lyrics with phonetic versions
    const { data: insertedLyrics, error: insertError } = await supabase
      .from('lyrics')
      .insert([
        { 
          order_id: orderId, 
          version: 'A', 
          title: l1.title, 
          body: l1.body, 
          phonetic_body: phonetic1,
          is_approved: false 
        },
        { 
          order_id: orderId, 
          version: 'B', 
          title: l2.title, 
          body: l2.body, 
          phonetic_body: phonetic2,
          is_approved: false 
        }
      ])
      .select();

    if (insertError) {
      console.error("Error inserting lyrics:", insertError);
    }

    // Update order status and save pronunciations
    const updateData: Record<string, unknown> = { 
      status: 'LYRICS_GENERATED', 
      updated_at: new Date().toISOString(),
      voice_type: voiceType
    };
    
    if (pronunciations.length > 0) {
      updateData.pronunciations = pronunciations;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error("Error updating order status:", updateError);
    }

    // Get user_id from order for push notification
    const { data: orderData } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();

    // Send push notification that lyrics are ready
    if (orderData?.user_id) {
      try {
        console.log("Sending push notification for lyrics ready...");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            user_id: orderData.user_id,
            order_id: orderId,
            title: '✨ Letras prontas!',
            body: 'As letras da sua música foram geradas. Acesse para escolher sua favorita!',
            url: `/criar-musica?orderId=${orderId}`
          })
        });
        console.log("Push notification sent successfully");
      } catch (pushError) {
        console.error("Push notification error:", pushError);
        // Don't fail the main operation if push fails
      }
    }

    console.log("Lyrics saved successfully");

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Letras geradas com sucesso",
        lyrics: [
          { 
            id: insertedLyrics?.[0]?.id || 'lyric-a', 
            version: 'A', 
            title: l1.title, 
            text: l1.body,
            phoneticText: phonetic1
          },
          { 
            id: insertedLyrics?.[1]?.id || 'lyric-b', 
            version: 'B', 
            title: l2.title, 
            text: l2.body,
            phoneticText: phonetic2
          }
        ],
        criticalTerms: missingPronunciations,
        usedModel: "gemini-3-flash-preview"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("generate-lyrics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
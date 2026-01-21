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
  voiceType?: string;
  // Campos instrumentais
  isInstrumental?: boolean;
  instruments?: string[];
  soloInstrument?: string;
  soloMoment?: string;
  instrumentationNotes?: string;
}

interface Pronunciation {
  term: string;
  phonetic: string;
}

// Mapear IDs de instrumentos para nomes em inglês
const instrumentNameMap: Record<string, string> = {
  piano: 'Grand Piano',
  violao: 'Acoustic Guitar',
  guitarra: 'Electric Guitar',
  violino: 'Violin',
  saxofone: 'Saxophone',
  trompete: 'Trumpet/Brass',
  bateria: 'Drums/Percussion',
  baixo: 'Bass Guitar',
  ukulele: 'Ukulele',
  acordeao: 'Accordion',
  orquestra: 'Full Orchestra',
  sintetizador: 'Synthesizers/Electronic',
  flauta: 'Flute',
  harpa: 'Harp'
};

// Aplicar pronúncias ao texto
function applyPronunciations(text: string, pronunciations: Pronunciation[]): string {
  let result = text;
  pronunciations.forEach(({ term, phonetic }) => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, phonetic);
  });
  return result;
}

// Detectar termos críticos sem pronúncia
function detectCriticalTerms(text: string): string[] {
  const patterns = [
    /\b[A-Z]{2,}[0-9]*\b/g,
    /\b[A-Z]+[0-9]+[A-Z0-9]*\b/g,
    /\b[A-Z][a-z]*[A-Z][a-zA-Z]*\b/g,
    /\b[A-Z]{2,}[a-z]+\b/g,
  ];
  
  const terms = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        if (!['EU', 'EUA', 'OK', 'TV', 'DVD', 'CD'].includes(m) && m.length >= 2) {
          terms.add(m);
        }
      });
    }
  });
  
  return Array.from(terms);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderId, 
      lyricId, 
      approvedLyrics, 
      phoneticLyrics, 
      songTitle, 
      briefing, 
      pronunciations = [],
      isInstrumental = false
    } = await req.json() as {
      orderId: string;
      lyricId?: string;
      approvedLyrics?: string;
      phoneticLyrics?: string;
      songTitle?: string;
      briefing: BriefingData;
      pronunciations?: Pronunciation[];
      isInstrumental?: boolean;
    };

    console.log("generate-style-prompt called with orderId:", orderId, "isInstrumental:", isInstrumental);

    if (!orderId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campo obrigatório: orderId" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para músicas cantadas, letras são obrigatórias
    if (!isInstrumental && !approvedLyrics) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios para música cantada: approvedLyrics" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detectar termos críticos sem pronúncia (apenas para cantada)
    if (!isInstrumental && approvedLyrics) {
      const criticalTerms = detectCriticalTerms(approvedLyrics);
      const missingPronunciations = criticalTerms.filter(
        term => !pronunciations.some(p => p.term === term)
      );

      if (missingPronunciations.length > 0) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: `Termo(s) detectado(s) sem pronúncia definida: ${missingPronunciations.join(', ')}. Defina a pronúncia antes de gerar a música.`,
            missingPronunciations
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      hasMonologue = false,
      voiceType = 'feminina',
      instruments = [],
      soloInstrument,
      soloMoment,
      instrumentationNotes
    } = briefing || {};

    // Map rhythm to BPM range
    const bpmMap: Record<string, string> = {
      'lento': '60-80 BPM (Ballad)',
      'moderado': '90-110 BPM (Mid-tempo)',
      'animado': '120-140 BPM (Upbeat)'
    };

    // Map atmosphere to production notes
    const atmosphereMap: Record<string, string> = {
      'intimo': 'Intimate, acoustic, minimal reverb, close-mic feel',
      'festivo': 'Celebratory, bright mix, energetic dynamics',
      'melancolico': 'Melancholic, subtle pads, tasteful string arrangements, emotional dynamics',
      'epico': 'Epic, orchestral elements, big drums, cinematic build-ups',
      'leve': 'Light, airy production, soft dynamics, gentle instrumentation',
      'misterioso': 'Mysterious, ambient textures, subtle tension, ethereal pads'
    };

    let stylePrompt: string;
    let finalPrompt: string;

    if (isInstrumental) {
      // === PROMPT PARA MÚSICA INSTRUMENTAL ===
      const instrumentsList = instruments.length > 0 
        ? instruments.map(i => instrumentNameMap[i] || i).join(', ')
        : 'Piano, Strings';
      
      const soloInfo = soloInstrument && soloInstrument !== 'none'
        ? `Featured Solo: ${instrumentNameMap[soloInstrument] || soloInstrument} solo in the ${
            soloMoment === 'intro' ? 'introduction' :
            soloMoment === 'meio' ? 'bridge/middle section' :
            soloMoment === 'final' ? 'finale/outro' :
            'bridge section'
          }`
        : 'No featured solo - balanced ensemble arrangement';

      const systemPrompt = `You are a professional music producer specializing in creating technical prompts for AI music generation (Suno, Udio, etc).

Your task is to create a detailed technical style prompt for an INSTRUMENTAL track (NO VOCALS).

CRITICAL RULES:
1. The prompt must be in ENGLISH
2. Be specific with genres, subgenres, and sonic characteristics
3. Include technical production details
4. ⚠️ DO NOT MENTION ANY FAMOUS ARTIST OR BAND NAMES as references
5. Focus on instrumental arrangement, dynamics, and production
6. This is a pure instrumental piece - NO VOCALS, NO LYRICS

OUTPUT FORMAT (follow exactly, in English):

[Style]
Genre: (main genre and subgenre, NO artist names)
Mood/Atmosphere: (detailed emotional climate)
Instrumentation: (list all instruments with specific playing style and arrangement details)
${soloInstrument && soloInstrument !== 'none' ? 'Featured Solo: (detailed solo instrument characteristics and placement)' : ''}
Tempo: (BPM and rhythmic feel)
Key: (suggested key signature)
Production Notes: (technical production notes, mix, effects, dynamics)
Structure: (suggested song structure for instrumental - intro, themes, bridge, variations, outro)

Do not include explanations, only the structured technical prompt.
NEVER mention artist names, bands, or specific songs.`;

      const userPrompt = `Create the style prompt for this INSTRUMENTAL track:

CONTEXT:
- Type: ${musicType}
- Musical Style: ${style}
- Tempo: ${rhythm} (${bpmMap[rhythm] || '90-110 BPM'})
- Atmosphere: ${atmosphere} (${atmosphereMap[atmosphere] || 'balanced production'})
- Primary Instruments: ${instrumentsList}
- ${soloInfo}
${instrumentationNotes ? `- Client Notes: ${instrumentationNotes}` : ''}

REMEMBER: 
- This is an INSTRUMENTAL track - NO VOCALS
- DO NOT mention any artist names, bands, or songs as reference
- Describe specific sonic characteristics instead of comparing to artists
- Focus on instrumental arrangement and production quality`;

      console.log("Calling Lovable AI Gateway for instrumental style prompt...");

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
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ ok: false, error: "Erro ao gerar prompt de estilo. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiResponse = await response.json();
      stylePrompt = aiResponse.choices?.[0]?.message?.content?.trim();

      if (!stylePrompt) {
        return new Response(
          JSON.stringify({ ok: false, error: "Resposta vazia da IA" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Para instrumental, o final_prompt é apenas o style prompt
      finalPrompt = `${stylePrompt}

[Instrumental Track - No Lyrics]`;

    } else {
      // === PROMPT PARA MÚSICA CANTADA (código original) ===
      
      // Map voice type to vocal instructions
      const voiceTypeMap: Record<string, string> = {
        'masculina': 'Male solo vocalist, baritone to tenor range, warm timbre',
        'feminina': 'Female solo vocalist, alto to soprano range, clear and expressive',
        'dueto': 'Male and female duet, harmonizing voices, alternating verses and shared chorus',
        'dupla_masc': 'Two male vocalists, harmony singing, Brazilian dupla sertaneja style',
        'dupla_fem': 'Two female vocalists, harmony singing, blending voices',
        'coral': 'Choir/group vocals, layered harmonies, anthemic feel'
      };
      const vocalStyle = voiceTypeMap[voiceType] || 'Female solo vocalist';

      // Gerar letra fonética se houver pronúncias
      let lyricsForGeneration = approvedLyrics || '';
      if (pronunciations.length > 0 && !phoneticLyrics) {
        lyricsForGeneration = applyPronunciations(lyricsForGeneration, pronunciations);
      } else if (phoneticLyrics) {
        lyricsForGeneration = phoneticLyrics;
      }

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
Vocal Style: (${vocalStyle})
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
- Tipo de voz: ${vocalStyle}
- Contém monólogo/spoken word: ${hasMonologue ? 'SIM - deve ter seções claramente faladas, não cantadas' : 'NÃO'}

LETRA APROVADA (para contexto do mood e narrativa):
${lyricsForGeneration.substring(0, 1500)}

LEMBRE-SE: 
- NÃO mencione nomes de artistas, bandas ou músicas como referência
- Descreva características sonoras específicas em vez de comparar com artistas`;

      console.log("Calling Lovable AI Gateway for vocal style prompt...");

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
      stylePrompt = aiResponse.choices?.[0]?.message?.content?.trim();

      if (!stylePrompt) {
        return new Response(
          JSON.stringify({ ok: false, error: "Resposta vazia da IA" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // CRÍTICO: O final_prompt usa a LETRA FONÉTICA para geração musical
      let lyricsForGeneration2 = approvedLyrics || '';
      if (pronunciations.length > 0 && !phoneticLyrics) {
        lyricsForGeneration2 = applyPronunciations(lyricsForGeneration2, pronunciations);
      } else if (phoneticLyrics) {
        lyricsForGeneration2 = phoneticLyrics;
      }

      finalPrompt = `${stylePrompt}

[Lyrics]
${lyricsForGeneration2}`;
    }

    console.log("Style prompt generated successfully");

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update order with style prompt and final prompt
    const updateData: Record<string, unknown> = {
      style_prompt: stylePrompt,
      final_prompt: finalPrompt,
      status: isInstrumental ? 'STYLE_GENERATED' : 'LYRICS_APPROVED',
      updated_at: new Date().toISOString()
    };

    if (!isInstrumental && lyricId) {
      updateData.approved_lyric_id = lyricId;
      updateData.voice_type = voiceType;
      if (pronunciations.length > 0) {
        updateData.pronunciations = pronunciations;
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Mark lyric as approved and update phonetic body if needed (only for vocal)
    if (!isInstrumental && lyricId) {
      const lyricUpdateData: Record<string, unknown> = { 
        is_approved: true, 
        approved_at: new Date().toISOString() 
      };
      
      if (songTitle) {
        lyricUpdateData.title = songTitle;
      }
      
      // Save phonetic version in lyrics table
      if (approvedLyrics && pronunciations.length > 0) {
        lyricUpdateData.phonetic_body = applyPronunciations(approvedLyrics, pronunciations);
      }
      
      const { error: lyricError } = await supabase
        .from('lyrics')
        .update(lyricUpdateData)
        .eq('id', lyricId);

      if (lyricError) {
        console.error("Error marking lyric as approved:", lyricError);
      }
    }

    console.log("Order updated with style prompt. isInstrumental:", isInstrumental);

    return new Response(
      JSON.stringify({
        ok: true,
        message: isInstrumental ? "Prompt instrumental gerado com sucesso" : "Prompt de estilo gerado com sucesso",
        isInstrumental
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

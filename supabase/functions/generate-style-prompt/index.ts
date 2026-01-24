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

// Helper function to validate UUID format
function isValidUuid(id: string | undefined | null): boolean {
  if (!id || id === 'custom') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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
    console.log("Received params - lyricId:", lyricId, "approvedLyrics length:", approvedLyrics?.length || 0, "songTitle:", songTitle);
    console.log("Briefing voiceType:", briefing?.voiceType);

    if (!orderId) {
      console.error("Missing orderId");
      return new Response(
        JSON.stringify({ ok: false, error: "Campo obrigatório: orderId" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para músicas cantadas, letras são obrigatórias
    if (!isInstrumental && !approvedLyrics) {
      console.error("Missing approvedLyrics for vocal track - orderId:", orderId);
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios para música cantada: approvedLyrics. A letra não foi selecionada." }),
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

    const AI_GATEWAY_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!AI_GATEWAY_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "AI_GATEWAY_API_KEY não configurada" }),
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

      const systemPrompt = `You are a professional music producer creating ULTRA-CONCISE prompts for AI music generation (Suno, Udio).

Create a style prompt for an INSTRUMENTAL track (NO VOCALS).

⚠️ CRITICAL: OUTPUT MUST BE UNDER 950 CHARACTERS TOTAL. Be extremely concise.
⚠️ NO artist/band names. NO explanations. Just the prompt.

FORMAT (very brief, in English):
[Style]
Genre: (genre/subgenre)
Mood: (1-2 words)
Instruments: (list briefly)
${soloInstrument && soloInstrument !== 'none' ? 'Solo: (instrument + moment)' : ''}
Tempo: (BPM)
Key: (key)
Production: (brief notes)
Structure: (brief structure)`;

      const userPrompt = `INSTRUMENTAL track style prompt (UNDER 950 CHARS):
Type: ${musicType}, Style: ${style}
Tempo: ${rhythm} (${bpmMap[rhythm] || '90-110 BPM'})
Atmosphere: ${atmosphere}
Instruments: ${instrumentsList}
${soloInfo}
${instrumentationNotes ? `Notes: ${instrumentationNotes}` : ''}

BE VERY CONCISE - under 950 characters total.`;

      console.log("Calling AI Gateway for instrumental style prompt...");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
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

      const systemPrompt = `You are a music producer creating ULTRA-CONCISE prompts for AI music (Suno, Udio).

⚠️ CRITICAL RULES:
1. OUTPUT MUST BE UNDER 950 CHARACTERS TOTAL. Be extremely concise.
2. NO artist/band names. NO explanations. Just the prompt in English.
3. OUTPUT ONLY THE [Style] SECTION. DO NOT include [Lyrics] or any lyrics content.
4. The response should contain ONLY production/style instructions, never any song text.

FORMAT (very brief):
[Style]
Genre: (genre/subgenre)
Mood: (1-2 words)
Instruments: (brief list)
Vocal: (${vocalStyle.split(',')[0]})
Tempo: (BPM)
Key: (key)
Production: (brief)
${hasMonologue ? 'Spoken: (brief instruction)' : ''}`;

      const userPrompt = `Create VOCAL track style prompt (UNDER 950 CHARS):
Type: ${musicType}, Emotion: ${emotion} (${emotionIntensity}/5)
Style: ${style}, Tempo: ${rhythm} (${bpmMap[rhythm] || '90-110 BPM'})
Atmosphere: ${atmosphere}, Voice: ${vocalStyle}
${hasMonologue ? 'Has spoken word sections' : ''}

Lyrics context (first 500 chars):
${lyricsForGeneration.substring(0, 500)}

BE VERY CONCISE - under 950 characters total. No artist names.`;

      console.log("Calling AI Gateway for vocal style prompt...");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
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

      // SANITIZAÇÃO: Remover qualquer [Lyrics] que a IA possa ter incluído erroneamente
      const lyricsIndex = stylePrompt.indexOf('[Lyrics]');
      if (lyricsIndex > -1) {
        stylePrompt = stylePrompt.substring(0, lyricsIndex).trim();
        console.log("Removed leaked [Lyrics] section from style prompt");
      }

      // CRÍTICO: O final_prompt usa a LETRA FONÉTICA para geração musical
      let lyricsForGeneration2 = approvedLyrics || '';
      if (pronunciations.length > 0 && !phoneticLyrics) {
        lyricsForGeneration2 = applyPronunciations(lyricsForGeneration2, pronunciations);
      } else if (phoneticLyrics) {
        lyricsForGeneration2 = phoneticLyrics;
      }

      // Limpar duplicações na letra (remover [Intro] repetidos, etc.)
      let cleanedLyrics = lyricsForGeneration2;
      // Remover segunda ocorrência de [Lyrics] se existir
      const secondLyricsIndex = cleanedLyrics.indexOf('[Lyrics]');
      if (secondLyricsIndex > -1) {
        cleanedLyrics = cleanedLyrics.substring(0, secondLyricsIndex).trim();
      }

      finalPrompt = `${stylePrompt}

[Lyrics]
${cleanedLyrics}`;
    }

    console.log("Style prompt generated successfully");

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update order with style prompt and final prompt
    // For instrumental: keep status as LYRICS_APPROVED (admin controls when to start production)
    // For vocal: set to LYRICS_APPROVED (ready for production after lyric approval)
    const updateData: Record<string, unknown> = {
      style_prompt: stylePrompt,
      final_prompt: finalPrompt,
      updated_at: new Date().toISOString()
    };
    
    // Only update status for vocal tracks (instrumental stays in current status)
    if (!isInstrumental) {
      updateData.status = 'LYRICS_APPROVED';
    }

    // Only save approved_lyric_id if it's a valid UUID (not "custom" string)
    if (!isInstrumental && isValidUuid(lyricId)) {
      updateData.approved_lyric_id = lyricId;
      updateData.voice_type = voiceType;
      if (pronunciations.length > 0) {
        updateData.pronunciations = pronunciations;
      }
    } else if (!isInstrumental) {
      // For custom lyrics, just save voice_type and pronunciations without lyric reference
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

    // Mark lyric as approved and update phonetic body if needed (only for vocal with valid UUID)
    if (!isInstrumental && isValidUuid(lyricId)) {
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
    } else if (!isInstrumental) {
      console.log("Custom lyric flow - skipping lyrics table update (no valid lyricId)");
    }

    console.log("Order updated with style prompt. isInstrumental:", isInstrumental);

    // Trigger automatic validation (async, non-blocking)
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      supabaseClient.functions.invoke('validate-prompt', {
        body: {
          orderId,
          briefing,
          stylePrompt,
          finalPrompt
        }
      }).catch(err => console.error("Validation error (non-blocking):", err));
    } catch (validationError) {
      console.error("Failed to trigger validation:", validationError);
    }

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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  // Campos motivacionais
  motivationalNarrative?: string;
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalPerspective?: string;
  monologuePosition?: string;
}

interface Pronunciation {
  term: string;
  phonetic: string;
}

// ============ REGRAS DE FORMATAÇÃO PARA SUNO ============
// REGRA: Telefones → números separados por hífen (1-6-9-9-7...)
// REGRA: Sites → w-w-w-ponto-nome-ponto-com-ponto-b-r
// REGRA: Siglas → letras maiúsculas com hífen (F-M-E)
// REGRA: NUNCA usar fonética explicativa (ésse, éfe, erre)

// Converter telefone para formato com hífens entre dígitos
function convertPhoneToHyphens(text: string): string {
  const phonePatterns = [
    /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
    /\d{10,11}/g,
    /\d{2}[\s.-]\d{4,5}[\s.-]\d{4}/g
  ];
  
  let result = text;
  
  phonePatterns.forEach(pattern => {
    result = result.replace(pattern, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.split('').join('-');
    });
  });
  
  return result;
}

// Converter URLs para formato soletrado com hífens
function convertUrlToHyphens(text: string): string {
  let result = text;
  
  result = result.replace(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})(\.[a-zA-Z]{2})?/gi, 
    (_match, _protocol, hasWww, name, ext1, ext2) => {
      const parts: string[] = [];
      
      if (hasWww) {
        parts.push('w-w-w');
      }
      
      parts.push(`ponto-${name.toLowerCase()}`);
      
      const extFormatted = ext1.toLowerCase() === 'br' ? 'b-r' : ext1.toLowerCase();
      parts.push(`ponto-${extFormatted}`);
      
      if (ext2) {
        const ext2Clean = ext2.replace('.', '').toLowerCase();
        const ext2Formatted = ext2Clean === 'br' ? 'b-r' : ext2Clean;
        parts.push(`ponto-${ext2Formatted}`);
      }
      
      return parts.join('-');
    }
  );
  
  result = result.replace(/@([a-zA-Z0-9_]+)/g, (_match, handle) => {
    return `arroba-${handle.toLowerCase()}`;
  });
  
  return result;
}

// Soletrar siglas com hífens entre letras (sem fonética)
function convertAcronymsToHyphens(text: string): string {
  const acronymPattern = /\b([A-Z]{2,4})\b/g;
  const keepAsWord = ['FIFA', 'NASA', 'PIX', 'SUS', 'SAMU', 'ENEM', 'VIP', 'LED'];
  
  return text.replace(acronymPattern, (match) => {
    if (keepAsWord.includes(match)) {
      return match;
    }
    return match.split('').join('-');
  });
}

// Aplicar TODAS as regras de formatação
function applyGlobalPronunciationRules(text: string): string {
  let result = text;
  
  result = convertPhoneToHyphens(result);
  result = convertUrlToHyphens(result);
  result = convertAcronymsToHyphens(result);
  
  return result;
}

// Função removida - não usamos mais dicionário de pronúncias
// As conversões são feitas por regras de formatação com hífens

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

// Aplicar pronúncias customizadas ao texto
function applyPronunciations(text: string, pronunciations: Pronunciation[]): string {
  let result = text;
  pronunciations.forEach(({ term, phonetic }) => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, phonetic);
  });
  return result;
}

// ============ FORMATAÇÃO PARA LETRA PRÓPRIA (CUSTOM LYRICS) ============
// REGRA CRÍTICA: NUNCA remover conteúdo da letra do usuário
// Apenas adicionar tags estruturais se não existirem
function formatCustomLyricsForSuno(customLyrics: string): string {
  // Check if lyrics already have SUNO structural tags
  const hasStructuralTags = /\[(Intro|Verse|Chorus|Bridge|Outro|Hook|Pre-Chorus|Post-Chorus|Interlude|Break|End)\]/i.test(customLyrics);
  
  if (hasStructuralTags) {
    // Already has structure, just clean up formatting
    console.log("Custom lyrics already have structural tags, preserving as-is");
    return customLyrics.trim();
  }
  
  // No structural tags - add basic structure while PRESERVING ALL CONTENT
  console.log("Custom lyrics missing structural tags, adding basic structure");
  
  // Split lyrics into paragraphs/stanzas
  const paragraphs = customLyrics
    .split(/\n\s*\n+/) // Split by blank lines
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (paragraphs.length === 0) {
    return customLyrics.trim();
  }
  
  // Build structured lyrics preserving ALL original content
  const structuredParts: string[] = [];
  
  // Add intro if first paragraph is short (less than 4 lines)
  let verseCount = 1;
  let addedChorus = false;
  
  paragraphs.forEach((para, index) => {
    const lines = para.split('\n').filter(l => l.trim());
    const lineCount = lines.length;
    
    // Detect potential chorus (repeated or shorter sections after verses)
    const isShortSection = lineCount <= 4;
    const isAfterVerse = verseCount > 1;
    
    if (index === 0 && lineCount <= 3) {
      // Short first section -> Intro
      structuredParts.push(`[Intro]\n${para}`);
    } else if (!addedChorus && isShortSection && isAfterVerse) {
      // First short section after a verse -> Chorus
      structuredParts.push(`[Chorus]\n${para}`);
      addedChorus = true;
    } else if (addedChorus && para === paragraphs[paragraphs.indexOf(paragraphs.find(p => 
      structuredParts.some(s => s.includes('[Chorus]') && s.includes(p))
    ) || '')]) {
      // Repeated chorus
      structuredParts.push(`[Chorus]\n${para}`);
    } else {
      // Regular verse
      structuredParts.push(`[Verse ${verseCount}]\n${para}`);
      verseCount++;
    }
  });
  
  // Ensure there's at least one [Chorus] if we have multiple sections
  if (!addedChorus && structuredParts.length > 1) {
    // Find the shortest section and mark it as chorus
    let shortestIdx = 1;
    let shortestLen = Infinity;
    structuredParts.forEach((part, idx) => {
      if (idx === 0) return; // Skip intro
      const len = part.split('\n').length;
      if (len < shortestLen) {
        shortestLen = len;
        shortestIdx = idx;
      }
    });
    
    if (shortestIdx > 0) {
      const content = structuredParts[shortestIdx].replace(/\[Verse \d+\]\n/, '');
      structuredParts[shortestIdx] = `[Chorus]\n${content}`;
    }
  }
  
  const result = structuredParts.join('\n\n');
  console.log("Formatted custom lyrics, original length:", customLyrics.length, "formatted length:", result.length);
  
  // SAFETY CHECK: Ensure we didn't lose content
  const originalWords = customLyrics.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
  const formattedWords = result.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
  
  const missingWords = originalWords.filter(w => !formattedWords.includes(w));
  if (missingWords.length > 0) {
    console.error("WARNING: Formatting lost some words! Missing:", missingWords.slice(0, 10));
    // Return original if we lost content
    return `[Verse 1]\n${customLyrics.trim()}`;
  }
  
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
      isInstrumental = false,
      customCoverUrl = null,
      coverMode = 'auto'
    } = await req.json() as {
      orderId: string;
      lyricId?: string;
      approvedLyrics?: string;
      phoneticLyrics?: string;
      songTitle?: string;
      briefing: BriefingData;
      pronunciations?: Pronunciation[];
      isInstrumental?: boolean;
      customCoverUrl?: string | null;
      coverMode?: string;
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

    // Verificar se o pedido já tem um style_prompt customizado (fornecido pelo usuário)
    const supabaseUrlCheck = Deno.env.get("SUPABASE_URL")!;
    const supabaseKeyCheck = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseCheck = createClient(supabaseUrlCheck, supabaseKeyCheck);

    const { data: existingOrder, error: orderError } = await supabaseCheck
      .from('orders')
      .select('style_prompt, song_title, has_custom_lyric')
      .eq('id', orderId)
      .single();

    if (!orderError && existingOrder?.style_prompt && existingOrder.style_prompt.trim().length > 0) {
      // Já tem style_prompt customizado, apenas atualizar status e final_prompt se necessário
      console.log("Order already has custom style_prompt, skipping generation");
      
      // Se approvedLyrics não foi passado, buscar a letra do story (para custom lyrics)
      let lyricsContent = approvedLyrics;
      if (!lyricsContent && existingOrder.has_custom_lyric) {
        console.log("Custom lyrics order detected, fetching lyrics from story field");
        const { data: orderWithStory } = await supabaseCheck
          .from('orders')
          .select('story')
          .eq('id', orderId)
          .single();
        lyricsContent = orderWithStory?.story || '';
        console.log("Fetched lyrics from story, length:", lyricsContent?.length || 0);
        
        // Format custom lyrics for SUNO structure (preserving ALL content)
        if (lyricsContent) {
          lyricsContent = formatCustomLyricsForSuno(lyricsContent);
        }
      }
      
      // Formatar com tag [Lyrics] para o Admin Dashboard exibir corretamente
      const finalPrompt = lyricsContent ? `[Lyrics]\n${lyricsContent}` : '';
      console.log("Saving final_prompt with [Lyrics] tag, length:", finalPrompt.length);
      
      await supabaseCheck
        .from('orders')
        .update({
          status: 'LYRICS_APPROVED',
          final_prompt: finalPrompt,
          song_title: songTitle || existingOrder.song_title,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Style prompt customizado já existe, aprovação concluída",
          style_prompt: existingOrder.style_prompt,
          final_prompt: finalPrompt,
          skipped_generation: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      instrumentationNotes,
      motivationalNarrative = '',
      motivationalMoment = '',
      motivationalIntensity: motivIntensity = '',
      motivationalPerspective = '',
      monologuePosition = ''
    } = briefing || {};

    // Detectar se é modo "Somente Monólogo" (spoken word motivacional)
    const isSomenteMonologo = motivationalNarrative === 'somente_monologo' || monologuePosition === 'full';
    console.log("Somente Monologo mode in style-prompt:", isSomenteMonologo, "motivationalNarrative:", motivationalNarrative);

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

    // Detectar se é música de ambiente/relaxamento
    const isAmbientRelaxation = style === 'ambiente' || 
      atmosphere === 'relaxamento' || 
      atmosphere === 'calmo' ||
      musicType === 'trilha' && (atmosphere === 'paz' || atmosphere === 'calma');
    
    // Instruções especiais para música de ambiente/relaxamento
    const ambientInstructions = isAmbientRelaxation ? `
⚠️ CRITICAL AMBIENT/RELAXATION REQUIREMENTS:
- MANDATORY: Very slow tempo (50-70 BPM maximum)
- MANDATORY: Minimal arrangement - few notes, long sustained tones
- MANDATORY: Background music style - should NOT draw attention
- MANDATORY: No sudden dynamic changes, no crescendos, no drums
- Use: ambient pads, soft piano, gentle strings, nature sounds, soft synths
- AVOID: percussion, drums, fast arpeggios, complex melodies, sudden changes
- Style: Lo-fi, ambient, meditation music, focus music, study music
- The music must help concentration, not distract from it
- Think: spa music, meditation, yoga, study background` : '';
    
    // Forçar ritmo lento para ambiente/relaxamento
    const effectiveRhythm = isAmbientRelaxation ? 'lento' : rhythm;
    const effectiveBpm = isAmbientRelaxation ? '50-70 BPM (Ambient/Meditation)' : (bpmMap[effectiveRhythm] || '90-110 BPM');

    let stylePrompt: string;
    let finalPrompt: string;
    let generatedInstrumentalTitle: string = '';

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

      // First, generate a creative title for the instrumental track
      const titlePrompt = `Generate a creative, evocative title for an instrumental music track.

Track details:
- Type: ${musicType}
- Style: ${style}${isAmbientRelaxation ? ' (AMBIENT/RELAXATION music for focus and calm)' : ''}
- Atmosphere: ${atmosphere}
- Instruments: ${isAmbientRelaxation ? 'Ambient pads, soft piano, gentle strings' : instrumentsList}
- Mood: ${isAmbientRelaxation ? 'Very calm, peaceful, meditative' : (rhythm === 'lento' ? 'Slow, contemplative' : rhythm === 'animado' ? 'Energetic, upbeat' : 'Balanced, flowing')}

Requirements:
- Title in Portuguese (Brazil)
- 2-5 words maximum
- Evocative and memorable
- No quotes, just the title text
${isAmbientRelaxation ? '- Should evoke peace, tranquility, focus (Ex: "Serenidade", "Momento de Paz", "Brisa Suave")' : '- Examples: "Aurora Dourada", "Ventos do Sul", "Despertar Épico"'}

Return ONLY the title, nothing else.`;

      console.log("Generating instrumental title...");
      const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "user", content: titlePrompt }
          ],
          max_tokens: 50,
          temperature: 0.8,
        }),
      });

      let generatedTitle = '';
      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        generatedTitle = titleData.choices?.[0]?.message?.content?.trim().replace(/["']/g, '') || '';
        console.log("Generated instrumental title:", generatedTitle);
      }

      const systemPrompt = `[ISOLATION: ORDER-${orderId}-${Date.now()}]
You are a professional music producer creating ULTRA-CONCISE prompts for AI music generation (Suno, Udio).
CRITICAL: This prompt is INDEPENDENT. Do NOT reference any other orders, songs, or previously generated content.

Create a style prompt for an INSTRUMENTAL track (NO VOCALS).

⚠️ CRITICAL: OUTPUT MUST BE UNDER 950 CHARACTERS TOTAL. Be extremely concise.
⚠️ NO artist/band names. NO explanations. Just the prompt.
${ambientInstructions}

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
Type: ${musicType}, Style: ${style}${isAmbientRelaxation ? ' (AMBIENT/RELAXATION - MUST BE VERY CALM)' : ''}
Tempo: ${effectiveRhythm} (${effectiveBpm})
Atmosphere: ${atmosphere}${isAmbientRelaxation ? ' - FOCUS MUSIC, NO DISTRACTIONS' : ''}
Instruments: ${isAmbientRelaxation ? 'Ambient pads, soft piano, gentle strings ONLY - NO DRUMS' : instrumentsList}
${soloInfo}
${instrumentationNotes ? `Notes: ${instrumentationNotes}` : ''}
${isAmbientRelaxation ? 'CRITICAL: This is background/focus music. Must be VERY slow, minimal, calming. No drums, no fast parts.' : ''}

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

      // Save generated title for instrumental
      if (generatedTitle && !songTitle) {
        generatedInstrumentalTitle = generatedTitle;
      }

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

      const systemPrompt = `[ISOLATION: ORDER-${orderId}-${Date.now()}]
You are a music producer creating ULTRA-CONCISE prompts for AI music (Suno, Udio).
CRITICAL: This prompt is INDEPENDENT. Do NOT reference any other orders, songs, or previously generated content.

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
      // Para letra própria (custom lyrics), formatar preservando TODO o conteúdo
      let lyricsForGeneration2 = approvedLyrics || '';
      
      // Check if this is a custom lyric order by checking the lyricId or order data
      const isCustomLyricOrder = lyricId === 'custom' || existingOrder?.has_custom_lyric;
      
      if (isCustomLyricOrder) {
        console.log("Processing custom lyrics order - formatting for SUNO while preserving ALL content");
        lyricsForGeneration2 = formatCustomLyricsForSuno(lyricsForGeneration2);
      }
      
      // 1. Aplicar regras globais de pronúncia (telefones, URLs, siglas)
      lyricsForGeneration2 = applyGlobalPronunciationRules(lyricsForGeneration2);
      console.log("Applied global pronunciation rules to final lyrics");
      
      // 2. Aplicar pronúncias customizadas do usuário
      if (pronunciations.length > 0 && !phoneticLyrics) {
        lyricsForGeneration2 = applyPronunciations(lyricsForGeneration2, pronunciations);
      } else if (phoneticLyrics) {
        // Se já tem versão fonética, aplicar regras globais nela também
        lyricsForGeneration2 = applyGlobalPronunciationRules(phoneticLyrics);
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

    // Save custom cover URL if user provided one
    if (customCoverUrl && (coverMode === 'original' || coverMode === 'enhanced')) {
      updateData.cover_url = customCoverUrl;
      console.log("Saving custom cover URL:", customCoverUrl, "mode:", coverMode);
    }

    // Trigger cover enhancement if user selected enhanced mode
    if (customCoverUrl && coverMode === 'enhanced') {
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        // Non-blocking: enhance cover in background after saving the original
        supabaseClient.functions.invoke('generate-cover-image', {
          body: { orderId, enhanceMode: true }
        }).then(result => {
          console.log("Cover enhancement triggered:", result.data?.enhanced ? 'success' : 'skipped');
        }).catch(err => console.error("Cover enhancement error (non-blocking):", err));
      } catch (enhanceError) {
        console.error("Failed to trigger cover enhancement:", enhanceError);
      }
    }
    
    // Set status to LYRICS_APPROVED for ALL order types (instrumental and vocal)
    updateData.status = 'LYRICS_APPROVED';

    // CRITICAL: Save song_title to order - USER-PROVIDED title has absolute priority
    // Never overwrite user-provided title with AI-generated content
    if (songTitle && songTitle.trim()) {
      updateData.song_title = songTitle.trim();
      console.log("Saving USER-PROVIDED song_title to order:", songTitle);
    } else if (isInstrumental && generatedInstrumentalTitle) {
      // Only use AI-generated title if user didn't provide one (instrumental only)
      updateData.song_title = generatedInstrumentalTitle;
      console.log("Saving AI-generated instrumental title:", generatedInstrumentalTitle);
    }
    // Note: For vocal tracks without provided title, the title comes from generate-lyrics

    // Only save approved_lyric_id if it's a valid UUID (not "custom", "lyric-modified", etc.)
    if (!isInstrumental && isValidUuid(lyricId)) {
      updateData.approved_lyric_id = lyricId;
      updateData.voice_type = voiceType;
      if (pronunciations.length > 0) {
        updateData.pronunciations = pronunciations;
      }
    } else if (!isInstrumental) {
      // For custom lyrics or modified lyrics without valid UUID, just save voice_type and pronunciations without lyric reference
      console.log("Non-UUID lyricId detected:", lyricId, "- skipping approved_lyric_id update");
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
      // Don't throw here - the main operation succeeded
    }

    // Mark lyric as approved and update body/phonetic body (only for vocal with valid UUID)
    if (!isInstrumental && isValidUuid(lyricId)) {
      const lyricUpdateData: Record<string, unknown> = { 
        is_approved: true, 
        approved_at: new Date().toISOString() 
      };
      
      if (songTitle) {
        lyricUpdateData.title = songTitle;
      }
      
      // CRITICAL: Save the edited lyric body (user may have manually edited the text)
      if (approvedLyrics) {
        lyricUpdateData.body = approvedLyrics;
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
        // Don't throw here - the main operation succeeded
      }
    } else if (!isInstrumental) {
      console.log("Modified/custom lyric flow - skipping lyrics table update (lyricId:", lyricId, ")");
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

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

// Dicionário de pronúncias brasileiras comuns
const BRAZILIAN_PRONUNCIATIONS: Record<string, string> = {
  // Siglas pronunciadas como palavras
  'UTI': 'utei', 'ONU': 'onu', 'FIFA': 'fifa', 'NASA': 'nasa', 'PIX': 'pix',
  'INSS': 'inésse', 'PIB': 'pib', 'FGTS': 'éfe gê tê ésse', 'SUS': 'sus',
  'DETRAN': 'detrân', 'ENEM': 'enêm', 'SAMU': 'samu', 'PROUNI': 'prouni',
  // Siglas soletradas
  'CPF': 'cê pê éfe', 'RG': 'érre gê', 'CEO': 'ci-i-ôu', 'DJ': 'di-jêi',
  'PT': 'pê tê', 'CNPJ': 'cê ene pê jota', 'OAB': 'ô á bê', 'CRM': 'cê érre ême',
  'CREA': 'cê érre é á', 'TJ': 'tê jota', 'MP': 'ême pê', 'TSE': 'tê ésse é',
  'STF': 'ésse tê éfe', 'STJ': 'ésse tê jota',
  // Estados brasileiros (siglas)
  'AC': 'a-cê', 'AL': 'a-éle', 'AP': 'a-pê', 'AM': 'a-ême',
  'BA': 'bê-á', 'CE': 'cê-é', 'DF': 'dê-éfe', 'ES': 'é-ésse',
  'GO': 'gê-ó', 'MA': 'ême-á', 'MT': 'ême-tê', 'MS': 'ême-ésse',
  'MG': 'ême gê', 'PA': 'pê-á', 'PB': 'pê-bê', 'PE': 'pê-é',
  'PI': 'pê-í', 'RJ': 'érre jota', 'RN': 'érre-ene', 'RS': 'érre ésse',
  'RO': 'érre-ó', 'RR': 'érre-érre', 'SC': 'ésse-cê', 'SP': 'ésse pê',
  'SE': 'ésse-é', 'TO': 'tê-ó', 'PR': 'pê érre',
  // Times de futebol brasileiros
  'Flamengo': 'flamêngo', 'Corinthians': 'coríntiâns', 'Palmeiras': 'paumêiras',
  'São Paulo': 'são páulo', 'Santos': 'sântos', 'Grêmio': 'grêmio',
  'Internacional': 'internacionau', 'Cruzeiro': 'cruzêiro', 'Atlético': 'atlético',
  'Vasco': 'vásco', 'Botafogo': 'botafógo', 'Fluminense': 'fluminênse',
  'Bahia': 'baía', 'Fortaleza': 'fortalêza', 'Ceará': 'ceará', 'Sport': 'espórt',
  'Náutico': 'náutico', 'Santa Cruz': 'sânta cruz', 'Coritiba': 'coritíba',
  'Athletico': 'atlétiko', 'Goiás': 'goiás', 'Vitória': 'vitória',
  'Chapecoense': 'xapecoênse', 'Avaí': 'avaí', 'Figueirense': 'figuerênse',
  'Ponte Preta': 'pônte préta', 'Guarani': 'guarâni', 'Bragantino': 'bragantíno',
  'Cuiabá': 'cuiabá', 'América': 'amérika',
  // Marcas e termos populares
  'iPhone': 'aifón', 'WhatsApp': 'uóts-épi', 'Instagram': 'instágrém',
  'TikTok': 'tíc-tóc', 'YouTube': 'iútubi', 'Netflix': 'nétflics',
  'Spotify': 'espótifái', 'Uber': 'úber', 'iFood': 'ai-fúd',
  'Nubank': 'nubânc', 'Itaú': 'itaú', 'Bradesco': 'bradésco',
  'Santander': 'santânder', 'Petrobras': 'petrobrás',
  'Volkswagen': 'fólcs-váguen', 'Samsung': 'sãmsung', 'Xiaomi': 'xiaômi',
  'Havaianas': 'havaianás', 'Natura': 'natúra', 'Boticário': 'boticário',
  'Magalu': 'magalú', 'Renner': 'rênner', 'Riachuelo': 'riachuêlo',
  'Casas Bahia': 'cázas baía', 'Americanas': 'amerikânas',
  'Coca-Cola': 'cóca-cóla', 'Guaraná': 'guaraná', 'Skol': 'escól',
  'Brahma': 'bráma', 'Antarctica': 'antártika', 'Ambev': 'âmbev',
  'JBS': 'jóta bê ésse', 'Globo': 'glôbo', 'Record': 'recórd', 'SBT': 'ésse bê tê',
  'Band': 'bând', 'RedeTV': 'rêde tê-vê', 'Gol': 'gól', 'Azul': 'azúl',
  'LATAM': 'latám', 'TAM': 'tám', 'Embraer': 'embraér', 'Vale': 'váli',
  'Eletrobras': 'eletrobrás', 'Oi': 'ói', 'Vivo': 'vívo', 'Claro': 'cláro',
  'TIM': 'tím', 'Porto Seguro': 'pôrto segúro', 'Unimed': 'uniméd',
  'Hapvida': 'hapivída', 'Drogasil': 'drogasíl', 'Raia': 'ráia',
  'Pão de Açúcar': 'pão di assúcar', 'Carrefour': 'carrefúr',
  'Atacadão': 'atacadão', 'Assaí': 'assaí', 'Makro': 'mákro',
  'Leroy Merlin': 'lerói merlín', 'Tok&Stok': 'tóc i stóc',
  'Centauro': 'centáuro', 'Netshoes': 'nét-xúz', 'Mercado Livre': 'mercádo lívre',
  'Amazon': 'amazón', 'AliExpress': 'áli-esprés', 'Shopee': 'xopí', 'Shein': 'xiín',
  // Termos de internet/tech
  'Wi-Fi': 'uái-fái', 'Bluetooth': 'blutúf', 'USB': 'u-ésse-bê',
  'LED': 'léd', 'GPS': 'gê-pê-ésse', 'HD': 'agá-dê', 'SSD': 'ésse-ésse-dê',
  'PC': 'pê-cê', 'TV': 'tê-vê', 'DVD': 'dê-vê-dê', 'CD': 'cê-dê',
  'MP3': 'ême-pê-três', 'PDF': 'pê-dê-éfe', 'URL': 'u-érre-éle',
  // Expressões comuns
  'VIP': 'víp', 'PDV': 'pê-dê-vê', 'MEI': 'mêi', 'LTDA': 'limitáda',
  'COVID': 'côvid', 'Uber Eats': 'úber íts', 'Rappi': 'rápi',
  '99': 'novênta i nóvi', 'PicPay': 'píc-pêi', 'Mercado Pago': 'mercádo págo',
};

// Aplicar pronúncias conhecidas automaticamente
function applyKnownPronunciations(terms: string[]): Pronunciation[] {
  return terms
    .filter(term => BRAZILIAN_PRONUNCIATIONS[term])
    .map(term => ({ term, phonetic: BRAZILIAN_PRONUNCIATIONS[term] }));
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
- Style: ${style}
- Atmosphere: ${atmosphere}
- Instruments: ${instrumentsList}
- Mood: ${rhythm === 'lento' ? 'Slow, contemplative' : rhythm === 'animado' ? 'Energetic, upbeat' : 'Balanced, flowing'}

Requirements:
- Title in Portuguese (Brazil)
- 2-5 words maximum
- Evocative and memorable
- No quotes, just the title text
- Examples: "Aurora Dourada", "Ventos do Sul", "Despertar Épico"

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

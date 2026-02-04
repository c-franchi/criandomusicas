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

// ============ REGRAS DE FORMATAÇÃO PARA SUNO ============
// REGRA: Telefones → números separados por hífen (1-6-9-9-7...)
// REGRA: Sites → w-w-w-ponto-nome-ponto-com-ponto-b-r
// REGRA: Siglas → letras maiúsculas com hífen (F-M-E)
// REGRA: NUNCA usar fonética explicativa (ésse, éfe, erre)

// Mapa para converter DDD (2 dígitos) em texto por extenso
const dddToText: Record<string, string> = {
  '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze', '15': 'quinze',
  '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito', '19': 'dezenove',
  '21': 'vinte e um', '22': 'vinte e dois', '24': 'vinte e quatro', '27': 'vinte e sete', '28': 'vinte e oito',
  '31': 'trinta e um', '32': 'trinta e dois', '33': 'trinta e três', '34': 'trinta e quatro', '35': 'trinta e cinco',
  '37': 'trinta e sete', '38': 'trinta e oito',
  '41': 'quarenta e um', '42': 'quarenta e dois', '43': 'quarenta e três', '44': 'quarenta e quatro', '45': 'quarenta e cinco',
  '46': 'quarenta e seis', '47': 'quarenta e sete', '48': 'quarenta e oito', '49': 'quarenta e nove',
  '51': 'cinquenta e um', '53': 'cinquenta e três', '54': 'cinquenta e quatro', '55': 'cinquenta e cinco',
  '61': 'sessenta e um', '62': 'sessenta e dois', '63': 'sessenta e três', '64': 'sessenta e quatro', '65': 'sessenta e cinco',
  '66': 'sessenta e seis', '67': 'sessenta e sete', '68': 'sessenta e oito', '69': 'sessenta e nove',
  '71': 'setenta e um', '73': 'setenta e três', '74': 'setenta e quatro', '75': 'setenta e cinco', '77': 'setenta e sete',
  '79': 'setenta e nove',
  '81': 'oitenta e um', '82': 'oitenta e dois', '83': 'oitenta e três', '84': 'oitenta e quatro', '85': 'oitenta e cinco',
  '86': 'oitenta e seis', '87': 'oitenta e sete', '88': 'oitenta e oito', '89': 'oitenta e nove',
  '91': 'noventa e um', '92': 'noventa e dois', '93': 'noventa e três', '94': 'noventa e quatro', '95': 'noventa e cinco',
  '96': 'noventa e seis', '97': 'noventa e sete', '98': 'noventa e oito', '99': 'noventa e nove'
};

// Converter telefone: DDD por extenso + resto com hífens
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
      const ddd = digits.slice(0, 2);
      const restDigits = digits.slice(2);
      const dddText = dddToText[ddd] || ddd.split('').join('-');
      const restText = restDigits.split('').join('-');
      return `${dddText}, ${restText}`;
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

// Detectar termos que precisam de pronúncia fonética
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

// Aplicar pronúncias customizadas ao texto
function applyPronunciations(text: string, pronunciations: Pronunciation[]): string {
  let result = text;
  pronunciations.forEach(({ term, phonetic }) => {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    result = result.replace(regex, phonetic);
  });
  return result;
}

function splitTwoLyrics(text: string): { v1: string; v2: string } {
  const byDelimiter = text.split(/\n\s*---+\s*\n/);
  if (byDelimiter.length >= 2) {
    return { v1: byDelimiter[0].trim(), v2: byDelimiter[1].trim() };
  }
  
  const versionMatch = text.match(/(?:versão\s*[ab12]|version\s*[ab12])/gi);
  if (versionMatch && versionMatch.length >= 2) {
    const parts = text.split(/versão\s*[ab12]|version\s*[ab12]/gi).filter(p => p.trim());
    if (parts.length >= 2) {
      return { v1: parts[0].trim(), v2: parts[1].trim() };
    }
  }
  
  const paras = text.split(/\n{2,}/);
  const mid = Math.max(1, Math.floor(paras.length / 2));
  return { v1: paras.slice(0, mid).join("\n\n").trim(), v2: paras.slice(mid).join("\n\n").trim() };
}

function extractTitleAndBody(raw: string, providedTitle?: string): { title: string; body: string } {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  
  if (providedTitle && providedTitle.trim()) {
    let bodyLines = [...lines];
    for (let i = 0; i < Math.min(5, bodyLines.length); i++) {
      const line = bodyLines[i];
      if (!line || line.startsWith('[') || line.startsWith('#')) continue;
      if (line.length < 100 && !line.includes('\n')) {
        bodyLines = bodyLines.filter((_, idx) => idx !== i);
        break;
      }
    }
    return { title: providedTitle.trim(), body: bodyLines.join('\n').trim() };
  }
  
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
    const { orderId, story, briefing, pronunciations = [], isPreview = false, autoApprove = false } = await req.json() as {
      orderId: string;
      story: string;
      briefing: BriefingData;
      pronunciations?: Pronunciation[];
      isPreview?: boolean;
      autoApprove?: boolean;
    };

    console.log("generate-lyrics called with orderId:", orderId, "isPreview param:", isPreview, "autoApprove:", autoApprove);

    if (!orderId || !story) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios: orderId e story" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const AI_GATEWAY_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!AI_GATEWAY_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "AI_GATEWAY_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: orderInfo, error: orderFetchError } = await supabase
      .from('orders')
      .select('is_preview, plan_id, user_id')
      .eq('id', orderId)
      .single();
    
    if (orderFetchError) {
      console.error("Error fetching order:", orderFetchError);
    }
    
    const isPreviewOrder = orderInfo?.is_preview === true || orderInfo?.plan_id === 'preview_test' || isPreview;
    console.log("Order preview determination:", { 
      dbIsPreview: orderInfo?.is_preview, 
      planId: orderInfo?.plan_id, 
      paramIsPreview: isPreview,
      finalIsPreview: isPreviewOrder 
    });

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

    const criticalTerms = detectCriticalTerms(mandatoryWords);
    const missingPronunciations = criticalTerms.filter(
      term => !pronunciations.some(p => p.term === term)
    );

    // For preview orders, use simplified structure (verse + pre-chorus + chorus = ~1 minute)
    const previewStructure = ['verse', 'pre-chorus', 'chorus'];
    const effectiveStructure = isPreviewOrder ? previewStructure : structure;

    const structureTags = effectiveStructure.map(s => `[${s.charAt(0).toUpperCase() + s.slice(1)}]`).join(', ');

    const voiceTypeMap: Record<string, string> = {
      'masculina': 'voz masculina solo',
      'feminina': 'voz feminina solo',
      'dueto': 'dueto masculino e feminino',
      'dupla_masc': 'dupla masculina',
      'dupla_fem': 'dupla feminina',
      'coral': 'coral/grupo vocal'
    };
    const voiceDescription = voiceTypeMap[voiceType] || 'voz feminina solo';

    // PREVIEW: Use special prompt for ~1 minute preview (Verse + Pre-Chorus + Chorus)
    const systemPrompt = isPreviewOrder ? `Você é um letrista profissional brasileiro. Crie uma PRÉVIA de música (cerca de 1 minuto).

REGRAS CRÍTICAS PARA PREVIEW:
1. Gere APENAS a estrutura: [Verse] + [Pre-Chorus] + [Chorus]
2. O [Verse] deve ter 4-6 versos narrativos
3. O [Pre-Chorus] deve ter 2-4 versos de transição que preparam para o refrão
4. O [Chorus] deve ter 4-6 linhas - refrão memorável e fácil de cantar
5. NÃO inclua [Intro], [Bridge], [Outro], [Verse 2] ou outras seções
6. A música completa será ~1 minuto
7. Estilo musical: ${style}
8. Tipo de voz: ${voiceDescription}
9. Emoção: ${emotion}
10. ${!autoGenerateName && songName ? `TÍTULO OBRIGATÓRIO: "${songName}"` : 'CRIE UM TÍTULO CRIATIVO específico para esta história'}

⚠️ IMPORTANTE: Esta é uma PRÉVIA. Estrutura limitada mas completa!

FORMATO OBRIGATÓRIO:

TÍTULO DA MÚSICA

[Verse]
(4-6 versos narrativos)

[Pre-Chorus]
(2-4 versos de preparação para o refrão)

[Chorus]
(4-6 linhas - refrão principal, memorável)

[End]` : `Você é um letrista profissional brasileiro especializado em músicas personalizadas para ${musicType === 'parodia' ? 'paródias e humor' : musicType === 'corporativa' ? 'empresas e marketing' : 'momentos especiais'}.

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
10. ${autoGenerateName ? `CRIE UM TÍTULO CRIATIVO, ÚNICO E ESPECÍFICO para cada versão baseado na história fornecida. 
    REGRAS PARA O TÍTULO:
    - O título DEVE ser específico para esta história, NÃO genérico
    - Se mencionam nomes de pessoas, use-os no título (ex: "Pra Você, Maria", "João, Meu Herói")
    - Se é uma ocasião especial, referencie-a (ex: "Nossos 25 Anos", "O Dia Que Você Nasceu")
    - Se é homenagem, mencione a relação (ex: "Mãe, Minha Estrela", "Pai de Ouro")
    - NUNCA use títulos genéricos como "Música Especial", "Homenagem", "Para Você"
    - O título deve vir na PRIMEIRA LINHA, antes do [Intro]` : `⚠️ TÍTULO OBRIGATÓRIO: "${songName}"
    - NÃO crie ou invente outro título
    - Use EXATAMENTE este título em AMBAS as versões
    - Coloque este título na PRIMEIRA LINHA de cada versão, antes do [Intro]
    - Este título foi escolhido pelo usuário e DEVE ser respeitado`}
11. A música será cantada por ${voiceDescription}. Adapte o tom e as referências de gênero adequadamente.

⚠️⚠️⚠️ REGRAS OBRIGATÓRIAS DE FORMATAÇÃO (APLICAR EM TODAS AS SEÇÕES):

🔒 REGRA 1 — TELEFONES E NÚMEROS:
   - O DDD (prefixo de 2 dígitos) deve ser falado por extenso: 16 → "dezesseis", 54 → "cinquenta e quatro"
   - Os demais dígitos separados com hífen: 9-9-7-8-1-3-0-3-8
   - NUNCA escrever todos os números por extenso
   - Exemplo CORRETO: dezesseis, 9-9-7-8-1-3-0-3-8
   - Exemplo ERRADO: "um-seis-nove-nove..." ou "dezesseis... nove nove sete"

🌐 REGRA 2 — SITES E URLs:
   - Usar formato soletrado com hífens
   - www → w-w-w
   - .com → ponto-com
   - .br → ponto-b-r
   - Exemplo CORRETO: w-w-w-ponto-criandomusicas-ponto-com-ponto-b-r
   - Exemplo ERRADO: "www.criandomusicas.com.br" ou "cri-an-do, ponto com"

🔠 REGRA 3 — SIGLAS (2-4 letras):
   - Separar TODAS as letras com hífen
   - Manter letras em MAIÚSCULO
   - NUNCA usar fonética ("éfe", "ême", "ésse")
   - Exemplo CORRETO: F-M-E, A-Q-A, I-A
   - Exemplo ERRADO: "éfe-ême-é" ou "FME"

🎤 REGRA 4 — REDES SOCIAIS:
   - @ → arroba-
   - Exemplo CORRETO: arroba-pizzariadojoao
   - Exemplo ERRADO: "@pizzariadojoao" ou "arroba pizzaria do joão"

🚫 REGRA 5 — O QUE NUNCA FAZER:
   - NUNCA escrever "ésse", "éfe", "erre", "ême"
   - NUNCA separar sílabas de palavras comuns
   - NUNCA usar fonética explicativa
   - NUNCA misturar formatos

${hasMonologue ? `
⚠️ REGRA CRÍTICA DE MONÓLOGO:
- SEMPRE use a tag [monologue] ou [spoken word] para trechos declamados
- TODO o texto falado DEVE estar DENTRO dessa tag
- APLIQUE TODAS AS REGRAS DE FORMATAÇÃO também no monólogo!

✅ CORRETO:
[monologue]
"Ligue agora: 1-6-9-9-7-8-1-3-0-3-8!
Acesse w-w-w-ponto-criandomusicas-ponto-com-ponto-b-r.
A F-M-E te espera!"

❌ ERRADO:
[monologue]
"Ligue: dezesseis, nove nove sete... Acesse cri-an-do-mú-si-cas ponto bê-érre. A éfe-ême-é te espera!"
` : ''}

${musicType === 'corporativa' && hasMonologue ? `
⚠️ REGRAS ESPECIAIS PARA JINGLE/PROPAGANDA:
- O refrão deve ser MUITO simples, curto e fácil de memorizar
- O monólogo DEVE incluir TODAS as informações de contato
- CRÍTICO: Aplique as regras de formatação com hífen!

Exemplo de monólogo para jingle (CORRETO):
[monologue]
"Ligue agora: 3-1-9-9-8-7-5-8-8-8-8!
Pizzaria do João, Rua das Flores, 123, Centro.
Siga no Instagram arroba-pizzariadojoao!"
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
(texto declamado/falado COM PRONÚNCIAS FONÉTICAS - 2-4 frases entre aspas)

` : `[Bridge]
(2-4 versos de transição emocional)

`}[Chorus]
(repetição do refrão)

[Outro]
(2-4 versos de encerramento)${hasMonologue && monologuePosition === 'outro' ? `

[monologue]
(texto declamado final COM PRONÚNCIAS FONÉTICAS entre aspas)` : ''}`;

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
- ${autoGenerateName ? `IMPORTANTE SOBRE TÍTULOS:
  - Cada versão DEVE ter um título ÚNICO, CRIATIVO e ESPECÍFICO para esta história
  - Extraia nomes, datas, relações e momentos-chave da história para compor o título
  - Exemplo: Se a história menciona "minha avó Rosa que faz 80 anos", o título pode ser "Rosa, 80 Primaveras" ou "Vovó Rosa, Eterna Flor"
  - NÃO use títulos genéricos como "Música Para Você" ou "Homenagem Especial"` : `⚠️ TÍTULO OBRIGATÓRIO EM AMBAS AS VERSÕES: "${songName}"
  - NÃO invente outro título, use EXATAMENTE "${songName}"
  - Coloque "${songName}" como primeira linha de cada versão`}
- NÃO inclua comentários, explicações ou metadados
- APENAS as letras com as tags estruturadas`;

    console.log("Calling AI Gateway for lyrics generation...");

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

    console.log("Applying global pronunciation rules to all lyrics sections...");
    const processedBody1 = applyGlobalPronunciationRules(l1.body);
    const processedBody2 = applyGlobalPronunciationRules(l2.body);

    let phonetic1 = processedBody1;
    let phonetic2 = processedBody2;
    
    if (pronunciations.length > 0) {
      phonetic1 = applyPronunciations(processedBody1, pronunciations);
      phonetic2 = applyPronunciations(processedBody2, pronunciations);
    }

    const { data: insertedLyrics, error: insertError } = await supabase
      .from('lyrics')
      .insert([
        { 
          order_id: orderId, 
          version: 'A', 
          title: l1.title, 
          body: processedBody1,
          phonetic_body: phonetic1,
          is_approved: autoApprove,
          approved_at: autoApprove ? new Date().toISOString() : null
        },
        { 
          order_id: orderId, 
          version: 'B', 
          title: l2.title, 
          body: processedBody2,
          phonetic_body: phonetic2,
          is_approved: false 
        }
      ])
      .select();

    if (insertError) {
      console.error("Error inserting lyrics:", insertError);
    }

    const newStatus = autoApprove ? 'LYRICS_APPROVED' : 'LYRICS_GENERATED';
    
    const updateData: Record<string, unknown> = { 
      status: newStatus, 
      updated_at: new Date().toISOString(),
      voice_type: voiceType
    };
    
    if (autoApprove && insertedLyrics?.[0]?.id) {
      updateData.approved_lyric_id = insertedLyrics[0].id;
    }
    
    // IMPORTANT: Save AI-generated title to order.song_title if autoGenerateName was true
    // This ensures the admin can see the title even when user didn't provide one
    if (autoGenerateName && l1.title && l1.title !== "Música Personalizada") {
      updateData.song_title = l1.title;
      console.log("Saving AI-generated title to order:", l1.title);
    }
    
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
    
    if (autoApprove && insertedLyrics?.[0]) {
      console.log("Auto-approve mode: Triggering style prompt generation...");
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-style-prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            orderId,
            lyricId: insertedLyrics[0].id,
            approvedLyrics: processedBody1,
            isInstrumental: false,
            briefing: {
              ...briefing,
              voiceType
            }
          })
        });
        console.log("Style prompt generation triggered successfully");
      } catch (styleError) {
        console.error("Style prompt generation error:", styleError);
      }
    }

    if (orderInfo?.user_id && !autoApprove) {
      try {
        console.log("Sending push notification for lyrics ready...");
        
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            user_id: orderInfo.user_id,
            order_id: orderId,
            title: '✨ Letras prontas!',
            body: 'As letras da sua música foram geradas. Acesse para escolher sua favorita!',
            url: `/criar-musica?orderId=${orderId}`
          })
        });
        console.log("Push notification sent successfully");
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }
    } else if (autoApprove) {
      console.log("Skipping lyrics notification (autoApprove mode - direct to production)");
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
            text: processedBody1,
            phoneticText: phonetic1
          },
          { 
            id: insertedLyrics?.[1]?.id || 'lyric-b', 
            version: 'B', 
            title: l2.title, 
            text: processedBody2,
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

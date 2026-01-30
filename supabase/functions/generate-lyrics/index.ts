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
  // Padrões de telefone brasileiro
  const phonePatterns = [
    /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
    /\d{10,11}/g,
    /\d{2}[\s.-]\d{4,5}[\s.-]\d{4}/g
  ];
  
  let result = text;
  
  phonePatterns.forEach(pattern => {
    result = result.replace(pattern, (match) => {
      // Extrair apenas os dígitos
      const digits = match.replace(/\D/g, '');
      
      // Separar DDD (primeiros 2 dígitos) do resto
      const ddd = digits.slice(0, 2);
      const restDigits = digits.slice(2);
      
      // DDD por extenso, resto com hífen
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
  
  // URLs completas: www.nome.com.br
  result = result.replace(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})(\.[a-zA-Z]{2})?/gi, 
    (_match, _protocol, hasWww, name, ext1, ext2) => {
      const parts: string[] = [];
      
      // www → w-w-w
      if (hasWww) {
        parts.push('w-w-w');
      }
      
      // nome do site mantém junto (não soletrar palavras)
      parts.push(`ponto-${name.toLowerCase()}`);
      
      // extensão: com → ponto-com, br → ponto-b-r
      const extFormatted = ext1.toLowerCase() === 'br' ? 'b-r' : ext1.toLowerCase();
      parts.push(`ponto-${extFormatted}`);
      
      // extensão secundária: .br → ponto-b-r
      if (ext2) {
        const ext2Clean = ext2.replace('.', '').toLowerCase();
        const ext2Formatted = ext2Clean === 'br' ? 'b-r' : ext2Clean;
        parts.push(`ponto-${ext2Formatted}`);
      }
      
      return parts.join('-');
    }
  );
  
  // @handles → arroba-nome
  result = result.replace(/@([a-zA-Z0-9_]+)/g, (_match, handle) => {
    return `arroba-${handle.toLowerCase()}`;
  });
  
  return result;
}

// Soletrar siglas com hífens entre letras (sem fonética)
function convertAcronymsToHyphens(text: string): string {
  // Detectar siglas (2-4 letras maiúsculas seguidas)
  const acronymPattern = /\b([A-Z]{2,4})\b/g;
  
  // Lista de siglas que NÃO devem ser soletradas (pronunciadas como palavras)
  const keepAsWord = ['FIFA', 'NASA', 'PIX', 'SUS', 'SAMU', 'ENEM', 'VIP', 'LED'];
  
  return text.replace(acronymPattern, (match) => {
    // Se está na lista de palavras, manter como está
    if (keepAsWord.includes(match)) {
      return match;
    }
    
    // Soletrar letra por letra com hífen: FME → F-M-E
    return match.split('').join('-');
  });
}

// Aplicar TODAS as regras de formatação
function applyGlobalPronunciationRules(text: string): string {
  let result = text;
  
  // 1. Converter telefones para formato com hífens
  result = convertPhoneToHyphens(result);
  
  // 2. Converter URLs para formato soletrado
  result = convertUrlToHyphens(result);
  
  // 3. Converter siglas para letras com hífen
  result = convertAcronymsToHyphens(result);
  
  return result;
}

// Função removida - não usamos mais dicionário de pronúncias
// As conversões são feitas por regras de formatação com hífens

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
  
  // If title was provided by user, use it EXACTLY - no extraction from generated text
  if (providedTitle && providedTitle.trim()) {
    // Remove any AI-generated title from the body to avoid duplication
    let bodyLines = [...lines];
    
    // Check if first non-empty, non-tag line looks like an AI-generated title
    for (let i = 0; i < Math.min(5, bodyLines.length); i++) {
      const line = bodyLines[i];
      // Skip empty lines and structural tags
      if (!line || line.startsWith('[') || line.startsWith('#')) continue;
      
      // If this looks like a title line (short, not a verse), remove it
      if (line.length < 100 && !line.includes('\n')) {
        bodyLines = bodyLines.filter((_, idx) => idx !== i);
        break;
      }
    }
    
    return { title: providedTitle.trim(), body: bodyLines.join('\n').trim() };
  }
  
  // Auto-generate: Look for a title line (not a tag like [Intro])
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

    const systemPrompt = `Você é um letrista profissional brasileiro especializado em músicas personalizadas para ${musicType === 'parodia' ? 'paródias e humor' : musicType === 'corporativa' ? 'empresas e marketing' : 'momentos especiais'}.

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

    // APLICAR REGRAS GLOBAIS DE PRONÚNCIA em TODA a letra (todas as seções)
    console.log("Applying global pronunciation rules to all lyrics sections...");
    const processedBody1 = applyGlobalPronunciationRules(l1.body);
    const processedBody2 = applyGlobalPronunciationRules(l2.body);

    // Gerar versões fonéticas com pronúncias customizadas adicionais
    let phonetic1 = processedBody1;
    let phonetic2 = processedBody2;
    
    if (pronunciations.length > 0) {
      phonetic1 = applyPronunciations(processedBody1, pronunciations);
      phonetic2 = applyPronunciations(processedBody2, pronunciations);
    }

    // Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert lyrics with phonetic versions - use processedBody for display
    const { data: insertedLyrics, error: insertError } = await supabase
      .from('lyrics')
      .insert([
        { 
          order_id: orderId, 
          version: 'A', 
          title: l1.title, 
          body: processedBody1, // Body já com pronúncias globais aplicadas
          phonetic_body: phonetic1,
          is_approved: false 
        },
        { 
          order_id: orderId, 
          version: 'B', 
          title: l2.title, 
          body: processedBody2, // Body já com pronúncias globais aplicadas
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
            text: processedBody1, // Retorna texto já processado
            phoneticText: phonetic1
          },
          { 
            id: insertedLyrics?.[1]?.id || 'lyric-b', 
            version: 'B', 
            title: l2.title, 
            text: processedBody2, // Retorna texto já processado
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
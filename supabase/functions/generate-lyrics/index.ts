import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  // Motivational fields
  motivationalNarrative?: string;
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalPerspective?: string;
  // Corporate fields
  corporateFormat?: string;
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
    const { orderId, story, briefing, pronunciations = [], isPreview = false, autoApprove = false, audioInsert, isModification = false, language = 'pt-BR' } = await req.json() as {
      orderId?: string;
      story: string;
      briefing: BriefingData;
      pronunciations?: Pronunciation[];
      isPreview?: boolean;
      autoApprove?: boolean;
      audioInsert?: { section: string; mode: string; transcript: string };
      isModification?: boolean;
      language?: string;
    };

    // Standalone mode: no orderId needed (used by Audio Mode wizard)
    const isStandaloneMode = !orderId;
    console.log("generate-lyrics called with orderId:", orderId, "isPreview param:", isPreview, "autoApprove:", autoApprove, "standalone:", isStandaloneMode, "isModification:", isModification, "language:", language);

    if (!story) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campo obrigatório: story" }),
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
    
    let orderInfo: { is_preview?: boolean; plan_id?: string; user_id?: string } | null = null;
    
    if (!isStandaloneMode) {
      const { data: fetchedOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('is_preview, plan_id, user_id')
        .eq('id', orderId!)
        .single();
      
      if (orderFetchError) {
        console.error("Error fetching order:", orderFetchError);
      }
      orderInfo = fetchedOrder;
    }
    
    const isPreviewOrder = orderInfo?.is_preview === true || orderInfo?.plan_id === 'preview_test' || isPreview || isStandaloneMode;
    console.log("Order preview determination:", { 
      dbIsPreview: orderInfo?.is_preview, 
      planId: orderInfo?.plan_id, 
      paramIsPreview: isPreview,
      standalone: isStandaloneMode,
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
      voiceType = 'feminina',
      motivationalNarrative = '',
      motivationalMoment = '',
      motivationalIntensity = '',
      motivationalPerspective = '',
      corporateFormat = ''
    } = briefing || {};

    // Detectar se é "Chamada/Propaganda" corporativa (prioridade sobre monólogo motivacional)
    const isChamadaCorporativa = corporateFormat === 'monologo';
    console.log("Chamada Corporativa mode:", isChamadaCorporativa, "corporateFormat:", corporateFormat);

    // Detectar se é modo "Somente Monólogo" (spoken word motivacional) - NÃO ativar se for chamada corporativa
    const isSomenteMonologo = !isChamadaCorporativa && (motivationalNarrative === 'somente_monologo' || monologuePosition === 'full');
    console.log("Somente Monologo mode:", isSomenteMonologo, "motivationalNarrative:", motivationalNarrative);

    // ============ MODO SIMPLES AUTOMÁTICO ============
    // Ativar SOMENTE para pedidos preview (crédito de novo usuário) com texto curto
    // Pedidos pagos SEMPRE recebem letra completa, independente do tamanho do texto
    const storyLength = story?.trim()?.length || 0;
    const isSimpleMode = isPreviewOrder && storyLength > 0 && storyLength < 240;
    console.log("Simple Mode detection:", { storyLength, isSimpleMode, isPreviewOrder, storyPreview: story?.substring(0, 50) });

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
      'coral': 'coral/grupo vocal',
      'infantil_masc': 'voz infantil masculina (criança)',
      'infantil_fem': 'voz infantil feminina (criança)',
      'infantil-masculina': 'voz infantil masculina (criança)',
      'infantil-feminina': 'voz infantil feminina (criança)',
    };
    const voiceDescription = voiceTypeMap[voiceType] || 'voz feminina solo';

    // Map motivational moment to context
    const momentContextMap: Record<string, string> = {
      'treino': 'treino físico, academia, esforço corporal',
      'superacao': 'superação de obstáculos da vida',
      'estudo': 'foco nos estudos, disciplina mental',
      'trabalho': 'metas profissionais, carreira',
      'recomeco': 'levantar após dificuldades, novo começo',
      'disciplina': 'constância diária, rotina de sucesso'
    };
    const momentContext = momentContextMap[motivationalMoment] || 'superação pessoal';

    // Map motivational perspective
    const perspectiveMap: Record<string, string> = {
      'primeira_pessoa': 'primeira pessoa (EU) - protagonista da própria história',
      'mentor': 'mentor (VOCÊ) - falando diretamente ao ouvinte como um coach',
      'universal': 'universal - mensagem ampla que serve para todos'
    };
    const perspectiveContext = perspectiveMap[motivationalPerspective] || 'mentor (você)';

    // ========== PROMPT ESPECIAL PARA "100% FALADA" (SPOKEN WORD) ==========
    const isolationIdSpoken = `ORDER-${orderId || 'standalone'}-${Date.now()}`;
    
    // Language mapping for non-PT prompts
    const langMapSpoken: Record<string, string> = { 'en': 'inglês', 'es': 'espanhol', 'it': 'italiano' };
    const langNoteSpoken = language !== 'pt-BR' && langMapSpoken[language] ? `\n⚠️ IDIOMA: Escreva TODA a letra em ${langMapSpoken[language]}.` : '';
    
    const somenteMonologoPrompt = `[ISOLATION ID: ${isolationIdSpoken}]
⚠️ REGRA DE ISOLAMENTO: Este prompt é INDEPENDENTE. NÃO use informações de outros pedidos. Baseie-se EXCLUSIVAMENTE no contexto abaixo.
${langNoteSpoken}

Você é um escritor profissional de SPOKEN WORD motivacional brasileiro.

⚠️ ESTRUTURA OBRIGATÓRIA - 100% FALADA:
Esta música é 100% FALADA/DECLAMADA. NENHUM trecho cantado. Use APENAS a tag [monologue].

ESTRUTURA FIXA:
1. [Intro] - Abertura rápida (1-2 frases impactantes)
2. Bloco 1 - Contexto inicial (3-5 frases, apresentando o cenário)
3. Bloco 2 - Reforço/Conflito/Reflexão (3-5 frases, aprofundando)
4. Bloco 3 - Superação/Virada (3-5 frases, clímax emocional)
5. [Chorus] - Refrão MANTRA (frase forte, curta, repetível, tom afirmativo)
6. [End]

REGRAS CRÍTICAS:
- TUDO deve estar em [monologue] tags
- Use APENAS [monologue], NÃO numere como "Monologue 1", "Monologue 2"
- Deixe uma linha em branco entre cada bloco de [monologue]
- Tom de voz: direto, forte, como um mentor/treinador ou voz interior
- Frases CURTAS e impactantes
- Vocabulário de DISCIPLINA, CONSTÂNCIA, FORÇA
- EVITE: frases filosóficas vagas, clichês motivacionais genéricos
- O [Chorus] NÃO é cantado tradicionalmente, é uma FRASE-MANTRA falada com força

CONTEXTO PARA ESTA MÚSICA:
- Momento de uso: ${momentContext}
- Intensidade: ${motivationalIntensity || 'intensa'}
- Perspectiva: ${perspectiveContext}
- Emoção: ${emotion}

EXEMPLO DE ESTRUTURA (não copie literalmente, use como referência):

TÍTULO DA MÚSICA

[Intro]
[monologue]
"Respira.
Esse momento é só seu."

[monologue]
"Nem todo mundo vai acreditar em você.
E tá tudo bem.
O que importa é que você continue,
mesmo quando ninguém estiver olhando."

[monologue]
"Vai doer.
Vai cansar.
Mas cada passo que você dá em silêncio
está te afastando da versão que desistiu."

[monologue]
"Você não chegou até aqui por acaso.
Você sobreviveu.
Aprendeu.
E agora sabe que é mais forte
do que imaginava ser."

[Chorus]
[monologue]
"Continua.
Mesmo com medo.
Mesmo cansado.
Continua."

[End]

${!autoGenerateName && songName ? `⚠️ TÍTULO OBRIGATÓRIO: "${songName}"` : 'CRIE UM TÍTULO FORTE E MOTIVACIONAL'}
${mandatoryWords ? `Palavras/nomes OBRIGATÓRIOS: ${mandatoryWords}` : ''}
${restrictedWords ? `Palavras PROIBIDAS: ${restrictedWords}` : ''}`;

    // ============ PROMPT CHAMADA/PROPAGANDA CORPORATIVA ============
    const isolationIdChamada = `ORDER-${orderId || 'standalone'}-${Date.now()}`;
    const langNoteChamada = language !== 'pt-BR' && langMapSpoken[language] ? `\n⚠️ IDIOMA: Escreva TODO o texto em ${langMapSpoken[language]}.` : '';
    
    const chamadaCorporativaPrompt = `[ISOLATION ID: ${isolationIdChamada}]
⚠️ REGRA DE ISOLAMENTO: Este prompt é INDEPENDENTE. NÃO use informações de outros pedidos. Baseie-se EXCLUSIVAMENTE no contexto abaixo.
${langNoteChamada}

Você é um LOCUTOR PROFISSIONAL de rádio/carro de som brasileiro. Seu trabalho é criar CHAMADAS COMERCIAIS e PROPAGANDAS faladas.

⚠️ REGRA ABSOLUTA: ESTE É UM ANÚNCIO COMERCIAL, NÃO UMA MÚSICA MOTIVACIONAL.
- NÃO use vocabulário motivacional (superação, disciplina, força interior, jornada, etc.)
- NÃO transforme o conteúdo em discurso de coaching ou autoajuda
- NÃO invente histórias emocionais, metáforas ou mensagens filosóficas
- SEJA 100% COMERCIAL: preços, produtos, endereços, contatos, promoções

TOM DE VOZ:
- Locutor de rádio comercial / carro de som
- Animado, direto, persuasivo
- Frases curtas e chamativas
- Ênfase em promoções e urgência comercial

ESTRUTURA OBRIGATÓRIA (exatamente esta):

TÍTULO (nome do estabelecimento ou da promoção)

[Intro]
[monologue]
(texto COMPLETO da propaganda em UM ÚNICO BLOCO grande)

[End]

REGRAS CRÍTICAS:
1. 100% FALADO - NENHUM trecho cantado, NENHUMA melodia
2. UM ÚNICO bloco [monologue] - NÃO dividir em vários blocos
3. REPRODUZA FIELMENTE o texto/contexto que o usuário forneceu
4. Adicione apenas conectores naturais de propaganda: "Atenção!", "Aproveite!", "Não perca!", "Venha conferir!", "Corra!"
5. MANTENHA TODAS as informações de contato (telefone, endereço, Instagram, etc.)
6. Mantenha CURTO e DIRETO - máximo 15-20 frases
7. NÃO inclua [Verse], [Chorus], [Bridge] ou qualquer tag de música
8. NÃO inclua partes cantadas ou poéticas

⚠️⚠️⚠️ REGRAS DE FORMATAÇÃO PARA SUNO (OBRIGATÓRIAS):

🔒 TELEFONES: DDD por extenso + resto com hífens
   Exemplo: dezesseis, 9-9-7-8-1-3-0-3-8

🌐 SITES: w-w-w-ponto-nome-ponto-com-ponto-b-r

🔠 SIGLAS: letras com hífen (F-M-E)

🎤 REDES SOCIAIS: arroba-nomedoperfil

${mandatoryWords ? `Palavras/nomes OBRIGATÓRIOS: ${mandatoryWords}` : ''}
${restrictedWords ? `Palavras PROIBIDAS: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `TÍTULO: "${songName}"` : 'Use o nome do estabelecimento/promoção como título'}`;

    // ============ PROMPT MODO SIMPLES (ativado automaticamente para pedidos curtos) ============
    const langNoteSimple = language !== 'pt-BR' ? `\n⚠️ IDIOMA: Escreva TODA a letra em ${languageMap[language] || language}.` : '';
    const simpleModePrompt = `⚠️ REGRA DE ISOLAMENTO: Este prompt é INDEPENDENTE. NÃO use informações de outros pedidos. Baseie-se EXCLUSIVAMENTE no contexto abaixo.
${langNoteSimple}

Você deve criar uma letra SIMPLES, BONITA e COERENTE.

⚠️ IMPORTANTE: Este é um pedido SIMPLES de usuário comum.
NÃO transforme o conteúdo em poesia elaborada.
NÃO invente histórias paralelas, cenários irrelevantes ou objetos aleatórios.

REGRAS GERAIS:
- Linguagem CLARA, DIRETA e EMOCIONAL
- EVITAR metáforas abstratas, simbolismos ou imagens poéticas complexas
- NÃO exagerar em adjetivos
- Manter FOCO TOTAL no tema principal solicitado
- A letra deve soar NATURAL quando cantada
- Se o usuário forneceu uma frase específica, ela deve ser usada LITERALMENTE no refrão

🚫 EVITE COMPLETAMENTE:
- "luz da minha vida", "razão do meu ser", "estrela guia"
- "amor eterno", "sol que me aquece", "anjo da guarda"  
- "pedaço do céu", "presente de Deus", "meu porto seguro"
- Qualquer frase genérica que serviria para qualquer pessoa

ESTRUTURA OBRIGATÓRIA PARA MODO SIMPLES:

[Intro]
→ 2 a 4 linhas simples de ambientação emocional

[Verse 1]
→ 4 linhas objetivas, diretamente relacionadas ao tema

[Chorus]
→ Mensagem principal CLARA e FÁCIL de lembrar
→ 4-6 linhas curtas e diretas
→ Se houver frase específica do usuário, USE-A aqui

[Outro]
→ 2 a 4 linhas de encerramento emocional simples
→ Pode reforçar carinho, gratidão ou desejo positivo

[End]

ORIENTAÇÕES IMPORTANTES:
- A intro e o outro podem ter mais linhas para ajudar a fluidez musical
- O refrão deve ser CURTO, FORTE e DIRETO
- EVITAR repetição de ideias com palavras diferentes
- SIMPLICIDADE é PRIORIDADE ABSOLUTA

DADOS DA MÚSICA:
- Estilo musical: ${style}
- Tipo de voz: ${voiceDescription}
- Emoção: ${emotion}
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras proibidas: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `- TÍTULO OBRIGATÓRIO: "${songName}"` : '- Crie um título SIMPLES e DIRETO relacionado ao pedido'}

Se o pedido for simples, a letra DEVE ser simples.`;

    // PREVIEW: Use special prompt for ~1 minute preview (Verse + Pre-Chorus + Chorus)
    const langNotePreview = language !== 'pt-BR' ? `\n⚠️ IDIOMA: Escreva TODA a letra em ${languageMap[language] || language}.` : '';
    const previewPrompt = `⚠️ REGRA DE ISOLAMENTO: Este prompt é INDEPENDENTE. NÃO use informações de outros pedidos. Baseie-se EXCLUSIVAMENTE no contexto abaixo.
${langNotePreview}

Você é um letrista profissional brasileiro. Crie uma PRÉVIA de música (cerca de 1 minuto).

🚫 REGRAS ANTI-CLICHÊ (OBRIGATÓRIAS - PRIORIDADE MÁXIMA):
EVITE COMPLETAMENTE estas frases genéricas:
- "luz da minha vida", "razão do meu ser", "estrela guia", "meu porto seguro"
- "amor eterno", "sol que me aquece", "anjo da guarda", "meu tudo"
- "pedaço do céu", "presente de Deus", "benção divina", "tesouro precioso"
- "coração de ouro", "guerreira/guerreiro", "rainha/rei da minha vida"
- Qualquer frase que serviria para QUALQUER pessoa sem alteração

PRIORIZE SEMPRE (extraia da história):
- Detalhes ESPECÍFICOS: nome, idade, profissão, hobbies mencionados
- Memórias CONCRETAS: momentos, lugares, situações citadas na história
- Tom CONVERSACIONAL: como se estivesse falando diretamente com a pessoa
- Rimas CRIATIVAS: evite amor/dor, coração/paixão, vida/querida

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

[End]`;

    // ============ LANGUAGE MAPPING ============
    const languageMap: Record<string, string> = {
      'pt-BR': 'português brasileiro',
      'en': 'inglês (English)',
      'es': 'espanhol (Español)',
      'it': 'italiano (Italiano)',
    };
    const targetLanguage = languageMap[language] || 'português brasileiro';
    const languageInstruction = language !== 'pt-BR' 
      ? `\n\n⚠️ IDIOMA OBRIGATÓRIO: Escreva TODA a letra em ${targetLanguage}. NÃO use português. A letra INTEIRA deve estar em ${targetLanguage}.`
      : '';
    
    const isolationId = `ORDER-${orderId || 'standalone'}-${Date.now()}`;
    
    const fullSystemPrompt = `[ISOLATION ID: ${isolationId}]
⚠️ REGRA CRÍTICA DE ISOLAMENTO:
- Este prompt é 100% INDEPENDENTE de qualquer outro pedido
- NUNCA reutilize trechos, frases, títulos ou ideias de outras músicas
- NUNCA referencie informações que NÃO estejam na história abaixo
- Se você já gerou letras antes nesta sessão, IGNORE-AS completamente
- Cada música é ÚNICA e baseada EXCLUSIVAMENTE na história fornecida aqui
- PROIBIDO copiar ou parafrasear conteúdo de pedidos anteriores
${languageInstruction}

Você é um letrista profissional ${language !== 'pt-BR' ? `que escreve em ${targetLanguage}` : 'brasileiro'} especializado em músicas personalizadas para ${musicType === 'parodia' ? 'paródias e humor' : musicType === 'corporativa' ? 'empresas e marketing' : 'momentos especiais'}.

🚫 REGRAS ANTI-CLICHÊ (OBRIGATÓRIAS - PRIORIDADE MÁXIMA):
EVITE COMPLETAMENTE estas frases genéricas:
- "luz da minha vida", "razão do meu ser", "estrela guia", "meu porto seguro"
- "amor eterno", "sol que me aquece", "anjo da guarda", "meu tudo"
- "pedaço do céu", "presente de Deus", "benção divina", "tesouro precioso"
- "coração de ouro", "guerreira/guerreiro", "rainha/rei da minha vida"
- "sempre ao meu lado", "minha fortaleza", "meu refúgio"
- Qualquer frase que serviria para QUALQUER pessoa sem alteração

⚠️ REGRA ANTI-REPETIÇÃO (CRÍTICA):
- Cada música deve ser COMPLETAMENTE DIFERENTE de qualquer outra que você já criou
- NUNCA comece o [Verse 1] ou [Intro] com as mesmas palavras/padrão em músicas diferentes
- VARIE a estrutura de abertura: perguntas, exclamações, descrições de cena, diálogos, memórias
- Para estilo SERTANEJO: PROIBIDO começar com "Eu lembro", "Desde aquele dia", "Quando eu te vi", "Foi num dia", "Naquela noite"
  - Em vez disso, ALTERNE entre: cenas específicas, diálogos diretos, descrições sensoriais, metáforas rurais/urbanas únicas
- Para CADA versão, use uma abordagem narrativa DIFERENTE:
  - Versão A: pode começar pelo presente, olhando para trás
  - Versão B: pode começar por uma cena específica, um objeto, um cheiro, um som
- VARIE os esquemas de rima entre versões (ABAB, AABB, ABBA, livre)
- VARIE o comprimento dos versos: misture linhas curtas de impacto com linhas mais longas narrativas

PRIORIZE SEMPRE (extraia informações da história):
- Detalhes ESPECÍFICOS: nome, idade, profissão, hobbies, características únicas
- Memórias CONCRETAS: "aquele bolo de domingo", "suas plantas na varanda", "seu jeito de rir"
- Tom CONVERSACIONAL: como se estivesse falando diretamente com a pessoa
- Momentos REAIS: datas, lugares, situações específicas mencionadas
- Rimas CRIATIVAS: evite amor/dor, coração/paixão, vida/querida
- Frases que SÓ façam sentido para ESTA pessoa específica
- ORIGINALIDADE na primeira linha: a abertura define o tom, surpreenda o ouvinte

EXEMPLOS DE BOA ABERTURA (variada):
✅ "Mãe, lembra quando você ensinou a fazer pão?"
✅ "Seus 60 anos chegaram com aquele sorriso de sempre"
✅ "Na cozinha, o cheiro do café que só você sabe fazer"
✅ "Aquela foto no porta-retrato ainda me faz sorrir"
✅ "Três da tarde, sol de janeiro, você chegou sem avisar"
✅ "Se eu pudesse escolher de novo, te escolhia igual"

EXEMPLOS DE ABERTURA RUIM (repetitiva/genérica):
❌ "Você é a luz que me guia todos os dias"
❌ "Razão do meu viver, meu amor eterno"
❌ "Estrela que brilha no meu céu"
❌ "Eu lembro daquele dia que..." (início repetitivo)
❌ "Desde o primeiro dia que te vi..." (padrão batido)

REGRAS OBRIGATÓRIAS:
1. Gere APENAS a letra final, sem comentários, explicações ou metadados
2. Mantenha coerência narrativa - a história deve progredir logicamente do início ao fim
3. EVITE repetição excessiva de palavras ou ideias entre seções diferentes
4. Se o usuário forneceu pouco texto, mantenha simplicidade - NÃO invente fatos absurdos ou cenários irreais
5. ${hasMonologue ? `INCLUA OBRIGATORIAMENTE a tag [monologue] ou [spoken word] na seção ${monologuePosition}. O texto dentro dessa tag deve ser FALADO/DECLAMADO, NÃO cantado.` : 'NÃO inclua monólogo ou spoken word'}
6. ${mandatoryWords ? `Palavras/nomes OBRIGATÓRIOS que devem aparecer: ${mandatoryWords}` : 'Nenhuma palavra obrigatória específica'}
7. ${restrictedWords ? `Palavras/assuntos PROIBIDOS que NÃO podem aparecer: ${restrictedWords}` : 'Nenhuma restrição específica'}
8. Mantenha métrica e rima coerentes para canto
9. A letra deve ter entre 200-350 palavras para ~3-4 minutos de música
10. Capture a essência emocional da história fornecida
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

FORMATO DE SAÍDA OBRIGATÓRIO (estrutura para ~4 minutos):

TÍTULO DA MÚSICA (primeira linha, sem colchetes)

[Verse 1]
(4-6 versos narrativos, introduzindo a história)

[Chorus]
(4-6 versos - refrão principal, memorável e fácil de cantar)

[Verse 2]
(4-6 versos desenvolvendo a história, progredindo a narrativa)

[Chorus]
(repetição do refrão)

${hasMonologue && monologuePosition === 'bridge' ? `[monologue]
(texto declamado/falado - 2-4 frases entre aspas)
` : `[Bridge]
(2-4 versos de transição emocional, opcional mas recomendado)
`}
[Outro]
(2-4 versos de encerramento curto e emocional)

[End]${hasMonologue && monologuePosition === 'outro' ? `

[monologue]
(texto declamado final entre aspas)` : ''}`;

    // ============ SELEÇÃO DO PROMPT BASEADO NO MODO ============
    // Prioridade: 1. Chamada Corporativa → 2. Somente Monólogo → 3. Modo Simples → 4. Preview → 5. Completo
    const systemPrompt = isChamadaCorporativa
      ? chamadaCorporativaPrompt
      : isSomenteMonologo 
        ? somenteMonologoPrompt 
        : isSimpleMode 
          ? simpleModePrompt 
          : isPreviewOrder 
            ? previewPrompt 
            : fullSystemPrompt;
    
    const selectedMode = isChamadaCorporativa ? 'chamadaCorporativa' : isSomenteMonologo ? 'somenteMonologo' : isSimpleMode ? 'simpleMode' : isPreviewOrder ? 'preview' : 'full';
    console.log("Selected prompt mode:", { 
      isChamadaCorporativa,
      isSomenteMonologo, 
      isSimpleMode, 
      isPreviewOrder, 
      selectedMode
    });

    // ============ MODIFICATION MODE: Generate only 1 version ============
    const versionCount = isModification ? 'UMA versão MODIFICADA' : 'DUAS versões';
    const versionInstructions = isModification 
      ? `- Crie APENAS UMA versão modificada baseada nas instruções de ajuste do usuário
- NÃO use separador "---"
- NÃO divida em duas versões
- Retorne APENAS uma letra completa` 
      : `- Crie DUAS versões DIFERENTES mas baseadas na mesma história
- Separe as duas versões com uma linha contendo apenas: ---`;

    const userPrompt = isChamadaCorporativa ? `Crie ${versionCount} de CHAMADA/PROPAGANDA COMERCIAL.

⚠️ ISTO É UMA PROPAGANDA COMERCIAL, NÃO UM DISCURSO MOTIVACIONAL.

SCRIPT/CONTEXTO FORNECIDO PELO CLIENTE:
${story}

INSTRUÇÕES:
${versionInstructions}
- Reproduza FIELMENTE o conteúdo que o cliente forneceu
- Adicione apenas conectores comerciais naturais ("Atenção!", "Aproveite!", "Não perca!")
- NÃO invente histórias, emoções, mensagens motivacionais ou filosóficas
- Mantenha TODAS as informações de contato (telefone, endereço, preços, etc.)
- Tom de LOCUTOR COMERCIAL: animado, direto, persuasivo
- Use a estrutura: [Intro] → [monologue] (um único bloco grande) → [End]
- NENHUM trecho cantado, NENHUMA tag de música ([Verse], [Chorus], etc.)
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras proibidas: ${restrictedWords}` : ''}` : isSomenteMonologo ? `Crie ${versionCount} de SPOKEN WORD motivacional.

CONTEXTO DA MÚSICA:
${story}

DADOS ESPECÍFICOS:
- Momento de uso: ${momentContext}
- Emoção: ${emotion} (intensidade ${emotionIntensity}/5)
- Perspectiva: ${perspectiveContext}
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras/assuntos proibidos: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `- Nome obrigatório: ${songName}` : '- Crie títulos motivacionais fortes'}

INSTRUÇÕES:
${versionInstructions}
- Siga a estrutura: [Intro] → blocos de [monologue] → [Chorus] mantra → [End]
- TODOS os textos devem estar em [monologue] tags
- O [Chorus] deve ser uma frase-mantra CURTA, FORTE e REPETÍVEL
- NÃO inclua partes cantadas, é 100% spoken word
- Tom direto, frases curtas, vocabulário de força e disciplina` : isSimpleMode ? `Crie ${versionCount} de letra SIMPLES para uma música personalizada.

⚠️ MODO SIMPLES ATIVADO - Pedido curto do usuário

PEDIDO DO USUÁRIO:
${story}

DADOS DA MÚSICA:
- Estilo musical: ${style}
- Tipo de voz: ${voiceDescription}
- Emoção: ${emotion}
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras proibidas: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `- TÍTULO OBRIGATÓRIO: "${songName}"` : '- Crie um título simples e direto'}

INSTRUÇÕES PARA MODO SIMPLES:
${versionInstructions}
- NÃO invente histórias, cenários ou detalhes que o usuário não mencionou
- FOCO TOTAL no que foi pedido
- Letras CURTAS (máximo 100-150 palavras cada)
- Refrão DIRETO e MEMORÁVEL
- NÃO inclua comentários ou explicações` : `Crie ${versionCount} de letra completas para uma música personalizada.

DADOS DA MÚSICA:
- Tipo: ${musicType}
- Emoção principal: ${emotion} (intensidade ${emotionIntensity}/5)
- Estilo musical: ${style}
- Ritmo: ${rhythm}
- Atmosfera: ${atmosphere}
- Tipo de voz: ${voiceDescription}
- Estrutura desejada: ${structure.join(', ')}
- Incluir monólogo/declamação: ${hasMonologue ? 'SIM - na seção ' + monologuePosition : 'NÃO'}
${mandatoryWords ? `- Palavras/nomes obrigatórios: ${mandatoryWords}` : ''}
${restrictedWords ? `- Palavras/assuntos proibidos: ${restrictedWords}` : ''}
${!autoGenerateName && songName ? `- Nome da música: ${songName}` : '- Crie um título criativo para cada versão'}

HISTÓRIA/CONTEXTO BASE (use fielmente):
${story}

INSTRUÇÕES FINAIS:
${versionInstructions}
- Cada versão deve ser completa e independente
- As duas versões devem ter ABORDAGENS DIFERENTES: uma pode ser mais narrativa e outra mais emocional, uma pode começar pelo presente e outra pelo passado, uma pode usar rimas ABAB e outra AABB
- PROIBIDO: ambas as versões começarem com a mesma palavra ou estrutura similar na primeira linha
- ${autoGenerateName ? `IMPORTANTE SOBRE TÍTULOS:
  - Cada versão DEVE ter um título ÚNICO, CRIATIVO e ESPECÍFICO para esta história
  - NÃO use títulos genéricos como "Música Para Você" ou "Homenagem Especial"` : `⚠️ TÍTULO OBRIGATÓRIO: "${songName}"
  - NÃO invente outro título, use EXATAMENTE "${songName}"`}
- NÃO inclua comentários, explicações ou metadados
- APENAS as letras com as tags estruturadas`;

    // ============ ENRIQUECER PROMPT COM TRECHO DE ÁUDIO (audioInsert) ============
    let finalUserPrompt = isChamadaCorporativa
      ? userPrompt  // chamada corporativa has its own complete prompt
      : isSomenteMonologo 
        ? userPrompt  // somente monologo already has its own prompt
        : userPrompt;

    if (audioInsert?.transcript) {
      const sectionMap: Record<string, string> = {
        'VERSE': 'Verso',
        'CHORUS': 'Refrão',
        'INTRO_MONOLOGUE': 'Introdução falada (monólogo)',
        'BRIDGE': 'Ponte musical',
      };
      const sectionLabel = sectionMap[audioInsert.section] || audioInsert.section;
      const modeLabel = audioInsert.mode === 'keep_exact' 
        ? 'EXATAMENTE como transcrito, sem alterações' 
        : 'com pequenos ajustes de rima e fluidez, mantendo a essência';

      finalUserPrompt += `\n\n⚠️ TRECHO DE ÁUDIO OBRIGATÓRIO:
O usuário gravou/cantou o seguinte trecho que DEVE ser incorporado na letra:
"${audioInsert.transcript}"

INSTRUÇÕES SOBRE O TRECHO:
- Este trecho deve aparecer como: ${sectionLabel}
- Modo de uso: ${modeLabel}
- O restante da letra deve ser COESO e COMPLEMENTAR a este trecho
- NÃO repita o trecho em outras seções (a menos que seja o refrão)
- A letra completa deve fluir NATURALMENTE com o trecho inserido
- Mantenha o mesmo tom e tema do trecho ao criar as outras partes`;
    }

    console.log("Calling AI Gateway for lyrics generation...", audioInsert ? "(with audio insert)" : "");

    // GPT-5 is a reasoning model - needs high max_completion_tokens (includes internal reasoning)
    // Timeout after 90 seconds to avoid hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("AI Gateway request timeout after 90 seconds");
      controller.abort();
    }, 90000);
    
    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.2",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: finalUserPrompt }
          ],
          max_completion_tokens: 16000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("AI Gateway fetch error:", errorMsg);
      
      if (errorMsg.includes('abort')) {
        return new Response(
          JSON.stringify({ ok: false, error: "Tempo limite excedido. A IA demorou muito para responder. Tente novamente." }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ ok: false, error: `Erro de conexão com IA: ${errorMsg}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    clearTimeout(timeoutId);
    console.log("AI Gateway response status:", response.status);

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

    // ============ PROCESS LYRICS BASED ON MODE ============
    let lyricsToInsert: Array<{
      order_id: string;
      version: string;
      title: string;
      body: string;
      phonetic_body: string;
      is_approved: boolean;
      approved_at: string | null;
    }> = [];
    
    let lyricsResponse: Array<{
      id: string;
      version: string;
      title: string;
      text: string;
      phoneticText: string;
    }> = [];

    if (isModification) {
      // MODIFICATION MODE: Only 1 version, no splitting
      console.log("Modification mode: processing single version");
      const l1 = extractTitleAndBody(content, autoGenerateName ? undefined : songName);
      const processedBody1 = applyGlobalPronunciationRules(l1.body);
      let phonetic1 = processedBody1;
      if (pronunciations.length > 0) {
        phonetic1 = applyPronunciations(processedBody1, pronunciations);
      }
      
      if (!isStandaloneMode && orderId) {
        lyricsToInsert = [{
          order_id: orderId,
          version: 'M',
          title: l1.title,
          body: processedBody1,
          phonetic_body: phonetic1,
          is_approved: false,
          approved_at: null
        }];
      }
      
      lyricsResponse = [{
        id: 'lyric-modified',
        version: 'M',
        title: l1.title,
        text: processedBody1,
        phoneticText: phonetic1
      }];
    } else {
      // NORMAL MODE: 2 versions
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
      
      if (!isStandaloneMode && orderId) {
        lyricsToInsert = [
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
            is_approved: false,
            approved_at: null
          }
        ];
      }
      
      lyricsResponse = [
        {
          id: 'lyric-a',
          version: 'A',
          title: l1.title,
          text: processedBody1,
          phoneticText: phonetic1
        },
        {
          id: 'lyric-b',
          version: 'B',
          title: l2.title,
          text: processedBody2,
          phoneticText: phonetic2
        }
      ];
    }

    // ============ DB OPERATIONS (skip in standalone mode) ============
    let insertedLyrics: { id: string }[] | null = null;
    
    if (!isStandaloneMode && lyricsToInsert.length > 0) {
      const { data: dbLyrics, error: insertError } = await supabase
        .from('lyrics')
        .insert(lyricsToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting lyrics:", insertError);
      }
      insertedLyrics = dbLyrics;

      // Update response IDs with actual DB IDs
      if (insertedLyrics) {
        lyricsResponse = lyricsResponse.map((lr, idx) => ({
          ...lr,
          id: insertedLyrics![idx]?.id || lr.id
        }));
      }

      const newStatus = autoApprove ? 'LYRICS_APPROVED' : (isModification ? 'LYRICS_GENERATED' : 'LYRICS_GENERATED');
      
      const updateData: Record<string, unknown> = { 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        voice_type: voiceType
      };
      
      if (autoApprove && insertedLyrics?.[0]?.id) {
        updateData.approved_lyric_id = insertedLyrics[0].id;
      }
      
      if (!isModification && autoGenerateName && lyricsResponse[0]?.title && lyricsResponse[0].title !== "Música Personalizada") {
        updateData.song_title = lyricsResponse[0].title;
        console.log("Saving AI-generated title to order:", lyricsResponse[0].title);
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
    } else {
      console.log("Standalone mode: skipping DB operations (no orderId)");
    }
    
    if (!isStandaloneMode && !isModification && autoApprove && insertedLyrics?.[0]) {
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
            approvedLyrics: lyricsResponse[0].text,
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

    if (!isStandaloneMode && !isModification && orderInfo?.user_id && !autoApprove) {
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
    } else if (!isStandaloneMode && autoApprove) {
      console.log("Skipping lyrics notification (autoApprove mode - direct to production)");
    }

    console.log("Lyrics saved successfully, count:", lyricsResponse.length);

    return new Response(
      JSON.stringify({
        ok: true,
        message: isModification ? "Letra modificada gerada com sucesso" : "Letras geradas com sucesso",
        lyrics: lyricsResponse,
        criticalTerms: missingPronunciations,
        usedModel: "openai/gpt-5.2"
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

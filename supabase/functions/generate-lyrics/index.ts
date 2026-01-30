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

// ============ FUNÇÕES DE CONVERSÃO FONÉTICA GLOBAL ============

// Dicionário de dígitos para palavras
const DIGIT_TO_WORD: Record<string, string> = {
  '0': 'zero', '1': 'um', '2': 'dois', '3': 'três', '4': 'quatro',
  '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove'
};

// Dicionário de letras para pronúncia
const LETTER_PRONUNCIATION: Record<string, string> = {
  'A': 'á', 'B': 'bê', 'C': 'cê', 'D': 'dê', 'E': 'é',
  'F': 'éfe', 'G': 'gê', 'H': 'agá', 'I': 'í', 'J': 'jota',
  'K': 'cá', 'L': 'éle', 'M': 'ême', 'N': 'ene', 'O': 'ó',
  'P': 'pê', 'Q': 'quê', 'R': 'érre', 'S': 'ésse', 'T': 'tê',
  'U': 'u', 'V': 'vê', 'W': 'dáblio', 'X': 'xis', 'Y': 'ípsilon',
  'Z': 'zê'
};

// Converter telefone para leitura verbal dígito por dígito
function convertPhoneToVerbal(text: string): string {
  // Padrões de telefone brasileiro: (XX) XXXXX-XXXX, XX XXXXXXXXX, etc.
  const phonePatterns = [
    /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,  // (11) 99999-9999
    /\d{10,11}/g,                               // 11999999999
    /\d{2}[\s.-]\d{4,5}[\s.-]\d{4}/g           // 11 99999-9999
  ];
  
  let result = text;
  
  phonePatterns.forEach(pattern => {
    result = result.replace(pattern, (match) => {
      // Extrair apenas os dígitos
      const digits = match.replace(/\D/g, '');
      
      // Converter para leitura verbal com grupos e pausas
      if (digits.length === 10 || digits.length === 11) {
        const ddd = digits.substring(0, 2);
        const rest = digits.substring(2);
        
        // DDD como número (não dígito por dígito)
        const dddWord = parseInt(ddd) < 20 
          ? ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'][parseInt(ddd)]
          : (parseInt(ddd) < 30 ? 'vinte' + (parseInt(ddd) % 10 > 0 ? ' e ' + DIGIT_TO_WORD[String(parseInt(ddd) % 10)] : '') : String(parseInt(ddd)));
        
        // Resto dígito por dígito com pausas naturais
        const groups: string[] = [];
        for (let i = 0; i < rest.length; i += 3) {
          const group = rest.substring(i, Math.min(i + 3, rest.length));
          const words = group.split('').map(d => DIGIT_TO_WORD[d]).join(' ');
          groups.push(words);
        }
        
        return `${dddWord}...\n${groups.join('...\n')}`;
      }
      
      // Fallback: converter cada dígito
      return digits.split('').map(d => DIGIT_TO_WORD[d]).join(' ');
    });
  });
  
  return result;
}

// Converter URLs para leitura fonética
function convertUrlToVerbal(text: string): string {
  // Padrões de URL
  const urlPatterns = [
    /(https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})(\.[a-zA-Z]{2})?/gi,
    /@([a-zA-Z0-9_]+)/g  // @handles de redes sociais
  ];
  
  let result = text;
  
  // URLs completas
  result = result.replace(urlPatterns[0], (_match, _protocol, name, ext1, ext2) => {
    // Converter nome do site (separar camelCase e hífens)
    const nameWords = name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[-_]/g, ' ')
      .toLowerCase();
    
    // Converter extensões
    const extMap: Record<string, string> = {
      'com': 'ponto com', 'br': 'ponto bê-érre', 'org': 'ponto órg',
      'net': 'ponto nét', 'gov': 'ponto gôv', 'edu': 'ponto edu',
      'io': 'ponto ai-ó', 'co': 'ponto cê-ó'
    };
    
    const ext1Verbal = extMap[ext1.toLowerCase()] || `ponto ${ext1}`;
    const ext2Verbal = ext2 ? `, ${extMap[ext2.replace('.', '').toLowerCase()] || `ponto ${ext2.replace('.', '')}`}` : '';
    
    return `${nameWords},\n${ext1Verbal}${ext2Verbal}`;
  });
  
  // @handles
  result = result.replace(urlPatterns[1], (_match, handle) => {
    return `arroba ${handle.toLowerCase()}`;
  });
  
  return result;
}

// Soletrar siglas de 2-4 letras maiúsculas
function spellOutAcronyms(text: string): string {
  // Detectar siglas (2-4 letras maiúsculas seguidas, não no dicionário)
  const acronymPattern = /\b([A-Z]{2,4})\b/g;
  
  return text.replace(acronymPattern, (match) => {
    // Verificar se já está no dicionário
    if (BRAZILIAN_PRONUNCIATIONS[match]) {
      return BRAZILIAN_PRONUNCIATIONS[match];
    }
    
    // Soletrar letra por letra com pausas
    return match.split('').map(letter => LETTER_PRONUNCIATION[letter] || letter).join('... ');
  });
}

// Aplicar TODAS as regras de pronúncia globalmente
function applyGlobalPronunciationRules(text: string): string {
  let result = text;
  
  // 1. Converter telefones para leitura verbal
  result = convertPhoneToVerbal(result);
  
  // 2. Converter URLs para leitura fonética
  result = convertUrlToVerbal(result);
  
  // 3. Soletrar siglas não conhecidas
  result = spellOutAcronyms(result);
  
  // 4. Aplicar pronúncias conhecidas do dicionário
  Object.entries(BRAZILIAN_PRONUNCIATIONS).forEach(([term, phonetic]) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, phonetic);
  });
  
  return result;
}

// Aplicar pronúncias conhecidas automaticamente
function applyKnownPronunciations(terms: string[]): Pronunciation[] {
  return terms
    .filter(term => BRAZILIAN_PRONUNCIATIONS[term])
    .map(term => ({ term, phonetic: BRAZILIAN_PRONUNCIATIONS[term] }));
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

⚠️⚠️⚠️ REGRAS CRÍTICAS DE PRONÚNCIA FONÉTICA (APLICAR EM TODAS AS SEÇÕES: [Intro], [Verse], [Chorus], [Bridge], [Outro], [monologue], [spoken word]):

1. TELEFONES E NÚMEROS:
   - NUNCA escreva números em formato numérico (ex: 16 997813038)
   - SEMPRE converta para leitura verbal dígito por dígito com pausas naturais
   - Use reticências (...) ou quebras de linha para separar grupos
   - Exemplo CORRETO: "dezesseis... nove nove sete oito um... três zero três oito"
   - Exemplo ERRADO: "16 997813038"

2. SITES, DOMÍNIOS E URLs:
   - NUNCA escreva URLs técnicas (ex: www.site.com.br)
   - SEMPRE converta para leitura fonética verbal separando nome e extensões
   - Exemplo CORRETO: "me-cuido-perfumes, ponto com, ponto bê-érre"
   - Exemplo ERRADO: "www.mecuidoperfumes.com.br"

3. SIGLAS E ACRÔNIMOS (2-4 letras):
   - SEMPRE soletra letra por letra com pausas
   - Use pontos ou reticências para separar
   - Exemplo CORRETO: "éfe... ême... é" ou "F. M. E."
   - Exemplo ERRADO: "FME"

4. REDES SOCIAIS (@handles):
   - Converta @ para "arroba"
   - Exemplo CORRETO: "arroba pizzariadojoao"
   - Exemplo ERRADO: "@pizzariadojoao"

${hasMonologue ? `
⚠️ REGRA CRÍTICA DE MONÓLOGO:
- SEMPRE use a tag [monologue] ou [spoken word] para trechos declamados
- TODO o texto falado DEVE estar DENTRO dessa tag
- NUNCA trate declamação como verso cantado
- NUNCA misture declamação com outras seções
- APLIQUE TODAS AS REGRAS DE PRONÚNCIA FONÉTICA também no monólogo!

✅ CORRETO:
[monologue]
"Ligue agora: dezesseis...
nove nove sete oito um...
três zero três oito!
Acesse me-cuido-perfumes,
ponto com, ponto bê-érre."

❌ ERRADO:
[monologue]
"Ligue agora: 16 997813038! Acesse www.mecuidoperfumes.com.br"
` : ''}

${musicType === 'corporativa' && hasMonologue ? `
⚠️ REGRAS ESPECIAIS PARA JINGLE/PROPAGANDA:
- Esta é uma música PUBLICITÁRIA para marketing
- O refrão deve ser MUITO simples, curto e fácil de memorizar (estilo "pegajoso")
- Use frases diretas e marcantes para máximo impacto publicitário
- O monólogo DEVE incluir TODAS as informações de contato fornecidas na história
- CRÍTICO: Converta TODOS os telefones, sites e siglas para formato fonético!
- O monólogo deve soar como um LOCUTOR DE RÁDIO/TV profissional
- Inclua a chamada para ação de forma clara e convincente
- Estrutura ideal para jingle:
  [Intro] - gancho musical curto
  [Chorus] - refrão memorável e repetitivo (2-4 linhas)
  [Verse 1] - apresentação da empresa/serviço
  [Chorus] - repetição do refrão
  [monologue] - informações de contato (FONÉTICAS!) faladas pelo locutor
  [Outro] - refrão final ou gancho

Exemplo de monólogo para jingle (CORRETO):
[monologue]
"Ligue agora mesmo: onze...
nove nove nove nove nove...
nove nove nove nove!
Pizzaria do João, Rua das Flores, cento e vinte e três, Centro.
Entrega grátis para toda a cidade!
Siga no Instagram arroba pizzariadojoao!"
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
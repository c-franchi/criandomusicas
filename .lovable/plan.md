

# Sistema Especializado de Briefing para Músicas Motivacionais

## Visão Geral

Criar um fluxo dedicado e otimizado para músicas motivacionais que captura informações específicas desse gênero, com perguntas personalizadas, fallbacks inteligentes e geração de letras focadas em superação, disciplina e vitória.

```text
┌────────────────────────────────────────────────────────────────────┐
│                 FLUXO MOTIVACIONAL ESPECIALIZADO                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Usuário seleciona "💪 Motivacional" no musicType                  │
│                          ↓                                          │
│  Sistema detecta e ATIVA fluxo motivacional específico:            │
│                                                                    │
│  1️⃣ MOMENTO DE USO                                                 │
│     Treino | Superação | Estudo | Trabalho | Recomeço | Disciplina │
│                          ↓                                          │
│  2️⃣ EMOÇÃO PRINCIPAL (motivacional)                                │
│     Determinação | Confiança | Força Interior | Coragem | Foco     │
│                          ↓                                          │
│  3️⃣ INTENSIDADE                                                    │
│     Calma e inspiradora | Crescente | Intensa | Agressiva          │
│                          ↓                                          │
│  4️⃣ ESTILO MUSICAL (fallback inteligente)                          │
│     Rock | Rap | Trap | Hip Hop | Eletrônica Épica | Lo-fi         │
│                          ↓                                          │
│  5️⃣ FORMA DE ENTREGA                                               │
│     Cantada | Cantada + Monólogos | Mais falada | Narrador         │
│     → Se inclui fala: força hasMonologue = true                    │
│                          ↓                                          │
│  6️⃣ PERSPECTIVA                                                    │
│     Primeira pessoa (eu) | Mentor (você) | Universal               │
│                          ↓                                          │
│  7️⃣ CONTEXTO/HISTÓRIA                                              │
│     Descreva para quem é, ocasião, objetivo...                     │
│                          ↓                                          │
│  8️⃣ PALAVRAS-CHAVE (opcional)                                      │
│     disciplina, foco, vencer, honra, dor, vitória...               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura

### 1. Novos Campos no BriefingFormData

```typescript
interface BriefingFormData {
  // ... campos existentes
  
  // Novos campos EXCLUSIVOS para fluxo motivacional
  motivationalMoment?: string;      // treino, superacao, estudo, trabalho, recomeco, disciplina
  motivationalIntensity?: string;   // calma, crescente, intensa, agressiva
  motivationalNarrative?: string;   // cantada, cantada_monologue, mais_falada, narrador
  motivationalPerspective?: string; // primeira_pessoa, mentor, universal
}
```

### 2. Novas Opções Traduzidas (useBriefingTranslations.ts)

```typescript
// Momento de uso da música motivacional
const motivationalMomentOptions = [
  { id: "treino", label: t('steps.motivational.moment.treino'), description: t('steps.motivational.moment.treinoDesc') },
  { id: "superacao", label: t('steps.motivational.moment.superacao'), description: t('steps.motivational.moment.superacaoDesc') },
  { id: "estudo", label: t('steps.motivational.moment.estudo'), description: t('steps.motivational.moment.estudoDesc') },
  { id: "trabalho", label: t('steps.motivational.moment.trabalho'), description: t('steps.motivational.moment.trabalhoDesc') },
  { id: "recomeco", label: t('steps.motivational.moment.recomeco'), description: t('steps.motivational.moment.recomecoDesc') },
  { id: "disciplina", label: t('steps.motivational.moment.disciplina'), description: t('steps.motivational.moment.disciplinaDesc') },
];

// Emoções específicas motivacionais
const motivationalEmotionOptions = [
  { id: "determinacao", label: t('steps.motivational.emotion.determinacao') },
  { id: "confianca", label: t('steps.motivational.emotion.confianca') },
  { id: "forca_interior", label: t('steps.motivational.emotion.forcaInterior') },
  { id: "coragem", label: t('steps.motivational.emotion.coragem') },
  { id: "foco", label: t('steps.motivational.emotion.foco') },
  { id: "vitoria", label: t('steps.motivational.emotion.vitoria') },
  { id: "superacao_dor", label: t('steps.motivational.emotion.superacaoDor') },
];

// Intensidade da música
const motivationalIntensityOptions = [
  { id: "calma", label: t('steps.motivational.intensity.calma'), description: t('steps.motivational.intensity.calmaDesc') },
  { id: "crescente", label: t('steps.motivational.intensity.crescente'), description: t('steps.motivational.intensity.crescenteDesc') },
  { id: "intensa", label: t('steps.motivational.intensity.intensa'), description: t('steps.motivational.intensity.intensaDesc') },
  { id: "agressiva", label: t('steps.motivational.intensity.agressiva'), description: t('steps.motivational.intensity.agressivaDesc') },
];

// Forma de entrega
const motivationalNarrativeOptions = [
  { id: "cantada", label: t('steps.motivational.narrative.cantada') },
  { id: "cantada_monologue", label: t('steps.motivational.narrative.cantadaMonologue') },
  { id: "mais_falada", label: t('steps.motivational.narrative.maisFalada') },
  { id: "narrador", label: t('steps.motivational.narrative.narrador') },
];

// Perspectiva
const motivationalPerspectiveOptions = [
  { id: "primeira_pessoa", label: t('steps.motivational.perspective.primeiraPessoa'), description: t('steps.motivational.perspective.primeiraPessoaDesc') },
  { id: "mentor", label: t('steps.motivational.perspective.mentor'), description: t('steps.motivational.perspective.mentorDesc') },
  { id: "universal", label: t('steps.motivational.perspective.universal'), description: t('steps.motivational.perspective.universalDesc') },
];

// Estilos musicais motivacionais (com fallback inteligente)
const motivationalStyleOptions = [
  { id: "rock_motivacional", label: t('steps.motivational.style.rock') },
  { id: "rap_motivacional", label: t('steps.motivational.style.rap') },
  { id: "trap_motivacional", label: t('steps.motivational.style.trap') },
  { id: "hiphop_classico", label: t('steps.motivational.style.hiphop') },
  { id: "eletronica_epica", label: t('steps.motivational.style.eletronica') },
  { id: "lofi_motivacional", label: t('steps.motivational.style.lofi') },
  { id: "auto", label: t('steps.motivational.style.auto') },
];
```

### 3. Novo Fluxo no chatFlow (Briefing.tsx)

Adicionar steps 40-49 para o fluxo motivacional:

| Index | Campo | Descrição |
|-------|-------|-----------|
| 40 | motivationalMoment | Momento de uso (treino, estudo, etc.) |
| 41 | emotion (motivacional) | Emoção específica motivacional |
| 42 | motivationalIntensity | Intensidade (calma → agressiva) |
| 43 | style (motivacional) | Estilo musical com fallback |
| 44 | motivationalNarrative | Forma de entrega (cantada, monólogo) |
| 45 | motivationalPerspective | Perspectiva (eu, você, universal) |
| 46 | story | Contexto/história |
| 47 | mandatoryWords | Palavras-chave (opcional) |
| 48 | voiceType | Tipo de voz |
| 49 | autoGenerateName | Nome automático ou manual |

### 4. Fallback Inteligente para Estilo Musical

```typescript
// Se usuário escolher "auto" para estilo, aplicar lógica:
const getMotivationalStyleFallback = (moment: string, intensity: string): string => {
  // Treino + agressiva → Rock ou Trap
  if ((moment === 'treino' && (intensity === 'intensa' || intensity === 'agressiva'))) {
    return Math.random() > 0.5 ? 'rock_motivacional' : 'trap_motivacional';
  }
  
  // Estudo + calma → Lo-fi
  if (moment === 'estudo' && intensity === 'calma') {
    return 'lofi_motivacional';
  }
  
  // Superação + crescente → Rap ou Eletrônica Épica
  if (moment === 'superacao' && intensity === 'crescente') {
    return Math.random() > 0.5 ? 'rap_motivacional' : 'eletronica_epica';
  }
  
  // Default: Rap motivacional (mais versátil)
  return 'rap_motivacional';
};
```

### 5. Lógica de Navegação (getNextStep)

```typescript
// Após Step 1 (musicType)
if (current === 1 && data.musicType === 'motivacional') {
  return 40; // Vai para fluxo motivacional
}

// Fluxo motivacional (40-49)
if (data.musicType === 'motivacional') {
  if (current === 40) return 41; // moment → emotion
  if (current === 41) return 42; // emotion → intensity
  if (current === 42) return 43; // intensity → style
  if (current === 43) return 44; // style → narrative
  if (current === 44) {
    // Se narrativa inclui fala, forçar monólogo
    if (['cantada_monologue', 'mais_falada', 'narrador'].includes(data.motivationalNarrative)) {
      data.hasMonologue = true;
      data.monologuePosition = 'bridge'; // ou 'outro'
    }
    return 45; // narrative → perspective
  }
  if (current === 45) return 46; // perspective → story
  if (current === 46) return 47; // story → mandatoryWords
  if (current === 47) return 48; // mandatoryWords → voiceType
  if (current === 48) return 49; // voiceType → autoGenerateName
  if (current === 49) {
    return data.autoGenerateName ? 100 : 19; // confirmação ou nome manual
  }
}
```

---

## Modificações na Edge Function generate-lyrics

### System Prompt Especializado para Motivacional

Quando `musicType === 'motivacional'`, injetar prompt especializado:

```typescript
const motivationalSystemPrompt = `
Você é um letrista profissional especializado em músicas motivacionais para superação, 
disciplina, foco, performance, evolução pessoal e vitória.

🧠 CONTEXTO DA MÚSICA:
- Momento de uso: ${briefing.motivationalMoment || 'superacao'}
- Emoção principal: ${briefing.emotion}
- Intensidade: ${briefing.motivationalIntensity || 'crescente'}
- Perspectiva: ${briefing.motivationalPerspective || 'primeira_pessoa'}

🎼 ESTRUTURA OBRIGATÓRIA:
[Intro] - Instrumental ou ambientação
[Verse 1] - Narrativa inicial
[Chorus] - Refrão impactante e memorável
[Verse 2] - Desenvolvimento
${briefing.hasMonologue ? `[monologue] - Texto FALADO entre aspas (2-5 frases curtas, tom de mentor/treinador)` : '[Bridge] - Transição emocional'}
[Chorus] - Repetição do refrão
[Outro] - Encerramento épico
${briefing.hasMonologue && briefing.monologuePosition === 'outro' ? `[monologue] - Mensagem final motivacional FALADA` : ''}
[End]

🔥 REGRAS DOS MONÓLOGOS MOTIVACIONAIS:
- Entre 2 e 5 frases CURTAS
- Linguagem DIRETA e FORTE
- Tom de treinador, mentor ou voz interior
- Incentivar: disciplina, continuidade, foco
- EVITAR frases filosóficas vagas

Exemplo de tom (NÃO copiar literalmente):
"Continua.
Mesmo cansado.
É aqui que a força nasce."

⚠️ REGRAS DE INTENSIDADE:
${briefing.motivationalIntensity === 'calma' ? '- Frases LONGAS, tom INSPIRADOR, ritmo LENTO' : ''}
${briefing.motivationalIntensity === 'crescente' ? '- Intro REFLEXIVA, refrão EXPLOSIVO, crescendo gradual' : ''}
${briefing.motivationalIntensity === 'intensa' ? '- Alta energia do início ao fim' : ''}
${briefing.motivationalIntensity === 'agressiva' ? '- Frases CURTAS, vocabulário FORTE, ritmo ACELERADO' : ''}

⚠️ PERSPECTIVA:
${briefing.motivationalPerspective === 'primeira_pessoa' ? '- Use "eu", "minha", "meu" - protagonista da própria história' : ''}
${briefing.motivationalPerspective === 'mentor' ? '- Use "você", "sua", "seu" - como mentor falando com o ouvinte' : ''}
${briefing.motivationalPerspective === 'universal' ? '- Mensagem ampla, aplicável a qualquer pessoa' : ''}
`;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Adicionar steps 40-49, lógica de navegação motivacional, fallback de estilo |
| `src/hooks/useBriefingTranslations.ts` | Adicionar todas as novas opções motivacionais |
| `public/locales/pt-BR/briefing.json` | Traduções em português |
| `public/locales/en/briefing.json` | Traduções em inglês |
| `public/locales/es/briefing.json` | Traduções em espanhol |
| `public/locales/it/briefing.json` | Traduções em italiano |
| `supabase/functions/generate-lyrics/index.ts` | Prompt especializado para motivacional |
| `supabase/functions/generate-style-prompt/index.ts` | Style prompt para estilos motivacionais |

---

## Traduções (pt-BR)

```json
{
  "steps": {
    "motivational": {
      "intro": "💪 Vamos criar sua música motivacional!\n\nEsse tipo de música é perfeito para superação, treino, foco e conquistas.",
      "moment": {
        "question": "Para qual momento essa música será usada?",
        "treino": "🏋️ Treino / Academia",
        "treinoDesc": "Esforço físico, repetição, persistência",
        "superacao": "🏆 Superação Pessoal",
        "superacaoDesc": "Vencer obstáculos da vida",
        "estudo": "📚 Estudo / Foco",
        "estudoDesc": "Concentração, disciplina mental",
        "trabalho": "💼 Trabalho / Produtividade",
        "trabalhoDesc": "Metas profissionais, performance",
        "recomeco": "🌅 Recomeço",
        "recomecoDesc": "Levantar após dificuldades",
        "disciplina": "⏰ Disciplina / Constância",
        "disciplinaDesc": "Manter o foco diário"
      },
      "emotion": {
        "question": "Qual emoção principal deve transmitir?",
        "determinacao": "💪 Determinação",
        "confianca": "🎯 Confiança",
        "forcaInterior": "🔥 Força Interior",
        "coragem": "🦁 Coragem",
        "foco": "🧘 Foco Absoluto",
        "vitoria": "🏆 Vitória / Conquista",
        "superacaoDor": "⚡ Superação da Dor"
      },
      "intensity": {
        "question": "Qual a intensidade da música?",
        "calma": "🌊 Calma e Inspiradora",
        "calmaDesc": "Frases longas, tom reflexivo",
        "crescente": "📈 Crescente",
        "crescenteDesc": "Começa calmo, explode no refrão",
        "intensa": "🔥 Intensa",
        "intensaDesc": "Alta energia do início ao fim",
        "agressiva": "⚡ Agressiva / Energética",
        "agressivaDesc": "Frases curtas, vocabulário forte"
      },
      "style": {
        "question": "Qual estilo musical combina com sua motivação?",
        "rock": "🎸 Rock Motivacional",
        "rap": "🎤 Rap Motivacional",
        "trap": "🔊 Trap Motivacional",
        "hiphop": "🎧 Hip Hop Clássico",
        "eletronica": "🎹 Eletrônica Épica",
        "lofi": "🎵 Lo-fi Motivacional",
        "auto": "🤖 Deixar o Sistema Escolher"
      },
      "narrative": {
        "question": "Como você quer que a mensagem seja entregue?",
        "cantada": "🎤 Toda Cantada",
        "cantadaMonologue": "🎤 Cantada + Partes Faladas",
        "maisFalada": "🗣️ Mais Falada que Cantada",
        "narrador": "📢 Estilo Discurso Motivacional"
      },
      "perspective": {
        "question": "Qual a perspectiva da letra?",
        "primeiraPessoa": "👤 Primeira Pessoa (eu)",
        "primeiraPessoaDesc": "Eu sou o protagonista",
        "mentor": "🧠 Mentor (você)",
        "mentorDesc": "Falando com o ouvinte",
        "universal": "🌍 Universal",
        "universalDesc": "Mensagem ampla para todos"
      },
      "story": {
        "question": "Conte o contexto da sua música motivacional! 💪\n\nPara quem é? Qual situação de superação? O que você quer transmitir?\n\n(Quanto mais detalhes, mais personalizada será a letra)"
      }
    }
  }
}
```

---

## Resultado Esperado

1. Quando usuário seleciona "💪 Motivacional", ativa fluxo especializado
2. Perguntas específicas para contexto motivacional (momento, intensidade, perspectiva)
3. Fallback inteligente para estilo baseado em momento + intensidade
4. Monólogos obrigatórios quando narrativa inclui fala
5. Letras geradas com estrutura otimizada para Suno AI
6. Monólogos com tom de mentor/treinador (frases curtas e diretas)
7. Suporte completo a 4 idiomas



# Sistema Especializado de Briefing para Músicas Religiosas/Gospel

## Visão Geral

Criar um fluxo dedicado e respeitoso para músicas religiosas/gospel que captura informações específicas desse nicho espiritual, com perguntas personalizadas sobre contexto de adoração, emoções espirituais, e estrutura com monólogos reverentes.

```text
┌────────────────────────────────────────────────────────────────────┐
│                 FLUXO RELIGIOSO/GOSPEL ESPECIALIZADO               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Usuário seleciona "✝️ Religiosa" no musicType                     │
│                          ↓                                         │
│  Sistema detecta e ATIVA fluxo gospel específico:                  │
│                                                                    │
│  1️⃣ CONTEXTO ESPIRITUAL                                           │
│     Adoração | Louvor | Oração | Confiança | Esperança | Gratidão  │
│                          ↓                                         │
│  2️⃣ EMOÇÃO ESPIRITUAL                                             │
│     Paz | Fé | Esperança | Quebrantamento | Confiança | Alegria    │
│                          ↓                                         │
│  3️⃣ INTENSIDADE DO CANTO                                          │
│     Suave e contemplativa | Crescente | Congregacional | Profética │
│                          ↓                                         │
│  4️⃣ ESTILO GOSPEL                                                  │
│     Worship | Congregacional | Tradicional | Acústico | Auto       │
│                          ↓                                         │
│  5️⃣ FORMA DE ENTREGA                                               │
│     Cantada | Com leituras | Com monólogos espirituais | Narrador  │
│     → REGRA: Sempre inicia com monólogo reverente                  │
│                          ↓                                         │
│  6️⃣ PERSPECTIVA                                                    │
│     Primeira pessoa (eu+Deus) | Congregacional (nós) | Profética   │
│                          ↓                                         │
│  7️⃣ REFERÊNCIA BÍBLICA (opcional)                                  │
│     Salmos | Versículos de fé | Texto inspirado                    │
│                          ↓                                         │
│  8️⃣ HISTÓRIA/CONTEXTO → VOICE TYPE → NOME                          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### 1. Novos Campos no BriefingFormData (src/pages/Briefing.tsx)

```typescript
interface BriefingFormData {
  // ... campos existentes
  
  // Novos campos EXCLUSIVOS para fluxo religioso/gospel
  gospelContext?: string;       // adoracao, louvor, oracao, confianca, esperanca, gratidao, restauracao, consagracao
  gospelIntensity?: string;     // suave, crescente, congregacional, profetica
  gospelStyle?: string;         // worship, congregacional, tradicional, acustico, instrumental_canto
  gospelNarrative?: string;     // cantada, leituras, monologos, narrador
  gospelPerspective?: string;   // primeira_pessoa, congregacional, profetica
  biblicalReference?: string;   // texto opcional de referência bíblica
}
```

### 2. Novas Opções Traduzidas (useBriefingTranslations.ts)

```typescript
// Contexto espiritual da música
const gospelContextOptions = [
  { id: "adoracao", label: t('steps.gospel.context.adoracao'), description: t('steps.gospel.context.adoracaoDesc') },
  { id: "louvor", label: t('steps.gospel.context.louvor'), description: t('steps.gospel.context.louvorDesc') },
  { id: "oracao", label: t('steps.gospel.context.oracao'), description: t('steps.gospel.context.oracaoDesc') },
  { id: "confianca", label: t('steps.gospel.context.confianca'), description: t('steps.gospel.context.confiancaDesc') },
  { id: "esperanca", label: t('steps.gospel.context.esperanca'), description: t('steps.gospel.context.esperancaDesc') },
  { id: "gratidao", label: t('steps.gospel.context.gratidao'), description: t('steps.gospel.context.gratidaoDesc') },
  { id: "restauracao", label: t('steps.gospel.context.restauracao'), description: t('steps.gospel.context.restauracaoDesc') },
  { id: "consagracao", label: t('steps.gospel.context.consagracao'), description: t('steps.gospel.context.consagracaoDesc') },
];

// Emoções espirituais
const gospelEmotionOptions = [
  { id: "paz", label: t('steps.gospel.emotion.paz') },
  { id: "fe", label: t('steps.gospel.emotion.fe') },
  { id: "esperanca", label: t('steps.gospel.emotion.esperanca') },
  { id: "quebrantamento", label: t('steps.gospel.emotion.quebrantamento') },
  { id: "confianca", label: t('steps.gospel.emotion.confianca') },
  { id: "alegria", label: t('steps.gospel.emotion.alegria') },
  { id: "reverencia", label: t('steps.gospel.emotion.reverencia') },
];

// Intensidade do canto
const gospelIntensityOptions = [
  { id: "suave", label: t('steps.gospel.intensity.suave'), description: t('steps.gospel.intensity.suaveDesc') },
  { id: "crescente", label: t('steps.gospel.intensity.crescente'), description: t('steps.gospel.intensity.crescenteDesc') },
  { id: "congregacional", label: t('steps.gospel.intensity.congregacional'), description: t('steps.gospel.intensity.congregacionalDesc') },
  { id: "profetica", label: t('steps.gospel.intensity.profetica'), description: t('steps.gospel.intensity.profeticaDesc') },
];

// Estilo gospel
const gospelStyleOptions = [
  { id: "worship", label: t('steps.gospel.style.worship') },
  { id: "congregacional", label: t('steps.gospel.style.congregacional') },
  { id: "tradicional", label: t('steps.gospel.style.tradicional') },
  { id: "acustico", label: t('steps.gospel.style.acustico') },
  { id: "instrumental_canto", label: t('steps.gospel.style.instrumentalCanto') },
  { id: "auto", label: t('steps.gospel.style.auto') },
];

// Narrativa gospel
const gospelNarrativeOptions = [
  { id: "cantada", label: t('steps.gospel.narrative.cantada') },
  { id: "leituras", label: t('steps.gospel.narrative.leituras') },
  { id: "monologos", label: t('steps.gospel.narrative.monologos') },
  { id: "narrador", label: t('steps.gospel.narrative.narrador') },
];

// Perspectiva
const gospelPerspectiveOptions = [
  { id: "primeira_pessoa", label: t('steps.gospel.perspective.primeiraPessoa'), description: t('steps.gospel.perspective.primeiraPessoaDesc') },
  { id: "congregacional", label: t('steps.gospel.perspective.congregacional'), description: t('steps.gospel.perspective.congregacionalDesc') },
  { id: "profetica", label: t('steps.gospel.perspective.profetica'), description: t('steps.gospel.perspective.profeticaDesc') },
];
```

### 3. Novo Fluxo no chatFlow (índices 44-53)

| Index | Campo | Descrição |
|-------|-------|-----------|
| 44 | gospelContext | Contexto espiritual (adoração, louvor, etc.) |
| 45 | emotion | Emoção espiritual (paz, fé, esperança) |
| 46 | gospelIntensity | Intensidade (suave → profética) |
| 47 | gospelStyle | Estilo gospel com fallback inteligente |
| 48 | gospelNarrative | Forma de entrega (cantada, monólogos) |
| 49 | gospelPerspective | Perspectiva (eu, nós, voz profética) |
| 50 | biblicalReference | Referência bíblica (opcional) |
| 51 | story | Contexto/história da música |
| 52 | voiceType | Tipo de voz |
| 53 | autoGenerateName | Nome automático ou manual |

### 4. Lógica de Navegação (getNextStep)

```typescript
// Após Step 1 (musicType)
if (current === 1 && data.musicType === 'religiosa') {
  return 44; // Vai para fluxo gospel
}

// FLUXO GOSPEL (44-53)
if (data.musicType === 'religiosa' && !data.isInstrumental) {
  if (current === 44) return 45; // context → emotion
  if (current === 45) return 46; // emotion → gospelIntensity
  if (current === 46) return 47; // gospelIntensity → gospelStyle
  if (current === 47) return 48; // gospelStyle → gospelNarrative
  if (current === 48) {
    // REGRA: Todas as músicas gospel começam com monólogo
    // Marcar hasMonologue = true SEMPRE
    return 49; // gospelNarrative → gospelPerspective
  }
  if (current === 49) return 50; // gospelPerspective → biblicalReference
  if (current === 50) return 51; // biblicalReference → story
  if (current === 51) return 52; // story → voiceType
  if (current === 52) return 53; // voiceType → autoGenerateName
  if (current === 53) {
    return data.autoGenerateName ? 100 : 19; // Se auto, vai para confirmação
  }
}
```

### 5. Fallback Inteligente para Estilo Gospel

```typescript
const getGospelStyleFallback = (context: string, intensity: string): string => {
  // Adoração / Oração → Worship contemporâneo
  if (['adoracao', 'oracao'].includes(context)) {
    return 'worship';
  }
  
  // Louvor + congregacional → Gospel congregacional
  if (context === 'louvor' && intensity === 'congregacional') {
    return 'congregacional';
  }
  
  // Restauração / Cura → Acústico suave
  if (['restauracao', 'esperanca'].includes(context) && intensity === 'suave') {
    return 'acustico';
  }
  
  // Default: Worship (mais versátil)
  return 'worship';
};
```

### 6. Regra Obrigatória: Monólogo Inicial

A música gospel SEMPRE começa com um monólogo espiritual no início do Verse 1. Isso será forçado no código:

```typescript
// No handleOptionSelect, quando musicType === 'religiosa'
if (field === 'musicType' && option.id === 'religiosa') {
  setFormData(prev => ({
    ...prev,
    hasMonologue: true,
    monologuePosition: 'intro' // Monólogo no início
  }));
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Adicionar steps 44-53, lógica de navegação, novos campos no formData |
| `src/hooks/useBriefingTranslations.ts` | Adicionar todas as novas opções gospel |
| `public/locales/pt-BR/briefing.json` | Traduções completas em português |
| `public/locales/en/briefing.json` | Traduções em inglês |
| `public/locales/es/briefing.json` | Traduções em espanhol |
| `public/locales/it/briefing.json` | Traduções em italiano |

---

## Traduções (pt-BR)

```json
{
  "steps": {
    "gospel": {
      "intro": "✝️ Vamos criar sua música religiosa/gospel!\n\nEsse tipo de música é especial para adoração, louvor, oração e momentos de fé.",
      "context": {
        "question": "Qual é o contexto espiritual da sua música? 🙏",
        "adoracao": "🙌 Adoração",
        "adoracaoDesc": "Louvor íntimo a Deus",
        "louvor": "🎶 Louvor",
        "louvorDesc": "Celebração alegre",
        "oracao": "🤲 Oração",
        "oracaoDesc": "Conversa com Deus",
        "confianca": "🛡️ Confiança em Deus",
        "confiancaDesc": "Descanso na providência",
        "esperanca": "🌅 Esperança",
        "esperancaDesc": "Em tempos difíceis",
        "gratidao": "💝 Gratidão",
        "gratidaoDesc": "Agradecer bênçãos",
        "restauracao": "💚 Restauração/Cura",
        "restauracaoDesc": "Cura e renovação",
        "consagracao": "🔥 Consagração",
        "consagracaoDesc": "Entrega total"
      },
      "emotion": {
        "question": "Qual emoção espiritual principal deve transmitir?",
        "paz": "☮️ Paz",
        "fe": "✝️ Fé",
        "esperanca": "🌈 Esperança",
        "quebrantamento": "💧 Quebrantamento",
        "confianca": "🛡️ Confiança",
        "alegria": "😊 Alegria Espiritual",
        "reverencia": "🙇 Reverência"
      },
      "intensity": {
        "question": "Qual a intensidade do canto?",
        "suave": "🕯️ Suave e Contemplativa",
        "suaveDesc": "Momento íntimo com Deus",
        "crescente": "📈 Crescente",
        "crescenteDesc": "Oração → Louvor → Adoração",
        "congregacional": "🏛️ Intensa e Congregacional",
        "congregacionalDesc": "Para cantar em comunidade",
        "profetica": "🔥 Profética/Declarativa",
        "profeticaDesc": "Declarações de fé e promessas"
      },
      "style": {
        "question": "Qual estilo gospel combina com sua música?",
        "worship": "🎹 Worship Contemporâneo",
        "congregacional": "🏛️ Gospel Congregacional",
        "tradicional": "📖 Gospel Tradicional",
        "acustico": "🎸 Gospel Acústico",
        "instrumentalCanto": "🎵 Adoração com Canto Instrumental",
        "auto": "🤖 Deixar o Sistema Escolher"
      },
      "narrative": {
        "question": "Como a mensagem deve ser entregue?",
        "cantada": "🎤 Toda Cantada",
        "leituras": "📖 Cantada com Leituras Bíblicas",
        "monologos": "🙏 Cantada com Monólogos Espirituais",
        "narrador": "📢 Narrador Reverente + Canto"
      },
      "perspective": {
        "question": "Qual a perspectiva da letra?",
        "primeiraPessoa": "🙏 Primeira Pessoa",
        "primeiraPessoaDesc": "Eu falo com Deus",
        "congregacional": "🏛️ Congregacional",
        "congregacionalDesc": "Nós (comunidade)",
        "profetica": "🔥 Voz Profética",
        "profeticaDesc": "Deus falando ao homem"
      },
      "biblicalReference": {
        "question": "Tem alguma referência bíblica que gostaria de inspirar a letra? (opcional)\n\nExemplo: Salmo 23, versículos sobre fé, esperança...\n\n💡 A IA vai usar como inspiração poética, não citação literal."
      },
      "story": {
        "question": "Conte o contexto da sua música religiosa! 🙏\n\nPara quem é? Qual momento de fé? O que você quer transmitir?\n\n(Quanto mais detalhes, mais personalizada será a letra)"
      }
    }
  }
}
```

---

## Regras dos Monólogos Espirituais

Cada `[monologue]` em músicas gospel deve:

- Ter tom de **oração, leitura ou declaração bíblica**
- Usar frases **curtas ou médias**
- Transmitir **paz, fé, confiança e reverência**
- **Nunca** soar como discurso motivacional comum
- **Evitar** linguagem agressiva ou secular
- Sempre começar a música (no Verse 1)

Exemplo de tom esperado:
```
"O Senhor é minha força quando o medo chega.
Nele descanso, mesmo em meio ao silêncio."
```

---

## Resultado Esperado

1. Quando usuário seleciona "✝️ Religiosa", ativa fluxo gospel especializado
2. Perguntas específicas para contexto espiritual (adoração, louvor, oração)
3. Emoções espirituais únicas (paz, fé, quebrantamento, reverência)
4. Fallback inteligente para estilo baseado em contexto + intensidade
5. Monólogo inicial OBRIGATÓRIO com tom reverente
6. Letras geradas com estrutura otimizada para Suno AI
7. Perspectiva adequada (eu+Deus, nós, voz profética)
8. Suporte completo a 4 idiomas
9. Separação clara desse nicho para evitar conflitos de linguagem

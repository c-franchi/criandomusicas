
# Plano: Fluxo Completo de Trilha Sonora / Instrumental Cinematográfico

## Visão Geral

Criar um fluxo especializado para **Trilha Sonora** (índices 70-79 no chatFlow) que é totalmente separado do instrumental genérico. Este fluxo é otimizado para produção de música para vídeos, filmes, jogos, podcasts e outros usos profissionais.

## Escopo das Mudanças

### 1. Novas Propriedades no BriefingFormData

```typescript
// Campos para Trilha Sonora/Cinematográfico
soundtrackUsage?: string;        // video_institucional, filme, trailer, jogo, podcast, redes_sociais, meditacao, ambiente
soundtrackEmotion?: string;      // suspense, drama, inspiracao, tensao, acao, paz, misterio, alegria
soundtrackDynamics?: string;     // constante, crescente, crescente_climax, ondulada, minimalista
soundtrackStyle?: string;        // epico, emocional, eletronica_ambiente, orquestral, piano_solo, ambient, lofi, auto
soundtrackRhythm?: string;       // lento, medio, rapido, variavel
soundtrackVoice?: string;        // instrumental, vocalizacoes, monologoFalado, voz_eterea
soundtrackScene?: string;        // descrição da cena (opcional)
soundtrackLanguage?: string;     // pt, en, es (se houver voz)
```

### 2. Estrutura do Fluxo (8 Camadas)

```text
[Step 1] Tipo de Uso (obrigatório)
    ↓
[Step 70] soundtrackUsage
    - 📹 Vídeo Institucional
    - 🎬 Filme / Curta
    - 🎭 Trailer / Teaser
    - 🎮 Jogo
    - 🎙️ Podcast
    - 📱 Vídeo Redes Sociais
    - 🧘 Meditação / Relaxamento
    - 🏢 Ambiente (loja, evento)

[Step 2] Emoção Principal (obrigatório)
    ↓
[Step 71] soundtrackEmotion
    - 😰 Suspense
    - 🎭 Drama / Emoção
    - ✨ Inspiração / Esperança
    - ⚡ Tensão
    - 🔥 Ação / Energia
    - 🕊️ Paz / Relaxamento
    - 🌙 Mistério
    - 😊 Alegria

[Step 3] Dinâmica/Evolução
    ↓
[Step 72] soundtrackDynamics
    - ➡️ Constante (mesmo clima)
    - 📈 Crescente (build-up)
    - 🎯 Crescente com Clímax
    - 🌊 Ondulada (sobe e desce)
    - 🍃 Minimalista

[Step 4] Estilo Musical
    ↓
[Step 73] soundtrackStyle
    - 🏔️ Cinemática Épica
    - 💔 Cinemática Emocional
    - 🎹 Eletrônica Ambiente
    - 🎻 Orquestral
    - 🎹 Piano Solo
    - 🌌 Ambient / Drone
    - 🎧 Lo-fi Instrumental
    - 🤖 Deixar Sistema Escolher

[Step 5] Ritmo/Velocidade
    ↓
[Step 74] soundtrackRhythm
    - 🐢 Lento
    - 🚶 Médio
    - 🏃 Rápido
    - 🔄 Variável

[Step 6] Presença de Voz
    ↓
[Step 75] soundtrackVoice
    - 🎵 Totalmente Instrumental
    - 🎤 Apenas Vocalizações (ahh, hum)
    - 🗣️ Voz Falada / Monólogo
    - ✨ Voz Etérea (sem palavras)

[Step 7] Descrição da Cena (opcional)
    ↓
[Step 76] soundtrackScene (textarea)
    - "herói caminhando sozinho"
    - "paisagem ao amanhecer"
    - "tensão antes da decisão"

[Step 8] Idioma (se houver voz)
    ↓
[Step 77] soundtrackLanguage (condicional)
    - 🇧🇷 Português
    - 🇺🇸 Inglês
    - 🇪🇸 Espanhol

[Step 9] Nome Automático?
    ↓
[Step 78] autoGenerateName
    - 🤖 Deixar a IA criar
    - ✍️ Eu quero escolher
```

### 3. Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Briefing.tsx` | Modificar | Adicionar campos no BriefingFormData, steps 70-78 no chatFlow, lógica getNextStep |
| `src/hooks/useBriefingTranslations.ts` | Modificar | Adicionar opções e mensagens traduzidas para trilha sonora |
| `public/locales/pt-BR/briefing.json` | Modificar | Traduções PT-BR completas |
| `public/locales/en/briefing.json` | Modificar | Traduções EN completas |
| `public/locales/es/briefing.json` | Modificar | Traduções ES completas |
| `public/locales/it/briefing.json` | Modificar | Traduções IT completas |
| `src/assets/briefing/soundtrack/` | Criar | Pasta com imagens para os cards visuais |
| `src/assets/briefing/index.ts` | Modificar | Exportar novas imagens de trilha sonora |

### 4. Assets Visuais Necessários

```text
src/assets/briefing/soundtrack/
├── usage/
│   ├── video-institucional.jpg
│   ├── filme.jpg
│   ├── trailer.jpg
│   ├── jogo.jpg
│   ├── podcast.jpg
│   ├── redes-sociais.jpg
│   ├── meditacao.jpg
│   └── ambiente.jpg
├── emotions/
│   ├── suspense.jpg
│   ├── drama.jpg
│   ├── inspiracao.jpg
│   ├── tensao.jpg
│   ├── acao.jpg
│   ├── paz.jpg
│   ├── misterio.jpg
│   └── alegria.jpg
├── dynamics/
│   ├── constante.jpg
│   ├── crescente.jpg
│   ├── crescente-climax.jpg
│   ├── ondulada.jpg
│   └── minimalista.jpg
├── styles/
│   ├── epico.jpg
│   ├── emocional.jpg
│   ├── eletronica-ambiente.jpg
│   ├── orquestral.jpg
│   ├── piano-solo.jpg
│   ├── ambient.jpg
│   ├── lofi.jpg
│   └── auto.jpg
└── voice/
    ├── instrumental.jpg
    ├── vocalizacoes.jpg
    ├── monologoFalado.jpg
    └── voz-eterea.jpg
```

### 5. Estrutura de Traduções

```json
{
  "steps": {
    "soundtrack": {
      "intro": "🎬 Vamos criar sua trilha sonora!\n\nEsse tipo de música é perfeito para vídeos, filmes, jogos, podcasts e mais.",
      "usage": {
        "question": "Onde essa trilha será usada? 🎬",
        "videoInstitucional": "📹 Vídeo Institucional",
        "filme": "🎬 Filme / Curta-metragem",
        "trailer": "🎭 Trailer / Teaser",
        "jogo": "🎮 Jogo",
        "podcast": "🎙️ Podcast",
        "redesSociais": "📱 Vídeo para Redes Sociais",
        "meditacao": "🧘 Meditação / Relaxamento",
        "ambiente": "🏢 Ambiente (loja, evento, espera)"
      },
      "emotion": {
        "question": "Qual emoção principal a trilha deve transmitir? 🎭",
        "suspense": "😰 Suspense",
        "drama": "🎭 Emoção / Drama",
        "inspiracao": "✨ Inspiração / Esperança",
        "tensao": "⚡ Tensão",
        "acao": "🔥 Ação / Energia",
        "paz": "🕊️ Paz / Relaxamento",
        "misterio": "🌙 Mistério",
        "alegria": "😊 Alegria"
      },
      "dynamics": {
        "question": "Como a trilha deve evoluir? 📊",
        "constante": "➡️ Constante",
        "constanteDesc": "Mesmo clima do início ao fim",
        "crescente": "📈 Crescente (build-up)",
        "crescenteDesc": "Intensidade aumenta gradualmente",
        "crescenteClimax": "🎯 Crescente com Clímax",
        "crescenteClimaxDesc": "Build-up + ponto alto emocional",
        "ondulada": "🌊 Ondulada",
        "onduladaDesc": "Sobe e desce em intensidade",
        "minimalista": "🍃 Minimalista",
        "minimalistaDesc": "Menos elementos, mais espaço"
      },
      "style": {
        "question": "Qual estilo você prefere? 🎼",
        "epico": "🏔️ Cinemática Épica",
        "epicoDesc": "Grandioso, orquestral, impactante",
        "emocional": "💔 Cinemática Emocional",
        "emocionalDesc": "Tocante, dramático, sensível",
        "eletronicaAmbiente": "🎹 Eletrônica Ambiente",
        "orquestral": "🎻 Orquestral",
        "pianoSolo": "🎹 Piano Solo",
        "ambient": "🌌 Ambient / Drone",
        "lofi": "🎧 Lo-fi Instrumental",
        "auto": "🤖 Deixar o Sistema Escolher"
      },
      "rhythm": {
        "question": "Qual o ritmo da trilha? 🎵",
        "lento": "🐢 Lento",
        "medio": "🚶 Médio",
        "rapido": "🏃 Rápido",
        "variavel": "🔄 Variável"
      },
      "voice": {
        "question": "A trilha deve ter voz? 🎤",
        "instrumental": "🎵 Não, totalmente instrumental",
        "instrumentalDesc": "Apenas instrumentos",
        "vocalizacoes": "🎤 Apenas vocalizações",
        "vocalizacoesDesc": "Ahh, hum, pads vocais",
        "monologoFalado": "🗣️ Voz falada / Monólogo",
        "monologoFaladoDesc": "Narração ou texto falado",
        "vozEterea": "✨ Voz etérea sem palavras",
        "vozEtereaDesc": "Vocal ambiente, sem letra definida"
      },
      "scene": {
        "question": "Descreva a cena ou sensação desejada (opcional) 🎬\n\nExemplos: \"herói caminhando sozinho\", \"paisagem ao amanhecer\", \"tensão antes da decisão\""
      },
      "language": {
        "question": "Idioma (para voz/monólogo): 🌍",
        "pt": "🇧🇷 Português",
        "en": "🇺🇸 Inglês",
        "es": "🇪🇸 Espanhol"
      }
    }
  },
  "confirmation": {
    "soundtrackUsage": "Uso",
    "soundtrackEmotion": "Emoção",
    "soundtrackDynamics": "Dinâmica",
    "soundtrackStyle": "Estilo",
    "soundtrackRhythm": "Ritmo",
    "soundtrackVoice": "Voz",
    "soundtrackScene": "Cena",
    "soundtrackLanguage": "Idioma",
    "soundtrackBadge": "🎬 Trilha Sonora"
  }
}
```

### 6. Lógica de Navegação

```javascript
// Em getNextStep()
if (current === 1) {
  // Se é trilha sonora, vai para fluxo especializado
  if (data.musicType === 'trilha') {
    return 70; // Vai para soundtrackUsage
  }
  // ... resto da lógica existente
}

// FLUXO TRILHA SONORA (70-78)
if (data.musicType === 'trilha') {
  if (current === 70) return 71; // usage -> emotion
  if (current === 71) return 72; // emotion -> dynamics
  if (current === 72) return 73; // dynamics -> style
  if (current === 73) return 74; // style -> rhythm
  if (current === 74) return 75; // rhythm -> voice
  if (current === 75) {
    // Se tem voz (não é totalmente instrumental), perguntar idioma
    if (['monologoFalado', 'voz_eterea'].includes(data.soundtrackVoice || '')) {
      return 77; // voice -> language
    }
    return 76; // voice -> scene (opcional)
  }
  if (current === 76) return 78; // scene -> autoGenerateName
  if (current === 77) return 76; // language -> scene
  if (current === 78) {
    return data.autoGenerateName ? 100 : 21; // confirmação ou nome manual
  }
}
```

### 7. Prompt Mestre para SUNO

O sistema de geração de style prompt será atualizado para incluir lógica específica para trilhas sonoras:

```text
[Style]
Genre: {soundtrackStyle} soundtrack
Mood/Atmosphere: {soundtrackEmotion}, {soundtrackDynamics}
Instrumentation: Based on {soundtrackStyle}
(optional) BPM: Based on {soundtrackRhythm}

[Lyrics]
[Intro]
(descrição instrumental / ambientação baseada em {soundtrackScene})

[Section A]
(desenvolvimento inicial - {soundtrackDynamics})

[Section B]
(variação ou crescimento)

[Climax] (se dynamics = crescente_climax)
(ponto alto emocional)

[Outro]
(encerramento ou dissolução)

[End]
```

## Sequência de Implementação

1. **Etapa 1**: Adicionar campos no `BriefingFormData` e criar placeholders no `chatFlow` (índices 70-78)
2. **Etapa 2**: Criar estrutura de traduções no `public/locales/pt-BR/briefing.json`
3. **Etapa 3**: Replicar traduções para EN, ES, IT
4. **Etapa 4**: Adicionar opções no `useBriefingTranslations.ts`
5. **Etapa 5**: Implementar lógica `getNextStep` para trilha sonora
6. **Etapa 6**: Criar assets visuais (imagens) para os cards
7. **Etapa 7**: Atualizar tela de confirmação para exibir campos de trilha sonora
8. **Etapa 8**: Atualizar edge function `generate-style-prompt` para gerar prompts cinematográficos

## Benefícios

- Trilhas sonoras terão prompts otimizados para SUNO
- Fluxo especializado aumenta qualidade e precisão
- Separação clara facilita uso profissional (vídeo, cinema, jogos)
- UX específica para criadores de conteúdo

## Estimativa

- **Arquivos modificados**: 7
- **Linhas de código**: ~500
- **Traduções**: ~200 chaves por idioma
- **Assets visuais**: ~25 imagens

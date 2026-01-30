
# Correção Global de Pronúncia nas Letras Geradas

## Problema Identificado

O sistema atual tem falhas na conversão fonética de:

```text
┌────────────────────────────────────────────────────────────┐
│                    PROBLEMAS ATUAIS                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ❌ NÚMEROS: "16 997813038"                                │
│     → IA gera formato numérico, Suno lê incorretamente     │
│                                                            │
│  ❌ SITES: "www.mecuidoperfumes.com.br"                    │
│     → Não converte para leitura fonética                   │
│                                                            │
│  ❌ SIGLAS: "FME"                                          │
│     → Não força soletração letra por letra                 │
│                                                            │
│  ❌ APLICAÇÃO PARCIAL                                      │
│     → Pronúncias só aplicadas em algumas seções            │
│     → [monologue] e [spoken word] não tratados             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Solução em 3 Frentes

### 1. Atualizar Prompts do Sistema (generate-lyrics)

Adicionar regras obrigatórias de conversão fonética diretamente no prompt da IA:

```typescript
// Novas regras a incluir no systemPrompt
REGRAS OBRIGATÓRIAS DE PRONÚNCIA (aplicar em TODAS as seções):

1. TELEFONES E NÚMEROS:
   - NUNCA gerar números em formato numérico
   - Converter para leitura dígito por dígito com pausas
   - Usar reticências (...) para separar grupos
   - Exemplo: "16 99781-3038" → "dezesseis... nove nove sete oito um... três zero três oito"

2. SITES E DOMÍNIOS:
   - NUNCA escrever URLs técnicas (www.site.com.br)
   - Converter para leitura verbal fonética
   - Separar nome, extensão e país
   - Exemplo: "www.mecuido.com.br" → "me-cuido, ponto com, ponto bê-érre"

3. SIGLAS (3 letras ou menos):
   - SEMPRE soletrar letra por letra
   - Usar separação por ponto ou hífen
   - Exemplo: "FME" → "éfe... ême... é" ou "F. M. E."

4. SIGLAS CONHECIDAS (4+ letras):
   - Verificar se é palavra pronunciável
   - Se não, soletrar letra por letra
```

### 2. Criar Função de Pós-Processamento

Nova função que aplica conversões automáticas em toda a letra gerada:

```typescript
// Função para converter números para leitura verbal
function convertPhoneToVerbal(text: string): string {
  // Detecta padrões de telefone: (XX) XXXXX-XXXX, XX XXXXXXXXX, etc.
  const phonePatterns = [
    /\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g,
    /\d{10,11}/g
  ];
  
  // Converte cada dígito para palavra com pausas
  // 0→zero, 1→um, 2→dois, etc.
}

// Função para converter URLs para leitura fonética
function convertUrlToVerbal(text: string): string {
  // Detecta padrões: www.*, *.com.br, @*
  // Converte para: "nome do site, ponto com, ponto bê-érre"
}

// Função para soletrar siglas
function spellOutAcronyms(text: string): string {
  // Detecta siglas de 2-4 letras maiúsculas
  // Converte para soletração: "FME" → "éfe... ême... é"
}

// Aplicar todas as conversões
function applyGlobalPronunciationRules(text: string): string {
  let result = text;
  result = convertPhoneToVerbal(result);
  result = convertUrlToVerbal(result);
  result = spellOutAcronyms(result);
  return result;
}
```

### 3. Adicionar Pergunta no Briefing

Nova pergunta para músicas cantadas (especialmente corporativas/jingles):

```typescript
// Novo índice no chat do briefing (após contactInfo para jingles)
{
  type: 'bot',
  content: '📞 Existe alguma sigla, número de telefone, site ou termo técnico que precisa de pronúncia especial?',
  subtext: 'Exemplo: FME → "éfe-ême-é", 16997813038 → "dezesseis, nove nove sete..."',
  inputType: 'textarea',
  field: 'specialPronunciations'
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-lyrics/index.ts` | Atualizar systemPrompt com regras de pronúncia + criar funções de pós-processamento |
| `supabase/functions/generate-style-prompt/index.ts` | Aplicar funções de pós-processamento na letra final |
| `src/pages/Briefing.tsx` | Adicionar pergunta sobre siglas/termos especiais |
| `public/locales/*/briefing.json` | Adicionar traduções para nova pergunta |

---

## Detalhes Técnicos

### Dicionário de Conversão de Dígitos

```typescript
const DIGIT_TO_WORD: Record<string, string> = {
  '0': 'zero',
  '1': 'um',
  '2': 'dois',
  '3': 'três',
  '4': 'quatro',
  '5': 'cinco',
  '6': 'seis',
  '7': 'sete',
  '8': 'oito',
  '9': 'nove'
};

const LETTER_PRONUNCIATION: Record<string, string> = {
  'A': 'á', 'B': 'bê', 'C': 'cê', 'D': 'dê', 'E': 'é',
  'F': 'éfe', 'G': 'gê', 'H': 'agá', 'I': 'í', 'J': 'jota',
  'K': 'cá', 'L': 'éle', 'M': 'ême', 'N': 'ene', 'O': 'ó',
  'P': 'pê', 'Q': 'quê', 'R': 'érre', 'S': 'ésse', 'T': 'tê',
  'U': 'u', 'V': 'vê', 'W': 'dáblio', 'X': 'xis', 'Y': 'ípsilon',
  'Z': 'zê'
};
```

### Exemplo de Conversão Completa

**Entrada (gerada pela IA):**
```
[monologue]
"Ligue agora: 16 997813038! Acesse www.mecuidoperfumes.com.br. A FME te espera!"
```

**Saída (após pós-processamento):**
```
[monologue]
"Ligue agora: dezesseis...
nove nove sete oito um...
três zero três oito!
Acesse me-cuido-perfumes,
ponto com,
ponto bê-érre.
A éfe... ême... é te espera!"
```

---

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────────┐
│                      FLUXO CORRIGIDO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Briefing coleta informações + siglas/termos especiais   │
│                          ↓                                  │
│  2. generate-lyrics gera letra com regras de pronúncia      │
│     no prompt do sistema (IA já tenta converter)            │
│                          ↓                                  │
│  3. Pós-processamento aplica conversões automáticas:        │
│     - Telefones → verbal dígito por dígito                  │
│     - URLs → fonético separado                              │
│     - Siglas → soletração                                   │
│                          ↓                                  │
│  4. generate-style-prompt recebe letra já processada        │
│     e aplica pronúncias customizadas do usuário             │
│                          ↓                                  │
│  5. final_prompt com letra 100% fonética para Suno          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

- Todos os números convertidos para leitura verbal
- Todas as URLs convertidas para fonética
- Todas as siglas soletradas corretamente
- Conversões aplicadas em TODAS as seções ([Intro], [Verse], [Chorus], [Bridge], [Outro], [monologue], [spoken word])
- Pausas naturais usando reticências (...) ou quebras de linha
- Consistência mantida em toda a letra



# Enriquecimento da Geração de Capas com Contexto + Letra

## Objetivo

Melhorar a geração de capas de álbum usando duas fontes de contexto:
1. **Story** - O texto que o usuário digitou no chat descrevendo o contexto
2. **Letra aprovada** - O conteúdo da música gerada

A IA (GPT-4o-mini via OpenAI) analisará esses dados e criará um prompt visual rico e contextualizado para o DALL-E 3.

---

## Fluxo de Funcionamento

```text
┌─────────────────────────────────────────────────────────────┐
│                    DADOS DE ENTRADA                         │
├─────────────────────────────────────────────────────────────┤
│  1. orders.story (contexto do chat do usuário)              │
│     Ex: "Música para aniversário de 30 anos da minha mãe"   │
│                                                             │
│  2. lyrics.body (letra aprovada pelo usuário)               │
│     Ex: "[Verse] Trinta anos de amor e carinho..."          │
│                                                             │
│  3. orders.music_type, emotion, purpose (metadados)         │
├─────────────────────────────────────────────────────────────┤
│                           ▼                                 │
│              OPENAI GPT-4o-mini                             │
│     "Analise o contexto e letra, crie prompt visual..."     │
│                           ▼                                 │
│              Prompt Visual Contextualizado                  │
│     Ex: "Bolo elegante com 30 velas, tons dourados,         │
│          pétalas de rosa, atmosfera íntima de festa..."     │
│                           ▼                                 │
│                      DALL-E 3                               │
│              (gera imagem 1024x1024)                        │
│                           ▼                                 │
│               Capa Personalizada                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Exemplos de Resultado

| Contexto (story) | Letra | Prompt Visual Gerado |
|------------------|-------|---------------------|
| "Aniversário de 30 anos da mãe" | "Trinta anos de amor..." | "Bolo elegante com 30 velas douradas, pétalas de rosa, luz quente de entardecer, atmosfera íntima e celebratória" |
| "Motivação para amigo em crise" | "Você vai superar..." | "Nascer do sol épico sobre montanhas, raios de luz rompendo nuvens escuras, caminho iluminado, esperança" |
| "Música infantil para Bruno" | "Bruno é especial..." | "Quarto infantil mágico com brinquedos coloridos, estrelas brilhantes, arco-íris suave, atmosfera de sonho" |
| "Instrumental relaxante" | *(sem letra)* | "Paisagem serena de lago ao entardecer, montanhas ao fundo, neblina suave, tons azuis e dourados" |

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/generate-cover-image/index.ts`

| Etapa | Mudança |
|-------|---------|
| 1. Expandir query | Adicionar `story` e `approved_lyric_id` na busca de orders |
| 2. Buscar letra | Se `approved_lyric_id` existir, buscar `lyrics.body` |
| 3. Gerar prompt inteligente | Chamar GPT-4o-mini para analisar contexto + letra |
| 4. Usar no DALL-E | Injetar prompt contextualizado no template visual |

### Estrutura do Código

```text
1. Buscar order com story e approved_lyric_id
2. Se approved_lyric_id existir → buscar lyrics.body
3. Chamar OpenAI GPT-4o-mini com:
   - System prompt: "Você é diretor de arte de capas de álbuns"
   - User prompt: contexto + letra + metadados
4. Receber descrição visual contextualizada (max 150 palavras)
5. Injetar no template DALL-E existente
6. Gerar e salvar imagem
```

### Prompt do Diretor de Arte (GPT-4o-mini)

```text
Você é um diretor de arte especializado em capas de álbuns musicais.

CONTEXTO DA SOLICITAÇÃO:
{story}

TIPO: {music_type} | EMOÇÃO: {emotion} | OCASIÃO: {purpose}

LETRA DA MÚSICA:
{lyrics.body ou "Música instrumental - sem letra"}

TAREFA:
Crie uma descrição visual (máximo 150 palavras) para capa de álbum que represente 
fielmente o contexto e a letra.

REGRAS ABSOLUTAS:
- NUNCA descreva pessoas, rostos, mãos ou partes do corpo
- Foque em: paisagens, objetos simbólicos, luzes, atmosfera
- Seja específico sobre cores, iluminação e composição
- Elementos devem representar a ocasião e emoção da música
```

---

## Tratamento para Instrumentais

Para músicas sem letra (`is_instrumental = true`):
- Usar apenas `story`, `music_type`, `emotion` e `atmosphere`
- A IA criará prompt baseado na atmosfera e ocasião descritas

---

## Fallback de Segurança

Se a chamada GPT-4o-mini falhar:
1. Logar erro no console
2. Usar comportamento atual (style_prompt ou metadados)
3. Não bloquear a geração da capa

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-cover-image/index.ts` | Adicionar lógica de análise contextual com GPT-4o-mini antes de gerar imagem |

---

## Benefícios

- **Capas únicas**: Cada capa reflete exatamente a história do cliente
- **Maior valor percebido**: Arte personalizada para cada música
- **Usa chave OpenAI existente**: Sem custo adicional de API (já configurada)
- **Fallback seguro**: Se IA falhar, usa método atual



# Plano: Fluxo de Música Infantil + Melhorias Visuais

## Visão Geral
Este plano implementa um sistema completo de briefing para músicas infantis com 8 camadas de perguntas, além de melhorias visuais no carrossel e correção de imagens com símbolos religiosos.

---

## Parte 1: Melhorias Visuais Imediatas

### 1.1 Loading Visual no Carrossel
**Arquivo:** `src/components/briefing/ImageCardGrid.tsx`
- Adicionar estado `isLoading` durante interações de drag
- Mostrar skeleton/shimmer enquanto imagens carregam
- Feedback visual suave ao soltar após arrastar

### 1.2 Substituição de Imagens com Cruz
**Arquivos:** `src/assets/briefing/gospel/*.jpg`
- Regenerar imagens que contêm cruzes visíveis
- Usar representações visuais neutras (mãos em oração, luz, natureza serena)
- Contextos afetados: adoração, louvor, oração, consagração, restauração

---

## Parte 2: Novo Fluxo de Música Infantil (8 Camadas)

### 2.1 Estrutura de Dados
**Arquivo:** `src/pages/Briefing.tsx` - Interface BriefingFormData

Novos campos:
```text
┌──────────────────────────────────────────────────┐
│ childAgeGroup       │ 0-3, 4-6, 7-9, 10-12      │
│ childObjective      │ diversao, valores, rotina..│
│ childTheme          │ animais, natureza, familia │
│ childMood           │ alegre, calma, animada...  │
│ childStyle          │ cantiga, pop, educativo... │
│ childInteraction    │ sim / não                  │
│ childNarrative      │ cantada, com falas...      │
│ childLanguage       │ pt, en, es                 │
└──────────────────────────────────────────────────┘
```

### 2.2 Novas Imagens para Cards (24 imagens)

**Camada 1 - Faixa Etária** (4 imagens)
- `ages/0-3.jpg` - Bebê com brinquedo musical
- `ages/4-6.jpg` - Criança pré-escolar brincando
- `ages/7-9.jpg` - Criança na escola
- `ages/10-12.jpg` - Pré-adolescente com fones

**Camada 2 - Objetivo** (6 imagens)
- `objectives/diversao.jpg` - Criança rindo e dançando
- `objectives/valores.jpg` - Crianças compartilhando
- `objectives/rotina.jpg` - Criança na hora de dormir
- `objectives/educacao.jpg` - Criança aprendendo cores
- `objectives/emocoes.jpg` - Crianças abraçando
- `objectives/aventura.jpg` - Criança imaginando aventura

**Camada 3 - Tema** (7 imagens)
- `themes/animais.jpg` - Animais fofos ilustrados
- `themes/natureza.jpg` - Floresta encantada
- `themes/familia.jpg` - Família feliz
- `themes/escola.jpg` - Sala de aula colorida
- `themes/fantasia.jpg` - Fadas e dragões
- `themes/profissoes.jpg` - Crianças de profissões
- `themes/superacao.jpg` - Criança vencendo medo

**Camada 4 - Clima** (4 imagens)
- `moods/alegre.jpg` - Festa colorida
- `moods/calma.jpg` - Quarto aconchegante
- `moods/animada.jpg` - Dança e movimento
- `moods/suave.jpg` - Noite estrelada

**Camada 5 - Estilo Musical** (6 imagens)
- `child-styles/cantiga.jpg` - Roda de crianças
- `child-styles/pop.jpg` - Show infantil
- `child-styles/educativo.jpg` - Aprendendo com música
- `child-styles/ninar.jpg` - Berço com lua
- `child-styles/desenho.jpg` - TV com personagens
- `child-styles/auto.jpg` - Notas musicais mágicas

### 2.3 Fluxo de Chat (Steps 60-75)
**Arquivo:** `src/pages/Briefing.tsx`

```text
Quando musicType === 'infantil':

Step 60: childAgeGroup    → Imagens das 4 faixas etárias
Step 61: childObjective   → Imagens dos 6 objetivos
Step 62: childTheme       → Imagens dos 7 temas
Step 63: childMood        → Imagens dos 4 climas
Step 64: childStyle       → Imagens dos 6 estilos
Step 65: childInteraction → Sim/Não (cards simples)
Step 66: childNarrative   → 4 opções de narrativa
Step 67: childLanguage    → 3 idiomas (bandeiras)
Step 68: story            → Textarea livre
Step 69: voiceType        → Infantil masculina/feminina
Step 70: songName         → Auto ou manual
```

### 2.4 Traduções (4 idiomas)
**Arquivos:**
- `public/locales/pt-BR/briefing.json`
- `public/locales/en/briefing.json`
- `public/locales/es/briefing.json`
- `public/locales/it/briefing.json`

Nova seção `steps.children`:
```text
- ageGroup: question + 4 opções
- objective: question + 6 opções
- theme: question + 7 opções
- mood: question + 4 opções
- style: question + 6 opções
- interaction: question + 2 opções
- narrative: question + 4 opções
- language: question + 3 opções
```

### 2.5 Hook de Traduções
**Arquivo:** `src/hooks/useBriefingTranslations.ts`

Novas funções:
- `childAgeGroupOptions`
- `childObjectiveOptions`
- `childThemeOptions`
- `childMoodOptions`
- `childStyleOptions`
- `childInteractionOptions`
- `childNarrativeOptions`
- `childLanguageOptions`
- `getChildrenChatMessages()`

### 2.6 Assets Index
**Arquivo:** `src/assets/briefing/index.ts`

Novos exports:
- `childAgeImages`
- `childObjectiveImages`
- `childThemeImages`
- `childMoodImages`
- `childStyleImages`

---

## Parte 3: Regras de Segurança do Prompt

### 3.1 Validação de Conteúdo Infantil
**Arquivo:** `supabase/functions/generate-lyrics/index.ts`

Quando `musicType === 'infantil'`:
- Aplicar filtro de linguagem simplificada
- Bloquear termos adultos/ambíguos
- Forçar tom positivo e educativo
- Adaptar vocabulário à faixa etária selecionada

### 3.2 Estrutura de Prompt SUNO
O sistema gerará automaticamente o prompt seguindo a estrutura:
```text
[Style]
Genre: {childStyle} infantil
Mood: {childMood}
Age-appropriate: {childAgeGroup}
Instrumentation: instrumentos lúdicos

[Lyrics]
[Intro] - convite/sons lúdicos
[Verse 1] - letra simples
[Chorus] - refrão memorável
[Verse 2] - continuação
[Bridge] - interação (se ativada)
[Outro] - encerramento
```

---

## Sequência de Implementação

| Ordem | Tarefa | Arquivos |
|-------|--------|----------|
| 1 | Loading visual no carrossel | ImageCardGrid.tsx, ImageCard.tsx |
| 2 | Regenerar imagens gospel (sem cruz) | gospel/*.jpg |
| 3 | Criar 24 imagens infantis | ages/, objectives/, themes/, moods/, child-styles/ |
| 4 | Atualizar index de assets | src/assets/briefing/index.ts |
| 5 | Adicionar campos no FormData | Briefing.tsx |
| 6 | Criar steps 60-70 no chatFlow | Briefing.tsx |
| 7 | Implementar lógica de navegação | Briefing.tsx |
| 8 | Adicionar traduções pt-BR | briefing.json |
| 9 | Replicar traduções en/es/it | locales/*/briefing.json |
| 10 | Atualizar hook de traduções | useBriefingTranslations.ts |
| 11 | Integrar regras de segurança | generate-lyrics/index.ts |

---

## Resultado Esperado
- Carrossel com feedback visual de loading durante arraste
- Imagens gospel sem símbolos religiosos explícitos
- Fluxo infantil completo com 8 camadas visuais
- Músicas seguras, educativas e apropriadas para cada faixa etária
- Suporte a interação (palmas, repetição) quando solicitado
- Letras adaptadas ao vocabulário da idade selecionada

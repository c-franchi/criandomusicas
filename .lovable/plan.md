
# Sistema de Datas Comemorativas para Sugestões de Músicas

## Visão Geral

Implementar um sistema inteligente que detecta datas comemorativas próximas (Carnaval, Dia das Mães, Natal, etc.) e sugere ao usuário criar músicas temáticas para essas ocasiões.

```text
┌────────────────────────────────────────────────────────────┐
│                    FLUXO DA FEATURE                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuário acessa /briefing                               │
│                          ↓                                  │
│  2. Sistema verifica datas comemorativas próximas          │
│     (próximos 30 dias)                                     │
│                          ↓                                  │
│  3. Se houver data próxima, exibir banner/sugestão:        │
│     "🎭 Carnaval está chegando! Que tal criar uma          │
│      música para essa data especial?"                      │
│                          ↓                                  │
│  4. Usuário pode:                                          │
│     ✅ Aceitar → Pré-preenche tipo de música + atmosfera   │
│     ❌ Ignorar → Continua fluxo normal                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Arquitetura

### 1. Tabela no Banco de Dados

Criar tabela `commemorative_dates` para armazenar as datas comemorativas de forma dinâmica:

```sql
CREATE TABLE public.commemorative_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                    -- Nome: "Dia das Mães"
  name_en TEXT,                          -- Nome em inglês
  name_es TEXT,                          -- Nome em espanhol  
  name_it TEXT,                          -- Nome em italiano
  emoji TEXT DEFAULT '🎉',               -- Emoji representativo
  month INTEGER NOT NULL,                -- Mês (1-12)
  day INTEGER,                           -- Dia fixo (ou NULL se variável)
  calculation_rule TEXT,                 -- Regra para datas variáveis (ex: "second_sunday_may")
  suggested_music_type TEXT,             -- Tipo sugerido: "homenagem", "romantica", etc.
  suggested_atmosphere TEXT,             -- Atmosfera sugerida: "festivo", "intimo", etc.
  suggested_emotion TEXT,                -- Emoção sugerida
  description TEXT,                      -- Descrição curta para o usuário
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Datas Comemorativas Iniciais

| Data | Nome | Tipo Sugerido | Atmosfera |
|------|------|---------------|-----------|
| Variável | Carnaval | parodia | festivo |
| 08/03 | Dia da Mulher | homenagem | intimo |
| Variável | Páscoa | religiosa | leve |
| 2º dom maio | Dia das Mães | homenagem | intimo |
| 12/06 | Dia dos Namorados | romantica | intimo |
| 2º dom agosto | Dia dos Pais | homenagem | intimo |
| 15/09 | Dia do Cliente | corporativa | festivo |
| 12/10 | Dia das Crianças | infantil | festivo |
| 31/10 | Halloween | parodia | misterioso |
| 25/12 | Natal | religiosa/homenagem | festivo |
| 31/12 | Réveillon | homenagem | festivo |

### 3. Hook React: `useUpcomingCelebrations`

```typescript
// src/hooks/useUpcomingCelebrations.ts
export const useUpcomingCelebrations = (daysAhead = 30) => {
  // Busca datas comemorativas do banco
  // Calcula datas variáveis (Carnaval, Páscoa, Dia das Mães)
  // Retorna as que estão nos próximos X dias
  // Ordena por proximidade
  
  return {
    upcomingDates: CelebrativeDate[],
    closestDate: CelebrativeDate | null,
    isLoading: boolean
  };
};
```

### 4. Componente de Sugestão

```typescript
// src/components/CelebrationSuggestion.tsx
// Banner atrativo que aparece no topo do Briefing
// Mostra a data comemorativa mais próxima
// Botão "Criar música para [Data]" → pré-preenche campos
```

---

## Integração no Briefing

### Modificações no `Briefing.tsx`:

1. **Adicionar hook de celebrações**:
```typescript
const { closestDate, upcomingDates } = useUpcomingCelebrations(30);
```

2. **Exibir banner de sugestão** antes da seleção de plano:
```tsx
{closestDate && (
  <CelebrationSuggestion 
    celebration={closestDate}
    onAccept={() => {
      setFormData(prev => ({
        ...prev,
        musicType: closestDate.suggested_music_type,
        atmosphere: closestDate.suggested_atmosphere,
        emotion: closestDate.suggested_emotion
      }));
    }}
    onDismiss={() => setCelebrationDismissed(true)}
  />
)}
```

3. **Salvar preferência no briefing** se usuário aceitar sugestão:
```typescript
// Adicionar campo ao BriefingFormData
celebrationType?: string; // "carnaval", "dia_das_maes", etc.
```

---

## Cálculo de Datas Variáveis

### Lógica para datas móveis:

```typescript
// Carnaval: 47 dias antes da Páscoa
// Páscoa: Algoritmo de Gauss (baseado em ciclo lunar)
// Dia das Mães: 2º domingo de maio
// Dia dos Pais: 2º domingo de agosto

function calculateEaster(year: number): Date {
  // Algoritmo de Meeus/Jones/Butcher
}

function calculateCarnival(year: number): Date {
  const easter = calculateEaster(year);
  return subDays(easter, 47);
}

function getSecondSunday(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  const firstSunday = addDays(firstDay, (7 - firstDay.getDay()) % 7);
  return addDays(firstSunday, 7); // Segundo domingo
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useUpcomingCelebrations.ts` | Criar | Hook para buscar e calcular datas |
| `src/components/CelebrationSuggestion.tsx` | Criar | Componente visual do banner |
| `src/pages/Briefing.tsx` | Modificar | Integrar banner de sugestão |
| `src/hooks/useBriefingTranslations.ts` | Modificar | Adicionar traduções |
| `public/locales/*/briefing.json` | Modificar | Traduções em 4 idiomas |
| DB Migration | Criar | Tabela commemorative_dates + dados iniciais |

---

## Interface Visual

```text
┌──────────────────────────────────────────────────────────────┐
│  🎭 Carnaval está chegando! (em 12 dias)                     │
│                                                              │
│  Que tal criar uma música especial para essa data?           │
│  A IA pode criar uma paródia animada perfeita para a folia!  │
│                                                              │
│  [🎉 Criar música de Carnaval]    [❌ Não, obrigado]          │
└──────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

- Sistema detecta automaticamente datas comemorativas nos próximos 30 dias
- Exibe sugestão atrativa no início do fluxo de briefing
- Pré-preenche campos relevantes se usuário aceitar
- Administradores podem gerenciar datas pelo banco de dados
- Suporte completo a 4 idiomas (pt-BR, en, es, it)
- Datas variáveis (Carnaval, Páscoa) calculadas corretamente

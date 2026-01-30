
# Sistema de Datas Comemorativas para Sugestões de Músicas

## ✅ STATUS: IMPLEMENTADO

---

## Arquivos Criados/Modificados

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `src/hooks/useUpcomingCelebrations.ts` | ✅ Criado | Hook para buscar e calcular datas móveis (Páscoa, Carnaval, Dia das Mães) |
| `src/components/CelebrationSuggestion.tsx` | ✅ Criado | Banner visual com animação que aparece no Briefing |
| `src/pages/Briefing.tsx` | ✅ Modificado | Integrou hook e banner na seleção de planos |
| `public/locales/*/briefing.json` | ✅ Modificado | Traduções em 4 idiomas (pt-BR, en, es, it) |
| DB Migration | ✅ Executada | Tabela `commemorative_dates` com 11 datas iniciais |

---

## Funcionalidades Implementadas

### Cálculo de Datas Variáveis
- **Páscoa**: Algoritmo de Meeus/Jones/Butcher
- **Carnaval**: 47 dias antes da Páscoa
- **Dia das Mães**: 2º domingo de maio
- **Dia dos Pais**: 2º domingo de agosto

### Datas Cadastradas
| Data | Nome | Tipo Sugerido | Atmosfera |
|------|------|---------------|-----------|
| Variável | 🎭 Carnaval | parodia | festivo |
| 08/03 | 👩 Dia da Mulher | homenagem | intimo |
| Variável | 🐰 Páscoa | religiosa | leve |
| 2º dom maio | 👩‍👧‍👦 Dia das Mães | homenagem | intimo |
| 12/06 | ❤️ Dia dos Namorados | romantica | intimo |
| 2º dom agosto | 👨‍👧‍👦 Dia dos Pais | homenagem | intimo |
| 15/09 | 🤝 Dia do Cliente | corporativa | festivo |
| 12/10 | 🎈 Dia das Crianças | infantil | festivo |
| 31/10 | 🎃 Halloween | parodia | misterioso |
| 25/12 | 🎄 Natal | homenagem | festivo |
| 31/12 | 🎆 Réveillon | homenagem | festivo |

---

## Fluxo Implementado

```text
┌────────────────────────────────────────────────────────────┐
│                    FLUXO DA FEATURE                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuário acessa /briefing                               │
│                          ↓                                  │
│  2. Hook useUpcomingCelebrations busca datas do banco      │
│     e calcula datas variáveis para o ano atual             │
│                          ↓                                  │
│  3. Se houver data nos próximos 30 dias, exibe banner:     │
│     "🎭 Carnaval está chegando! (em X dias)"               │
│                          ↓                                  │
│  4. Usuário pode:                                          │
│     ✅ Aceitar → Pré-preenche musicType, atmosphere, emotion│
│     ❌ Fechar → Continua fluxo normal                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## API do Hook

```typescript
const { closestDate, upcomingDates, isLoading } = useUpcomingCelebrations(30);

// closestDate contém:
{
  id: string;
  localizedName: string;       // Nome no idioma atual
  localizedDescription: string;
  emoji: string;
  daysUntil: number;
  calculatedDate: Date;
  suggested_music_type: string;
  suggested_atmosphere: string;
  suggested_emotion: string;
}
```

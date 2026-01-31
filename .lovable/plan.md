
# Plano: Unificação Completa de Créditos Universais (Incluindo Creator)

## Resumo Executivo

**Objetivo:** Simplificar todo o sistema de créditos para que **1 crédito = 1 música de qualquer tipo** (vocal, instrumental ou letra própria), independente do plano de origem.

**Escopo:** Pacotes avulsos (Single, Package, Subscription) + Planos Creator (Start, Pro, Studio).

---

## Mudanças para o Usuário

| Antes | Depois |
|-------|--------|
| Créditos Vocais 🎤 e Instrumentais 🎹 separados | **Créditos Universais 🎵** |
| 6 pacotes avulsos (3 vocal + 3 instrumental) | **3 pacotes universais** |
| 6 planos Creator (3 vocal + 3 instrumental) | **3 planos Creator universais** |
| Toggle Vocal/Instrumental em cada página | **Sem toggle - preço único** |
| Avisos de incompatibilidade de tipo | **Sem restrições de uso** |
| Preços diferentes por tipo | **Preço único por tier** |

---

## Nova Estrutura de Preços

### Pacotes Avulsos (créditos nunca expiram)

| Plano | Créditos | Preço |
|-------|----------|-------|
| Único | 1 crédito | R$ 9,90 |
| Pacote 3 | 3 créditos | R$ 24,90 |
| Pacote 5 | 5 créditos | R$ 39,90 |

### Assinatura Creator (créditos renovam mensalmente)

| Plano | Créditos/mês | Preço/mês |
|-------|--------------|-----------|
| Creator Start | 50 créditos | R$ 29,90 |
| Creator Pro | 150 créditos | R$ 49,90 |
| Creator Studio | 300 créditos | R$ 79,90 |

---

## Arquivos a Modificar

### Fase 1: Backend (Edge Functions)

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/check-credits/index.ts` | Remover toda lógica de `vocal` vs `instrumental`. Retornar apenas `total_credits` único |
| `supabase/functions/use-credit/index.ts` | Remover `isCreditCompatible()`. Qualquer crédito serve para qualquer pedido (FIFO) |
| `supabase/functions/check-creator-subscription/index.ts` | Remover lógica de tipo instrumental |

### Fase 2: Hook e Tipos (Frontend)

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCredits.tsx` | Remover `totalVocal`, `totalInstrumental`. Simplificar para `totalCredits` |
| `src/lib/plan.ts` | Remover planos `_instrumental` |

### Fase 3: Componentes de UI

| Arquivo | Alteração |
|---------|-----------|
| `src/components/PlanTypeToggle.tsx` | **REMOVER ARQUIVO** |
| `src/components/CreditsBanner.tsx` | Exibir apenas "🎵 X créditos" (badge único) |
| `src/components/PricingPlans.tsx` | Remover toggle, mostrar 3 planos universais |
| `src/components/CreatorSection.tsx` | Remover toggle, remover aviso de incompatibilidade, 3 planos |

### Fase 4: Páginas

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Planos.tsx` | Remover toggle, unificar exibição, remover avisos de tipo |
| `src/pages/Checkout.tsx` | Remover verificação de tipo de crédito |
| `src/pages/Briefing.tsx` | Remover verificação `hasVocalCredits` / `hasInstrumentalCredits` |
| `src/pages/CreatorCheckout.tsx` | Simplificar (sem variações instrumentais) |

### Fase 5: Banco de Dados

| Tabela | Alteração |
|--------|-----------|
| `pricing_config` | Desativar: `single_instrumental`, `package_instrumental`, `subscription_instrumental`, `creator_*_instrumental` |
| `pricing_config` | Atualizar features dos planos para mencionar uso universal |

### Fase 6: Traduções

| Arquivo | Alteração |
|---------|-----------|
| `public/locales/*/pricing.json` | Remover seções de toggle, avisos de tipo, simplificar textos |
| `public/locales/*/common.json` | Atualizar labels de créditos |

---

## Detalhes Técnicos das Mudanças

### 1. Edge Function: check-credits/index.ts

**REMOVER:**
```typescript
// REMOVER estas funções e constantes
const getCreditType = (planId: string): 'vocal' | 'instrumental' => { ... }
const isCreditCompatible = (planId: string, orderType): boolean => { ... }

// REMOVER variáveis separadas
let totalVocal = 0;
let totalInstrumental = 0;
```

**SIMPLIFICAR PARA:**
```typescript
// Apenas uma contagem universal
let totalCredits = 0;

for (const credit of credits) {
  const available = credit.total_credits - credit.used_credits;
  if (available > 0) {
    totalCredits += available;
  }
}

// Subscription credits também somam no total único
if (subscriptionCreditsRemaining > 0) {
  totalCredits += subscriptionCreditsRemaining;
}

return {
  success: true,
  has_credits: totalCredits > 0,
  total_credits: totalCredits,
  // REMOVER: total_vocal, total_instrumental
}
```

### 2. Edge Function: use-credit/index.ts

**REMOVER:**
```typescript
// REMOVER verificação de compatibilidade
const isCreditCompatible = (planId, orderType) => { ... }

// REMOVER bloco que verifica tipo
if (!isCreditCompatible(credit.plan_id, orderType)) {
  // ...
}
```

**SIMPLIFICAR PARA:**
```typescript
// Usar primeiro crédito disponível (FIFO), sem verificação de tipo
const creditToUse = credits.find(c => c.total_credits > c.used_credits);
```

### 3. Hook useCredits.tsx

**ANTES:**
```typescript
interface CreditsState {
  totalAvailable: number;
  totalVocal: number;
  totalInstrumental: number;
  // ...
}
```

**DEPOIS:**
```typescript
interface CreditsState {
  totalCredits: number;
  hasCredits: boolean;
  activePackage: ActivePackage | null;
  subscriptionInfo: SubscriptionInfo | null;
  // REMOVER: totalVocal, totalInstrumental
}
```

### 4. CreditsBanner Simplificado

**ANTES:**
```tsx
{totalVocal > 0 && (
  <Badge><Mic /> {totalVocal} vocais</Badge>
)}
{totalInstrumental > 0 && (
  <Badge><Piano /> {totalInstrumental} instrumentais</Badge>
)}
```

**DEPOIS:**
```tsx
{totalCredits > 0 && (
  <Badge className="bg-primary/20 text-primary">
    <Music className="w-4 h-4" />
    {totalCredits} {totalCredits === 1 ? 'crédito' : 'créditos'}
  </Badge>
)}
```

### 5. Planos.tsx e CreatorSection.tsx

**REMOVER:**
- Estado `isInstrumental`
- Componente `PlanTypeToggle`
- Arrays `instrumentalPlans`, `creatorInstrumentalPlans`
- Bloco de aviso `AlertTriangle` sobre incompatibilidade

**SIMPLIFICAR:**
- Mostrar apenas 3 cards de pacotes avulsos
- Mostrar apenas 3 cards de Creator

### 6. Briefing.tsx

**REMOVER verificações:**
```typescript
// REMOVER estas verificações
const hasVocalCredits = totalVocal > 0;
const hasInstrumentalCredits = totalInstrumental > 0;

// REMOVER badges condicionais de tipo
{hasVocalCredits && <Badge>Crédito Vocal</Badge>}
```

**SIMPLIFICAR PARA:**
```typescript
const hasCredits = totalCredits > 0;

// Badge único
{hasCredits && <Badge>Crédito Disponível ✓</Badge>}
```

---

## Banco de Dados: Registros a Desativar

```sql
-- Pacotes instrumentais separados
UPDATE pricing_config SET is_active = false WHERE id IN (
  'single_instrumental',
  'package_instrumental', 
  'subscription_instrumental'
);

-- Creator instrumentais separados
UPDATE pricing_config SET is_active = false WHERE id IN (
  'creator_start_instrumental',
  'creator_pro_instrumental',
  'creator_studio_instrumental'
);
```

## Banco de Dados: Atualizar Features

```sql
-- Atualizar features dos planos vocais para indicar uso universal
UPDATE pricing_config 
SET features = '["1 crédito universal", "Use para vocal, instrumental ou letra própria", "Entrega em até 48h", "Alta qualidade"]'
WHERE id = 'single';

UPDATE pricing_config 
SET features = '["3 créditos universais", "Use para qualquer tipo de música", "Economia de 16%", "Entrega em até 48h", "Suporte VIP"]'
WHERE id = 'package';

-- etc.
```

---

## Componente a Remover

O arquivo `src/components/PlanTypeToggle.tsx` será **completamente removido** do projeto, pois não terá mais utilidade.

---

## Fluxo do Usuário Simplificado

```text
Homepage
    │
    ▼
Ver Planos (3 pacotes simples + 3 Creator)
    │
    ├─ Único (1 crédito) - R$ 9,90
    ├─ Pacote (3 créditos) - R$ 24,90
    ├─ Super (5 créditos) - R$ 39,90
    │
    ├─ Creator Start (50/mês) - R$ 29,90/mês
    ├─ Creator Pro (150/mês) - R$ 49,90/mês
    └─ Creator Studio (300/mês) - R$ 79,90/mês
    │
    ▼
Comprar/Assinar (Stripe/PIX)
    │
    ▼
Briefing: "O que você quer criar?"
    │
    ├─ 🎤 Música Vocal
    ├─ 📝 Com Minha Letra
    └─ 🎹 Trilha Instrumental
    │
    ▼
Usar 1 crédito universal automaticamente
    │
    ▼
Música entregue no Dashboard
```

---

## Benefícios da Unificação

1. **UX Simplificada**: Menos decisões para o usuário
2. **Menos Código**: Remoção de ~800 linhas de lógica de tipos
3. **Flexibilidade**: Usuário compra créditos e decide depois o que criar
4. **Manutenção**: Menos produtos no Stripe (6 → 3 pacotes, 6 → 3 Creator)
5. **Marketing**: Mensagem mais clara - "Compre créditos, crie o que quiser"
6. **Menos Bugs**: Elimina problemas de "crédito incompatível"

---

## Ordem de Implementação

### Fase 1: Backend (Edge Functions)
1. Atualizar `check-credits/index.ts` - remover segregação
2. Atualizar `use-credit/index.ts` - remover verificação de tipo
3. Atualizar `check-creator-subscription/index.ts` - simplificar
4. Testar funções

### Fase 2: Frontend (Hook e Types)
1. Simplificar `useCredits.tsx`
2. Atualizar `src/lib/plan.ts`
3. Atualizar exportações em `useCredits.tsx`

### Fase 3: UI Components
1. Remover `PlanTypeToggle.tsx`
2. Simplificar `CreditsBanner.tsx`
3. Atualizar `PricingPlans.tsx`
4. Atualizar `CreatorSection.tsx`

### Fase 4: Páginas
1. Simplificar `Planos.tsx`
2. Simplificar `Checkout.tsx`
3. Atualizar `Briefing.tsx`
4. Simplificar `CreatorCheckout.tsx`

### Fase 5: Banco de Dados
1. Desativar planos instrumentais separados
2. Atualizar features dos planos universais

### Fase 6: Traduções
1. Atualizar `pricing.json` (todas as línguas)
2. Atualizar `common.json` (todas as línguas)
3. Remover chaves de toggle e avisos de tipo

---

## Compatibilidade com Dados Existentes

Usuários com créditos "instrumentais" ou "vocais" existentes continuarão funcionando normalmente. A nova lógica simplesmente ignora o tipo do plano de origem e permite usar qualquer crédito para qualquer tipo de criação. Os créditos já comprados não serão perdidos.

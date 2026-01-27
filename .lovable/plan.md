
# Correção: Créditos Creator Start Não Exibidos

## Diagnóstico Completo

### Problema Identificado
Os logs mostram repetidamente o erro:
```
[CHECK-CREATOR-SUBSCRIPTION] Invalid subscription period data - {}
[CHECK-CREATOR-SUBSCRIPTION] ERROR - {"message":"Subscription period data is missing or invalid"}
```

### Causa Raiz
A função `check-creator-subscription` tenta acessar `creatorSub.current_period_start` e `creatorSub.current_period_end` diretamente do objeto retornado por `stripe.subscriptions.list()`. 

Na versão da API Stripe `2025-08-27.basil`, esses campos **não são incluídos** na resposta de listagem. Eles existem apenas:
1. Dentro de `items.data[0].current_period_start/end` (nos itens da assinatura)
2. Quando se faz `stripe.subscriptions.retrieve()` para obter a assinatura completa

### Evidência
Ao buscar a assinatura diretamente (`sub_1StzKREE1g2DASjfmN56ucMd`):
- `items.data[0].current_period_start`: **1769470577** 
- `items.data[0].current_period_end`: **1772148977**
- Metadata `plan_type: 'creator'` está presente

A assinatura **existe e está ativa**, mas a função não consegue ler os dados de período.

---

## Solução Proposta

### Modificação na Edge Function `check-creator-subscription`

Alterar a lógica para obter os dados de período de duas fontes alternativas:

1. **Opção A (mais eficiente)**: Ler de `items.data[0]` que já vem na resposta da listagem
2. **Opção B (fallback)**: Fazer um `retrieve()` da subscription se os campos estiverem ausentes

**Código atual (linhas 89-102):**
```typescript
const planId = creatorSub.metadata?.plan_id || null;
const creditsTotal = parseInt(creatorSub.metadata?.credits || '0');

// Validate timestamps before converting
const currentPeriodEnd = creatorSub.current_period_end;
const currentPeriodStartTs = creatorSub.current_period_start;

if (!currentPeriodEnd || !currentPeriodStartTs || ...) {
  logStep("Invalid subscription period data", ...);
  throw new Error("Subscription period data is missing or invalid");
}
```

**Código corrigido:**
```typescript
const planId = creatorSub.metadata?.plan_id || null;
const creditsTotal = parseInt(creatorSub.metadata?.credits || '0');

// Get period data - try from subscription root first, then from items
let currentPeriodEndTs = creatorSub.current_period_end;
let currentPeriodStartTs = creatorSub.current_period_start;

// Fallback: read from subscription items if not in root
if (!currentPeriodEndTs || !currentPeriodStartTs) {
  const firstItem = creatorSub.items?.data?.[0];
  if (firstItem) {
    currentPeriodEndTs = firstItem.current_period_end;
    currentPeriodStartTs = firstItem.current_period_start;
  }
}

// Ultimate fallback: retrieve full subscription
if (!currentPeriodEndTs || !currentPeriodStartTs) {
  logStep("Fetching full subscription details");
  const fullSub = await stripe.subscriptions.retrieve(creatorSub.id);
  currentPeriodEndTs = fullSub.current_period_end;
  currentPeriodStartTs = fullSub.current_period_start;
}

if (!currentPeriodEndTs || !currentPeriodStartTs || ...) {
  // Only throw after all fallbacks exhausted
  throw new Error("Subscription period data is missing or invalid");
}
```

---

## Verificação de Correções Anteriores

### O que já foi implementado (e está correto):

1. **Validação de timestamps** - Já existe, mas falha porque os dados não estão disponíveis
2. **Contagem de créditos usados** - Query correta com status `.in('status', ['PAID', 'LYRICS_PENDING', ...])`  
3. **Metadata da assinatura** - Está sendo setado corretamente no `create-creator-subscription`

### O que falta corrigir:

1. **Leitura de período da assinatura** - Precisa fallback para `items.data[0]` ou `retrieve()`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/check-creator-subscription/index.ts` | Adicionar fallbacks para leitura de período |

---

## Comportamento Esperado Após Correção

1. Usuário com assinatura Creator Start ativa acessa o dashboard
2. `useCreatorSubscription` hook chama `check-creator-subscription`
3. Função encontra a assinatura ativa no Stripe
4. **NOVO**: Lê `current_period_start/end` de `items.data[0]` 
5. Calcula créditos usados/restantes corretamente
6. Retorna dados completos para o frontend
7. `CreatorSubscriptionManager` exibe:
   - Nome do plano (Creator Start)
   - Créditos restantes (50 de 50)
   - Data de renovação
   - Botão de cancelar assinatura

---

## Seção Técnica

### Tipo TypeScript para Subscription Item
```typescript
interface SubscriptionItem {
  id: string;
  current_period_start: number;
  current_period_end: number;
  // ... outros campos
}
```

### Edge Functions a Reimplantar
1. `check-creator-subscription`

### Teste Sugerido
Após deploy, verificar logs para confirmar:
```
[CHECK-CREATOR-SUBSCRIPTION] Active creator subscription found - {..., subscriptionEnd: "2026-...", currentPeriodStart: "2026-..."}
[CHECK-CREATOR-SUBSCRIPTION] Credits calculated - {creditsTotal: 50, creditsUsed: 0, creditsRemaining: 50}
```

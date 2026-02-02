
# Plano: Correção do Fluxo de Vouchers para Créditos Universais

## Diagnóstico

### Problema 1: `planId` Fixo no Checkout
**Local:** `src/pages/Checkout.tsx` linhas 338 e 365

```typescript
// Linha 338 - validate-voucher
body: { code: voucherCode, planId: 'single' }  // ❌ FIXO

// Linha 365 - apply-voucher  
body: { code: voucherCode, orderId: order.id, planId: 'single' }  // ❌ FIXO
```

O código ignora o tipo real do pedido (instrumental, letra própria).

### Problema 2: Vouchers Antigos Sem Variantes Universais
O voucher `AMIGOSNOTA100` foi criado com:
```json
{
  "plan_ids": ["single"]
}
```

Não inclui `single_custom_lyric` ou `single_instrumental`, que são variantes do mesmo tier universal.

### Problema 3: Edge Functions Validam Estritamente
Nas funções `validate-voucher` e `apply-voucher`:
```typescript
if (voucher.plan_ids && voucher.plan_ids.length > 0 && !voucher.plan_ids.includes(planId)) {
  throw new Error("Este voucher não é válido para o plano selecionado");
}
```

A validação é exata - `single` !== `single_custom_lyric`.

---

## Solução

### Parte 1: Normalizar planId nas Edge Functions

Modificar `validate-voucher/index.ts` e `apply-voucher/index.ts` para normalizar variantes antes da validação:

```typescript
// Normalizar planId para o tier base (créditos universais)
const normalizeToBasePlan = (planId: string): string => {
  // Mapear variantes para o plano base
  if (planId.startsWith('single')) return 'single';
  if (planId.startsWith('package')) return 'package';
  if (planId.startsWith('subscription')) return 'subscription';
  if (planId.startsWith('creator_')) return planId; // Creator plans ficam como estão
  return planId;
};

// Na validação:
const basePlanId = normalizeToBasePlan(planId);
if (voucher.plan_ids && voucher.plan_ids.length > 0) {
  const hasValidPlan = voucher.plan_ids.some(allowedPlan => 
    normalizeToBasePlan(allowedPlan) === basePlanId
  );
  if (!hasValidPlan) {
    throw new Error("Este voucher não é válido para o plano selecionado");
  }
}
```

### Parte 2: Enviar planId Correto do Checkout

Modificar `src/pages/Checkout.tsx` para calcular o planId efetivo:

```typescript
// Antes de chamar validate-voucher e apply-voucher:
const getEffectivePlanId = (): string => {
  if (!order) return currentPlanInfo?.id || 'single';
  
  if (order.has_custom_lyric) return 'single_custom_lyric';
  if (order.is_instrumental) return 'single_instrumental';
  
  return currentPlanInfo?.id || 'single';
};

// Linha 338:
body: { code: voucherCode, planId: getEffectivePlanId() }

// Linha 365:
body: { code: voucherCode, orderId: order.id, planId: getEffectivePlanId() }
```

### Parte 3: Atualizar Voucher Existente (Opcional)

Para garantir compatibilidade imediata, atualizar o voucher `AMIGOSNOTA100`:

```sql
UPDATE vouchers 
SET plan_ids = ARRAY['single', 'single_custom_lyric', 'single_instrumental', 'package', 'subscription']
WHERE code = 'AMIGOSNOTA100';
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/validate-voucher/index.ts` | Adicionar função `normalizeToBasePlan` e usar na validação |
| `supabase/functions/apply-voucher/index.ts` | Mesma normalização de planId |
| `src/pages/Checkout.tsx` | Calcular `effectivePlanId` dinamicamente |

---

## Fluxo Corrigido

```text
┌────────────────────────────────────────────────────────┐
│              CHECKOUT COM VOUCHER                      │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ Determinar effectivePlanId baseado no tipo do pedido│
│   - has_custom_lyric → single_custom_lyric          │
│   - is_instrumental → single_instrumental           │
│   - default → single                                │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ Edge Function: validate-voucher                     │
│   1. Recebe planId = "single_custom_lyric"         │
│   2. Normaliza para basePlan = "single"            │
│   3. Verifica se voucher.plan_ids inclui "single" │
│   4. ✅ Validação passa!                           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ Edge Function: apply-voucher                        │
│   1. Busca preço correto de "single_custom_lyric"  │
│      (R$ 7,90 ao invés de R$ 9,90)                 │
│   2. Calcula desconto sobre preço correto          │
│   3. Aplica voucher com valores corretos           │
└─────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

Após as correções:
- ✅ Vouchers com `plan_ids: ['single']` aceitam automaticamente variantes universais
- ✅ Descontos calculados com preço correto (R$ 7,90 para letra própria, R$ 9,90 para vocal)
- ✅ Compatibilidade total com sistema de créditos universais
- ✅ Vouchers antigos funcionam sem precisar atualizar banco de dados


# Plano: Sincronização Completa de Preços (Admin → BD → Stripe → Frontend)

## Problemas Identificados

### 1. CreatorSection.tsx tem preços HARDCODED (linhas 52-74)
```typescript
const CREATOR_PLANS = [
  { id: 'creator_start', price: 2990 }, // Hardcoded!
  { id: 'creator_pro', price: 4990 },   // Hardcoded!
  { id: 'creator_studio', price: 7990 } // Hardcoded!
];
```

### 2. AdminSettings apenas salva no banco, não sincroniza com Stripe
```typescript
// Atual - apenas atualiza BD
await supabase.from('pricing_config').update({ price_cents })
// Stripe continua com preço antigo!
```

### 3. Edge Functions com Stripe Price IDs hardcoded
- `create-creator-subscription`: usa `price_1Stxc...` fixo
- `create-payment`: usa `stripe_price_id` do BD, mas nem sempre está atualizado

## Arquitetura da Solução

```text
┌──────────────────┐
│  Admin Settings  │
│  (altera preço)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  pricing_config  │────▶│ sync-stripe-     │
│   (database)     │     │     prices       │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │      Stripe      │
         │               │  (novo Price)    │
         │               └────────┬─────────┘
         │                        │
         │◀───────────────────────┘
         │  (atualiza stripe_price_id)
         │
         ▼
┌──────────────────────────────────────────┐
│            Frontend Components           │
├────────────────┬─────────────────────────┤
│ PricingPlans   │  CreatorSection         │
│ (Homepage)     │  (Homepage)             │
├────────────────┼─────────────────────────┤
│ Planos.tsx     │  CreatorCheckout        │
│ (página)       │  (checkout)             │
└────────────────┴─────────────────────────┘
```

## Implementação

### 1. Nova Edge Function: `sync-stripe-prices`

**Arquivo:** `supabase/functions/sync-stripe-prices/index.ts`

**Funcionalidade:**
- Recebe lista de planos com novos preços
- Para cada plano alterado:
  1. Busca ou cria Product no Stripe
  2. Cria novo Price no Stripe (são imutáveis)
  3. Arquiva Price antigo (opcional)
  4. Atualiza `stripe_price_id` no banco
- Retorna status de sincronização

**Planos suportados:**
| Plano | Tipo | Recorrência |
|-------|------|-------------|
| single | Avulso | One-time |
| package | Avulso | One-time |
| subscription | Avulso | One-time |
| creator_start | Assinatura | Monthly |
| creator_pro | Assinatura | Monthly |
| creator_studio | Assinatura | Monthly |

### 2. Atualizar AdminSettings.tsx

**Modificações na função `savePricingConfigs()`:**

```typescript
const savePricingConfigs = async () => {
  setSavingPricing(true);
  try {
    // 1. Salvar no banco de dados
    for (const config of pricingConfigs) {
      await supabase.from('pricing_config').update({...}).eq('id', config.id);
    }

    // 2. NOVO: Sincronizar com Stripe
    const { data, error } = await supabase.functions.invoke('sync-stripe-prices', {
      body: { plans: pricingConfigs.filter(c => c.is_active) }
    });

    if (error) throw error;

    // 3. Atualizar stripe_price_id no estado local
    if (data?.updatedPlans) {
      setPricingConfigs(prev => prev.map(p => {
        const updated = data.updatedPlans.find(u => u.id === p.id);
        return updated ? { ...p, stripe_price_id: updated.stripe_price_id } : p;
      }));
    }

    toast({ title: 'Preços sincronizados!', description: 'BD e Stripe atualizados.' });
  } catch (error) {
    // ...
  }
};
```

**Feedback visual:**
- Indicador de sincronização durante o processo
- Status por plano (✓ Sincronizado / ⏳ Processando)

### 3. Atualizar CreatorSection.tsx

**Problema:** Preços hardcoded não refletem alterações do admin

**Solução:** Buscar preços do banco de dados

```typescript
// Antes (hardcoded)
const CREATOR_PLANS = [
  { id: 'creator_start', price: 2990 },
];

// Depois (dinâmico)
const [creatorPlans, setCreatorPlans] = useState([]);

useEffect(() => {
  const fetchPlans = async () => {
    const { data } = await supabase
      .from('pricing_config')
      .select('*')
      .in('id', ['creator_start', 'creator_pro', 'creator_studio'])
      .eq('is_active', true);
    
    setCreatorPlans(data.map(p => ({
      id: p.id,
      name: p.name,
      credits: getCreditsForPlan(p.id),
      price: p.price_promo_cents || p.price_cents,
      popular: p.is_popular,
    })));
  };
  fetchPlans();
}, []);
```

### 4. Atualizar config.toml

```toml
[functions.sync-stripe-prices]
verify_jwt = false
```

### 5. Atualizar Edge Functions de Checkout

**create-creator-subscription:**
- Buscar `stripe_price_id` da tabela `pricing_config` em vez de usar mapa hardcoded

**create-payment:**
- Já usa `stripe_price_id` do BD, mas garantir fallback correto

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-stripe-prices/index.ts` | **Criar** | Nova Edge Function |
| `supabase/config.toml` | Modificar | Registrar nova função |
| `src/pages/AdminSettings.tsx` | Modificar | Integrar sincronização |
| `src/components/CreatorSection.tsx` | Modificar | Buscar preços do BD |
| `supabase/functions/create-creator-subscription/index.ts` | Modificar | Usar stripe_price_id dinâmico |

## Fluxo de Usuário Final

1. Admin acessa `/admin/configuracoes`
2. Altera preço (ex: Creator Pro R$ 49,90 → R$ 59,90)
3. Clica "Salvar Preços"
4. Sistema executa:
   - ✅ Salva no banco de dados
   - ✅ Cria novo Price no Stripe (price_1Xxx...)
   - ✅ Atualiza `stripe_price_id` na tabela
   - ✅ Exibe confirmação
5. Usuário acessa Homepage:
   - ✅ PricingPlans mostra R$ 59,90
   - ✅ CreatorSection mostra R$ 59,90
6. Usuário acessa `/planos`:
   - ✅ Todos os planos com preços atualizados
7. Usuário faz checkout:
   - ✅ Stripe cobra o valor correto

## Considerações Técnicas

### Stripe Prices são Imutáveis
- Não é possível alterar um Price existente
- A cada alteração, criamos um novo Price
- O Price antigo pode ser arquivado

### Assinaturas Existentes
- Assinantes ativos continuam pagando o preço original
- Novos assinantes pagam o novo preço
- Migração de preço requer proration (opcional)

### Cache do Frontend
- Os componentes usam `useEffect` para buscar dados
- React Query pode ser usado para cache inteligente (já instalado)

## Segurança

- Apenas admins podem chamar `sync-stripe-prices`
- Validação de valores mínimos (> R$ 1,00)
- Log de todas as alterações de preço

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Edge Function sync-stripe-prices | 35 min |
| Atualização AdminSettings | 15 min |
| Atualização CreatorSection | 15 min |
| Atualização create-creator-subscription | 10 min |
| Config e testes | 10 min |
| **Total** | **~1h25** |

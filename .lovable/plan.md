
# Integrar Créditos da Assinatura Creator ao Sistema Principal

## Problema Identificado

O sistema possui dois mecanismos de créditos independentes:

| Sistema | Tabela/Fonte | Hook | Componentes |
|---------|--------------|------|-------------|
| Pacotes Avulsos | `user_credits` | `useCredits` | CreditsBanner, CreditsManagement, CreditTransfer, Briefing |
| Assinatura Creator | Stripe API | `useCreatorSubscription` | CreatorSubscriptionManager, Hero (badge) |

A usuária tem uma assinatura "Creator Start" com 50 créditos, mas:
- Na aba "Créditos" mostra "0 músicas disponíveis"
- No Dashboard mostra "Sem créditos disponíveis"
- Na aba "Transferir" mostra "Você não tem créditos"
- Ao criar música, não oferece a opção de usar crédito

## Solucao

Modificar o hook `useCredits` e a edge function `check-credits` para considerar AMBOS os sistemas de créditos, dando prioridade aos créditos da assinatura Creator.

---

## Arquivos a Modificar

### 1. Edge Function `check-credits` 

Adicionar lógica para verificar se o usuário tem assinatura Creator ativa e incluir esses créditos no total.

**Lógica:**
1. Buscar créditos da tabela `user_credits` (comportamento atual)
2. **NOVO:** Chamar Stripe para verificar assinatura Creator ativa
3. Se tiver assinatura:
   - Calcular créditos restantes baseado em `credits_total` - pedidos do ciclo atual
   - Retornar informação sobre a fonte ("subscription" vs "package")
4. Somar totais de ambas as fontes

### 2. Hook `useCredits`

Atualizar interface para incluir informações de créditos de assinatura:
- `subscriptionCredits` - créditos da assinatura Creator
- `packageCredits` - créditos de pacotes avulsos
- `totalAvailable` - soma de ambos

### 3. Edge Function `use-credit`

Modificar para aceitar créditos de assinatura:
- Se o usuário tem assinatura, permitir uso mesmo sem registros em `user_credits`
- Marcar o pedido com `plan_id` do plano Creator para contabilização correta

### 4. Componentes UI (ajustes menores)

- `CreditsBanner`: Mostrar créditos de assinatura quando disponíveis
- `CreditsManagement`: Diferenciar créditos de assinatura vs pacotes
- `CreditTransfer`: Créditos de assinatura **nao podem** ser transferidos (sao mensais e resetam)

---

## Fluxo Atualizado

```text
+-------------------------+
|    Usuario Logado       |
+------------+------------+
             |
             v
+-------------------------+
|    check-credits        |
+------------+------------+
             |
     +-------+--------+
     |                |
     v                v
+----------+    +-----------+
| user_    |    | Stripe    |
| credits  |    | API       |
| (table)  |    | (Creator) |
+----+-----+    +-----+-----+
     |                |
     v                v
+-------------------------+
| Soma total:             |
| - package_credits: 0    |
| - subscription_credits: |
|   50 (Creator Start)    |
| - total: 50             |
+-------------------------+
             |
             v
+-------------------------+
| Frontend atualizado     |
| mostrando 50 creditos   |
+-------------------------+
```

---

## Secao Tecnica

### Modificacoes em `check-credits/index.ts`

```typescript
// Adicionar no inicio: importar Stripe
import Stripe from "https://esm.sh/stripe@18.5.0";

// Na funcao principal, apos buscar user_credits:

// Check for Creator subscription credits
let subscriptionCredits = 0;
let subscriptionInfo = null;

try {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey && user.email) {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    if (customers.data.length > 0) {
      // Find active creator subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 10,
      });
      
      const creatorSub = subscriptions.data.find(
        sub => sub.metadata?.plan_type === 'creator'
      );
      
      if (creatorSub) {
        const creditsTotal = parseInt(creatorSub.metadata?.credits || '0');
        // Get period from items
        const firstItem = creatorSub.items?.data?.[0];
        const periodStart = new Date(firstItem.current_period_start * 1000).toISOString();
        
        // Count orders in current period
        const { count } = await supabaseClient
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', periodStart)
          .eq('payment_status', 'PAID')
          .not('plan_id', 'is', null);
        
        subscriptionCredits = Math.max(0, creditsTotal - (count || 0));
        subscriptionInfo = {
          plan_id: creatorSub.metadata?.plan_id,
          credits_total: creditsTotal,
          credits_used: count || 0,
          credits_remaining: subscriptionCredits,
          is_instrumental: creatorSub.metadata?.plan_id?.includes('instrumental')
        };
      }
    }
  }
} catch (stripeError) {
  logStep("Stripe check failed", { error: stripeError.message });
  // Continue without subscription credits
}

// Update totals
totalAvailable += subscriptionCredits;
if (subscriptionInfo?.is_instrumental) {
  totalInstrumental += subscriptionCredits;
} else {
  totalVocal += subscriptionCredits;
}
```

### Modificacoes em `use-credit/index.ts`

Adicionar fallback para creditos de assinatura quando nao houver pacotes:

```typescript
// Apos verificar user_credits e nao encontrar:
if (!creditToUse) {
  // Check for subscription credits
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey && user.email) {
    // Similar logic to check-credits
    // If subscription has credits, mark order as paid with plan_id
  }
}
```

### Modificacoes em `CreditsBanner.tsx` e `CreditsManagement.tsx`

Atualizar para mostrar fonte dos creditos:

```typescript
// Adicionar badge visual indicando:
// "50 creditos (Assinatura Creator Start)"
// vs
// "3 creditos (Pacote de Musicas)"
```

---

## Restricoes de Transferencia

Creditos de assinatura Creator **NAO** podem ser transferidos porque:
1. Sao creditos mensais que resetam automaticamente
2. Estao vinculados ao ciclo de faturamento do Stripe
3. Nao existem na tabela `user_credits`

O componente `CreditTransfer` deve mostrar apenas creditos de pacotes avulsos.

---

## Resultado Esperado

Apos as modificacoes:

1. **Dashboard** mostra: "50 creditos disponiveis (Creator Start)"
2. **Aba Creditos** mostra: Secao separada para creditos da assinatura
3. **Aba Transferir** mostra: "Creditos de assinatura nao podem ser transferidos" + creditos avulsos (se houver)
4. **Briefing** permite usar creditos da assinatura para criar musica
5. **Hero badge** continua mostrando "Start" como hoje

---

## Prioridade de Uso

Quando o usuario tem AMBOS (pacote avulso + assinatura):
1. Usar primeiro os creditos de **pacotes avulsos** (expiram)
2. Depois usar creditos de **assinatura** (renovam mensalmente)

Isso evita que pacotes comprados expirem sem uso.

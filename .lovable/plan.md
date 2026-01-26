
# Plano: Redirecionamento após Compra e Exibição de Créditos Creator

## Visão Geral

Serão feitas duas correções principais:
1. Redirecionar automaticamente para o dashboard após confirmação de pagamento
2. Corrigir o bug de "Invalid time value" que impede a exibição dos créditos das assinaturas Creator

---

## Problema 1: Redirecionamento após Pagamento

### Situação Atual
- **Pacotes Avulsos**: Página `PaymentSuccess.tsx` mostra confirmação com botões, mas usuário precisa clicar para navegar
- **Assinaturas Creator**: Redireciona para `/planos?subscription=success` em vez do dashboard

### Solução

**1.1 - PaymentSuccess.tsx (Pacotes Avulsos)**

Adicionar redirecionamento automático após verificação bem-sucedida:
- Após pagamento confirmado, redirecionar para `/dashboard` após 3 segundos
- Exibir contador regressivo na tela de sucesso
- Manter botões disponíveis caso usuário queira navegar antes

**1.2 - create-creator-subscription (Edge Function)**

Alterar a URL de sucesso:
```text
Atual:   /planos?subscription=success&plan=${planId}
Novo:    /dashboard?subscription=success&plan=${planId}
```

**1.3 - Dashboard.tsx**

Adicionar tratamento para o parâmetro `subscription=success`:
- Detectar parâmetro na URL
- Exibir toast de confirmação da assinatura Creator
- Limpar parâmetros da URL após exibição

---

## Problema 2: Créditos Creator Não Exibidos

### Diagnóstico
Os logs mostram erro `Invalid time value` na função `check-creator-subscription`. O erro ocorre ao converter timestamps do Stripe para datas JavaScript.

### Causa Raiz
Na linha 91-92 do `check-creator-subscription`:
```typescript
const subscriptionEnd = new Date(creatorSub.current_period_end * 1000).toISOString();
const currentPeriodStart = new Date(creatorSub.current_period_start * 1000).toISOString();
```

Se `current_period_start` ou `current_period_end` forem undefined ou inválidos, a conversão falha.

### Solução

**2.1 - check-creator-subscription (Edge Function)**

Adicionar validação antes de converter timestamps:
```typescript
// Validar timestamps antes de converter
const currentPeriodEnd = creatorSub.current_period_end;
const currentPeriodStart = creatorSub.current_period_start;

if (!currentPeriodEnd || !currentPeriodStart) {
  throw new Error("Subscription period data is missing");
}

const subscriptionEnd = new Date(currentPeriodEnd * 1000).toISOString();
const currentPeriodStartDate = new Date(currentPeriodStart * 1000).toISOString();
```

**2.2 - Melhoria na contagem de créditos usados**

Ajustar a query que conta pedidos para incluir todos os status relevantes:
```typescript
.in('status', ['PAID', 'MUSIC_READY', 'LYRICS_PENDING', 'LYRICS_APPROVED', 'GENERATING', 'COMPLETED'])
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/PaymentSuccess.tsx` | Adicionar redirecionamento automático após 3s |
| `supabase/functions/create-creator-subscription/index.ts` | Alterar success_url para /dashboard |
| `src/pages/Dashboard.tsx` | Tratar subscription=success query param |
| `supabase/functions/check-creator-subscription/index.ts` | Validar timestamps antes de converter |

---

## Fluxo Após Implementação

```text
┌─────────────────────────────────────────────────────────────┐
│                    PACOTES AVULSOS                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Pagamento no Stripe                                      │
│ 2. Redirect para /pagamento-sucesso                         │
│ 3. Verificação automática do pagamento                      │
│ 4. Toast de sucesso + contador 3s                           │
│ 5. Redirect automático para /dashboard                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 ASSINATURAS CREATOR                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Pagamento no Stripe                                      │
│ 2. Redirect direto para /dashboard?subscription=success     │
│ 3. Dashboard detecta parâmetro                              │
│ 4. Toast de confirmação da assinatura                       │
│ 5. Créditos exibidos corretamente via useCreatorSubscription│
└─────────────────────────────────────────────────────────────┘
```

---

## Seção Técnica

### Dependências
- Nenhuma nova dependência necessária

### Edge Functions a Reimplantar
1. `create-creator-subscription`
2. `check-creator-subscription`

### Considerações
- O redirecionamento de 3 segundos dá tempo para o usuário ler a confirmação
- Os botões de navegação permanecem disponíveis para ação imediata
- A validação de timestamps previne crashes futuros

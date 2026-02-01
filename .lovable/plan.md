

# Plano: Diferenciar Notificações de Pagamento vs Uso de Créditos

## Problema Identificado

Quando o usuário **consome um crédito**, ele recebe a notificação "Pagamento aprovado!", mas não houve pagamento - ele usou créditos que já tinha. As mensagens devem ser diferenciadas:

| Cenário | Mensagem Atual | Mensagem Correta |
|---------|---------------|-----------------|
| Pagamento (cartão/PIX) | "Pagamento aprovado!" | "Pagamento aprovado!" ✓ |
| Uso de créditos | "Pagamento aprovado!" ❌ | "Pedido recebido!" |

## Análise Técnica

O campo `payment_method` no banco de dados já diferencia:
- `'credits'` → crédito de pacote consumido
- `'subscription'` → crédito de assinatura consumido  
- `'card'`, `'pix'` → pagamento real

## Solução

### 1. Modificar NotificationCenter.tsx

Adicionar busca pelo campo `payment_method` e criar notificações com mensagens diferentes baseadas no tipo:

```text
Mudanças no NotificationCenter.tsx:
- Incluir payment_method na query de paidOrders
- Criar tipo de notificação 'order_received' para créditos
- Manter 'payment_approved' para pagamentos reais
- Usar ícones diferentes (Sparkles para créditos, CreditCard para pagamento)
```

### 2. Adicionar Traduções

Novas chaves em `public/locales/*/common.json`:

```json
{
  "notifications": {
    "orderReceived": "Pedido recebido!",
    "orderReceivedDesc": "Estamos criando sua música. Acompanhe o progresso no dashboard.",
    "paymentApproved": "Pagamento aprovado!",
    "paymentApprovedDesc": "Seu pagamento foi confirmado e estamos criando sua música."
  }
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/NotificationCenter.tsx` | Diferenciar notificações por `payment_method` |
| `public/locales/pt-BR/common.json` | Adicionar `orderReceived` e `orderReceivedDesc` |
| `public/locales/en/common.json` | Traduções em inglês |
| `public/locales/es/common.json` | Traduções em espanhol |
| `public/locales/it/common.json` | Traduções em italiano |

## Detalhes da Implementação

### NotificationCenter.tsx - Mudanças

```typescript
// 1. Adicionar payment_method na query
const { data: paidOrders } = await supabase
  .from('orders')
  .select('id, status, payment_status, payment_method, updated_at, song_title')
  // ... resto da query

// 2. Criar notificações diferenciadas
paidOrders.forEach((order) => {
  const isCredit = order.payment_method === 'credits' || 
                   order.payment_method === 'subscription';
  
  allNotifications.push({
    id: isCredit ? `order_${order.id}` : `payment_${order.id}`,
    type: isCredit ? 'order_received' : 'payment_approved',
    title: isCredit 
      ? t('notifications.orderReceived', 'Pedido recebido!')
      : t('notifications.paymentApproved', 'Pagamento aprovado!'),
    message: isCredit
      ? t('notifications.orderReceivedDesc', 'Estamos criando sua música.')
      : t('notifications.paymentApprovedDesc', 'Seu pagamento foi confirmado.'),
    // ...
  });
});

// 3. Adicionar ícone para order_received
case 'order_received':
  return <Sparkles className="w-4 h-4 text-purple-500" />;

// 4. Adicionar cor de fundo
case 'order_received':
  return 'bg-purple-500/10 border-purple-500/20';
```

## Resultado Esperado

- **Compra de plano/música** → Notificação: "💳 Pagamento aprovado! Seu pagamento foi confirmado..."
- **Uso de crédito** → Notificação: "✨ Pedido recebido! Estamos criando sua música..."


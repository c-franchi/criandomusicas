
# Correção: Adicionar Notificação Admin para Vouchers 100%

## Problema Identificado

Quando um pedido é pago via voucher com 100% de desconto, a função `apply-voucher` marca o pedido como `PAID` mas **não notifica o administrador**. O pedido do Ribamar (voucher `AMIGOSNOTA100`) foi criado sem que você recebesse:
- E-mail
- WhatsApp
- Notificação no sistema

## Solução

Adicionar a chamada para `notify-admin-order` na função `apply-voucher` quando o pedido é gratuito via voucher.

## Alteração Necessária

### supabase/functions/apply-voucher/index.ts

Após atualizar o pedido (linha 205), adicionar o bloco de notificação:

```typescript
// Após linha 205 (after order update success check)

// Notify admin about new free order via voucher
if (isFree) {
  try {
    // Get user profile for name
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();

    await supabaseClient.functions.invoke('notify-admin-order', {
      body: {
        orderId,
        userId,
        orderType: order.is_instrumental ? 'instrumental' : 'vocal',
        userName: profileData?.name || 'Cliente',
        musicType: planId || 'personalizada',
        isPixReceipt: false,
      },
    });
    logStep("Admin notified about free voucher order");
  } catch (notifyError) {
    logStep("Admin notification failed (non-blocking)", { error: String(notifyError) });
    // Don't fail the whole request for notification errors
  }
}
```

## Resultado Esperado

Após a correção:
1. Pedidos pagos com voucher 100% dispararão:
   - E-mail para `neizao.franchi@gmail.com`
   - WhatsApp para `5516997813038`
   - Notificação push (se ativo)
2. O log mostrará: `[APPLY-VOUCHER] Admin notified about free voucher order`

## Seção Técnica

### Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────┐
│                    VOUCHER 100% APLICADO                    │
├─────────────────────────────────────────────────────────────┤
│  1. Validar voucher                                         │
│  2. Calcular desconto (100%)                                │
│  3. Criar registro de redemption                            │
│  4. Atualizar pedido (PAID + LYRICS_PENDING/APPROVED)       │
│  5. ✨ NOVO: Chamar notify-admin-order                      │
│     └─ E-mail (Resend)                                      │
│     └─ WhatsApp (TextMeBot)                                 │
│     └─ Push notification                                    │
│  6. Retornar sucesso                                        │
└─────────────────────────────────────────────────────────────┘
```

### Consistência com Outros Fluxos

A notificação seguirá o mesmo padrão usado em:
- `verify-payment/index.ts` (linhas 180-195)
- `use-credit/index.ts` (linhas 258-273 e 348-363)

O tratamento de erro é não-bloqueante (`try/catch` silencioso) para garantir que falhas de notificação não impeçam o processamento do pedido.

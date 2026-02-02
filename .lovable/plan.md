

# Plano: Mensagem "Em Breve" para Sistema de Créditos de Vídeo

## Diagnóstico Atual

O sistema de vídeos **NÃO** utiliza créditos atualmente:

| Aspecto | Implementação Atual |
|---------|---------------------|
| Pagamento | R$ 50,00 via Stripe ou PIX |
| Créditos | Não implementado |
| Fluxo | VideoCheckout → Pagamento → VideoUpload |

### Código relevante encontrado:

```typescript
// VideoCheckout.tsx - linha 121
amount: 5000, // R$ 50 (valor fixo)
status: 'AWAITING_PAYMENT',
payment_status: 'PENDING'
```

O sistema de vídeos funciona **separadamente** do sistema de créditos de música.

## Solução Proposta

Adicionar uma mensagem informativa na seção de vídeos indicando que o sistema de créditos para vídeos está **em desenvolvimento**.

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/VideoServiceSection.tsx` | Adicionar badge "Em breve: use seus créditos!" |

### Implementação

Adicionar um aviso discreto abaixo do preço ou no CTA:

```typescript
// Adicionar após o card de preço
<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 max-w-2xl mx-auto mb-4">
  <div className="flex items-center gap-2 justify-center">
    <Sparkles className="w-4 h-4 text-amber-500" />
    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
      Em breve: use seus créditos para criar vídeos!
    </p>
  </div>
  <p className="text-xs text-muted-foreground text-center mt-1">
    Estamos implementando o sistema de créditos para vídeos.
  </p>
</div>
```

## Resultado Visual

O usuário verá:
- O serviço de vídeo funcionando normalmente (pagamento R$ 50)
- Um aviso amigável sobre a futura integração com créditos
- Expectativa clara de que a funcionalidade está em desenvolvimento

## Próximos Passos (Futuro)

Quando decidir implementar créditos para vídeos:
1. Definir quantos créditos = 1 vídeo
2. Modificar `VideoCheckout.tsx` para verificar créditos antes do pagamento
3. Criar opção: "Usar créditos" ou "Pagar R$ 50"
4. Adaptar Edge Function `use-credit` para aceitar pedidos de vídeo



# ✅ Correção Aplicada: Fluxo de Créditos Preview

## Status: CONCLUÍDO

A correção foi aplicada no `Briefing.tsx` linha 2222.

**De:**
```javascript
if (creditsData?.has_credits && creditsData?.total_available > 0) {
```

**Para:**
```javascript
if (creditsData?.has_credits && (creditsData?.total_available > 0 || creditsData?.preview_credit_available)) {
```

## Resultado

Agora usuários com apenas crédito preview conseguirão:
1. Completar o briefing normalmente
2. Ter o crédito preview consumido automaticamente
3. Gerar sua música de 40s de teste

A priorização de créditos continua funcionando:
- Créditos normais são usados primeiro
- Preview credit só é usado quando não há créditos regulares

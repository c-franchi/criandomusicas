
# ✅ Correções de Créditos Preview - CONCLUÍDO

## Correções Aplicadas

### 1. Verificação de créditos no modo detalhado (linha 2222)
```javascript
// De:
if (creditsData?.has_credits && creditsData?.total_available > 0)
// Para:
if (creditsData?.has_credits && (creditsData?.total_available > 0 || creditsData?.preview_credit_available))
```

### 2. Verificação de créditos no modo rápido (linha 2661)
```javascript
// Mesma correção aplicada no fluxo finishBriefingWithData
```

### 3. Confirmação de título no modo rápido
- Adicionado AlertDialog no QuickCreation.tsx
- Pergunta ao usuário se deseja gerar título automaticamente
- Opções: "Voltar e adicionar título" ou "Sim, gerar automaticamente"

## Status Final

✅ Crédito preview funciona em AMBOS os modos:
- Criação Rápida (QuickCreation)
- Criação Detalhada (Briefing completo)

✅ Modal de confirmação de título adicionado no modo rápido

## Priorização de Créditos (inalterada)
1. Créditos normais (pacotes/assinaturas)
2. Preview credit (fallback)

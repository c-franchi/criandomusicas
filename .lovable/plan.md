
# Plano de Correção: Fluxo de Créditos Preview

## Problema Identificado

No `Briefing.tsx`, a verificação de créditos não considera corretamente o crédito preview quando ele é o único disponível, causando uma experiência quebrada para novos usuários que têm apenas o crédito de teste gratuito.

## Correções Necessárias

### 1. Corrigir verificação no Briefing.tsx

**Arquivo:** `src/pages/Briefing.tsx`  
**Linha:** ~2222

**De:**
```javascript
if (creditsData?.has_credits && creditsData?.total_available > 0) {
```

**Para:**
```javascript
if (creditsData?.has_credits && (creditsData?.total_available > 0 || creditsData?.preview_credit_available)) {
```

### 2. Verificar consistência no Checkout.tsx

O Checkout.tsx usa o hook `useCredits` que já calcula `hasCredits` corretamente incluindo preview:
```javascript
hasCredits: totalCredits > 0 || (data.preview_credit_available === true)
```

Este fluxo está OK - não precisa de alteração.

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE USO DE CRÉDITOS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuário completa briefing                                   │
│                    │                                            │
│                    ▼                                            │
│  2. Verifica créditos (check-credits)                          │
│     ├── total_available > 0  ──────► Usar crédito normal       │
│     ├── preview_credit_available ──► Usar crédito preview      │
│     └── nenhum ────────────────────► Modal "Sem Créditos"      │
│                    │                                            │
│                    ▼                                            │
│  3. Chamar use-credit                                          │
│     ├── Prioriza: Normal > Preview                             │
│     └── Marca is_preview=true se usar preview                  │
│                    │                                            │
│                    ▼                                            │
│  4. Processar ordem                                            │
│     ├── Instrumental → Dashboard                               │
│     ├── Custom Lyric → CreateSong                              │
│     └── Vocal → Gerar lyrics → CreateSong                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Resumo da Segurança

| Fonte de Crédito | Prioridade | is_preview | Limitações |
|------------------|------------|------------|------------|
| Pacotes (single, package, subscription) | 1ª | false | Nenhuma |
| Assinatura Creator | 2ª | false | Nenhuma |
| Preview Credit | 3ª (fallback) | true | 40s, sem download |

## Impacto

- **Usuários afetados:** Novos usuários que só possuem o crédito preview
- **Risco:** Baixo (correção simples de condição lógica)
- **Benefício:** Preview credits funcionarão corretamente no fluxo automático do briefing

## Seção Técnica

A correção envolve apenas adicionar a verificação de `preview_credit_available` na condição existente. O `use-credit` já sabe como priorizar créditos normais sobre preview, então não precisa de alteração.

A lógica de priorização no `use-credit/index.ts` está correta:
```javascript
// Prioritize regular credits over preview credits
for (const credit of credits) {
  if (credit.total_credits > credit.used_credits) {
    if (credit.plan_id === 'preview_test') {
      previewCredit = credit;
      continue;  // Armazena mas não usa ainda
    }
    creditToUse = credit;
    break;  // Usa primeiro crédito regular encontrado
  }
}

// Se não encontrou crédito regular, usa preview
if (!creditToUse && previewCredit) {
  creditToUse = previewCredit;
}
```


# Plano: Corrigir Sistema de Crédito Preview para Novos Usuários

## Problema Identificado

O usuário `historiasemconto@gmail.com` **TEM** o crédito preview no banco de dados:
- `plan_id: preview_test`
- `total_credits: 1`
- `used_credits: 0`
- `is_active: true`

Porém, o sistema mostra "Créditos insuficientes" porque:

1. **Edge Function `check-credits`** (linha 104): O crédito preview é **excluído** do `total_credits`
2. **Hook `useCredits`** (linha 113): Define `hasCredits: totalCredits > 0` = `false`
3. **Briefing.tsx** (linha 1999): Verifica `!has_credits` e mostra modal de erro

## Solução

Modificar a lógica para considerar o crédito preview como válido para criação de música.

### Mudança 1: Hook `useCredits.tsx`

Atualizar a linha 113 para incluir preview:

```typescript
// ANTES
hasCredits: totalCredits > 0,

// DEPOIS  
hasCredits: totalCredits > 0 || (data.preview_credit_available === true),
```

### Mudança 2: Verificação no Briefing.tsx

Atualizar a verificação na linha 1999:

```typescript
// ANTES
if (!creditsData?.has_credits || creditsData?.total_available <= 0) {

// DEPOIS
const hasAnyCredit = creditsData?.has_credits || 
                     creditsData?.total_available > 0 || 
                     creditsData?.preview_credit_available === true;
if (!hasAnyCredit) {
```

### Mudança 3: Exibição de Créditos no Dashboard/Perfil

No `CreditsManagement.tsx` e `CreditsBanner.tsx`, mostrar que o usuário tem 1 crédito preview disponível quando `previewCreditAvailable` é true.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCredits.tsx` | Incluir preview no `hasCredits` |
| `src/pages/Briefing.tsx` | Verificar `preview_credit_available` |
| `src/components/CreditsBanner.tsx` | Mostrar crédito preview |
| `src/components/CreditsManagement.tsx` | Exibir crédito preview na listagem |

## Fluxo Corrigido

```text
Novo Usuário → Login Google
       ↓
Trigger banco → Cria crédito preview_test
       ↓
check-credits → Retorna preview_credit_available: true
       ↓
useCredits → hasCredits: true (inclui preview)
       ↓
Briefing → Permite criar música (preview 40s)
       ↓
Dashboard → Mostra "1 crédito preview disponível"
```

## Resultado Esperado

- Usuários com apenas crédito preview podem criar músicas
- UI mostra claramente que é um crédito de preview (40 segundos)
- Modal "Créditos insuficientes" não aparece para usuários com preview disponível
- Após usar o preview, sistema redireciona para compra

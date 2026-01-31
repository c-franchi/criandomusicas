
# Plano: Correção da Função de Enviar/Receber Créditos

## Problemas Identificados

### 1. Bug Crítico - Atualização com ID Incorreto
No arquivo `accept-credit-transfer`, quando o usuário resgata usando `transferCode`, a função tenta atualizar usando `transferId` que é **undefined**:
```typescript
// Linha 173 - BUG: transferId é undefined quando usa código
.eq('id', transferId)  // ❌ Deveria ser transfer.id
```

### 2. CORS Headers Incompletos
Ambas as funções usam headers CORS desatualizados, faltando os novos headers do Supabase SDK:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`

### 3. Lógica Obsoleta de Tipos de Crédito
O sistema migrou para **créditos universais**, mas:
- `transfer-credits` ainda filtra por `vocal`/`instrumental`
- `CreditTransfer.tsx` ainda exibe seletor de tipo de crédito
- Os valores `totalVocal` e `totalInstrumental` são agora idênticos

---

## Correções Necessárias

### Arquivo: `supabase/functions/accept-credit-transfer/index.ts`

**Correção 1:** Atualizar headers CORS
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

**Correção 2:** Usar `transfer.id` em todas as atualizações
```typescript
// Linhas 136, 173, 209 - usar transfer.id consistentemente
.eq('id', transfer.id)
```

---

### Arquivo: `supabase/functions/transfer-credits/index.ts`

**Correção 1:** Atualizar headers CORS (mesmo padrão)

**Correção 2:** Remover filtro por tipo de crédito (usar créditos universais)
```typescript
// Antes: filtrava por instrumental/vocal
const isCorrectType = creditType === 'instrumental' 
  ? credit.plan_id.includes('instrumental')
  : !credit.plan_id.includes('instrumental');

// Depois: aceita qualquer crédito disponível
const hasAvailable = credit.total_credits - (credit.used_credits || 0) > 0;
```

**Correção 3:** Remover `creditType` da interface (opcional, manter para compatibilidade mas ignorar)

---

### Arquivo: `src/components/CreditTransfer.tsx`

**Correção 1:** Remover seleção de tipo de crédito
- Remover o `<Select>` de vocal/instrumental
- Usar apenas `totalAvailable` (créditos universais)

**Correção 2:** Simplificar verificação de créditos
```typescript
// Antes
const availableForType = creditType === 'vocal' ? totalVocal : totalInstrumental;

// Depois
const availableCredits = totalAvailable;
```

**Correção 3:** Atualizar request para edge function
```typescript
// Não enviar mais creditType, ou enviar valor padrão
body: { 
  toEmail: shareMode === 'email' ? email : null,
  amount: 1,
  message: message.trim() || null
}
```

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/accept-credit-transfer/index.ts` | CORS + bug transferId |
| `supabase/functions/transfer-credits/index.ts` | CORS + remover filtro tipo |
| `src/components/CreditTransfer.tsx` | Simplificar UI, remover seletor tipo |

---

## Resultado Esperado
- Transferências funcionarão corretamente via código e email
- Resgate de códigos (`TRF-XXXXXXXX`) não falhará mais
- Interface simplificada usando créditos universais
- Compatibilidade com o novo modelo de créditos do sistema

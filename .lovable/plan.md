
# Correção da Pronúncia "UTI" → "utei"

## Contexto do Problema

O sistema de pronúncia fonética foi acionado corretamente para o termo "UTI", porém a pronúncia registrada foi `U-T-I` (soletrado letra por letra), quando o correto em português brasileiro é `utei` (como se pronuncia naturalmente "UTI" - Unidade de Terapia Intensiva).

**Situação Atual no Pedido:**
- Termo detectado: `UTI`
- Pronúncia registrada: `U-T-I` (incorreto - soletrado)
- Pronúncia correta: `utei` (como se fala naturalmente)

O `final_prompt` atual mostra: `"...na U-T-I, sem vida..."` quando deveria ser `"...na utei, sem vida..."`

---

## Plano de Ação

### Etapa 1: Corrigir o Pedido Atual
Atualizar o campo `pronunciations` e regenerar o `final_prompt` com a pronúncia correta:

```sql
UPDATE public.orders 
SET pronunciations = '[{"term": "UTI", "phonetic": "utei"}]'::jsonb
WHERE id = '276c6328-1bfe-45e1-ab9f-386b1231c5fb';
```

Depois, chamar a função `generate-style-prompt` novamente para regenerar o `final_prompt` com "utei" em vez de "U-T-I".

### Etapa 2: Criar Dicionário de Pronúncias Brasileiras Comuns
Adicionar uma lista de termos brasileiros comuns que já possuem pronúncia padrão, para pré-popular o modal de pronúncia:

| Termo | Pronúncia Correta |
|-------|------------------|
| UTI | utei |
| ONU | onu |
| PIX | pix |
| FIFA | fifa |
| NASA | nasa |
| INSS | inésse |
| CPF | cê pê éfe |
| RG | érre gê |
| PIB | pib |
| CEO | ci-i-ôu |

### Etapa 3: Atualizar o Modal de Pronúncia
Melhorar o `PronunciationModal.tsx` para:
1. Mostrar sugestões de pronúncia para termos conhecidos
2. Adicionar exemplos mais claros (incluindo UTI → utei)
3. Detectar automaticamente siglas brasileiras comuns e sugerir a pronúncia padrão

---

## Detalhes Técnicos

### Arquivos a Modificar

1. **Edge Functions** (`generate-lyrics/index.ts` e `generate-style-prompt/index.ts`):
   - Adicionar dicionário `BRAZILIAN_PRONUNCIATIONS` com termos comuns
   - Pré-popular pronúncias conhecidas antes de solicitar ao usuário

2. **PronunciationModal.tsx**:
   - Exibir sugestão automática para termos conhecidos
   - Atualizar exemplos para incluir "UTI → utei"

3. **Correção Imediata**:
   - Atualizar banco de dados com pronúncia correta
   - Regenerar o prompt do pedido atual

### Dicionário Proposto

```typescript
const BRAZILIAN_PRONUNCIATIONS: Record<string, string> = {
  'UTI': 'utei',
  'ONU': 'onu',
  'FIFA': 'fifa',
  'NASA': 'nasa',
  'PIX': 'pix',
  'INSS': 'inésse',
  'PIB': 'pib',
  // Termos que devem ser soletrados
  'CPF': 'cê pê éfe',
  'RG': 'érre gê',
  'CEO': 'ci-i-ôu',
  'DJ': 'di-jêi',
};
```

---

## Resultado Esperado

1. **Pedido atual**: O `final_prompt` será regenerado com `"...na utei, sem vida..."` em vez de `"...na U-T-I, sem vida..."`

2. **Pedidos futuros**: Quando "UTI" for detectado, o sistema já sugerirá automaticamente "utei" como pronúncia, facilitando para o usuário

3. **Modal melhorado**: Exemplos mais claros distinguindo entre:
   - Termos pronunciados como palavra (UTI → utei)
   - Termos soletrados (CPF → cê pê éfe)

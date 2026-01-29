
# Plano: Correção de Preços Instrumentais e Clarificação de Créditos Creator

## Problemas Identificados

### 1. Valores Instrumentais Inconsistentes
O registro `single_custom_lyric` no banco de dados tem:
- `price_cents: 790` (R$ 7,90)
- `price_display: R$ 9,90`

Isso causa inconsistência visual no checkout.

### 2. Consumo de Créditos Creator
A lógica de consumo de créditos está funcionando corretamente nas Edge Functions, mas preciso:
- Verificar se o `plan_id` está sendo salvo corretamente nos pedidos ao usar créditos Creator
- Confirmar que a contagem de uso considera apenas pedidos do ciclo atual

### 3. Falta Clarificação de Créditos Vocal/Instrumental
Os planos Creator na homepage (`CreatorSection.tsx`) e página de planos (`Planos.tsx`) não deixam claro que:
- Créditos **vocais** só podem ser usados para músicas cantadas
- Créditos **instrumentais** só podem ser usados para músicas instrumentais
- Os créditos NÃO são intercambiáveis

---

## Mudanças Propostas

### 1. Correção no Banco de Dados
Atualizar o registro `single_custom_lyric` para ter preços consistentes.

| Campo | Valor Atual | Valor Correto |
|-------|-------------|---------------|
| price_display | R$ 9,90 | R$ 7,90 |

### 2. Adicionar Aviso de Tipo de Crédito nos Planos Creator

#### Na Homepage (`src/components/CreatorSection.tsx`)
Adicionar um aviso abaixo dos cards de planos Creator explicando:
- Créditos são específicos por tipo (vocal ou instrumental)
- Usar o toggle para alternar entre versões vocal e instrumental

#### Na Página de Planos (`src/pages/Planos.tsx`)
Na seção Creator, adicionar um badge ou aviso visual após o toggle indicando:
- "Créditos vocais: apenas para músicas com voz"
- "Créditos instrumentais: apenas para trilhas"

### 3. Atualizar Traduções
Adicionar novas chaves de tradução em todos os idiomas para os avisos de compatibilidade.

---

## Arquivos a Serem Alterados

| # | Arquivo | Tipo | Descrição |
|---|---------|------|-----------|
| 1 | Database Migration | SQL | Corrigir `price_display` do `single_custom_lyric` |
| 2 | `src/components/CreatorSection.tsx` | Edição | Adicionar aviso sobre tipo de crédito após cards |
| 3 | `src/pages/Planos.tsx` | Edição | Adicionar badge de compatibilidade na seção Creator |
| 4 | `public/locales/pt-BR/pricing.json` | Edição | Adicionar traduções dos avisos |
| 5 | `public/locales/en/pricing.json` | Edição | Adicionar traduções em inglês |
| 6 | `public/locales/es/pricing.json` | Edição | Adicionar traduções em espanhol |
| 7 | `public/locales/it/pricing.json` | Edição | Adicionar traduções em italiano |

---

## Detalhes das Alterações

### SQL Migration
```sql
UPDATE pricing_config 
SET price_display = 'R$ 7,90' 
WHERE id = 'single_custom_lyric';
```

### CreatorSection.tsx - Novo Aviso
Adicionar abaixo do grid de cards Creator:
```tsx
{/* Credit Type Warning */}
<div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
  <div className="flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-amber-400">
        {t('creator.creditTypeWarning.title')}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {isInstrumental 
          ? t('creator.creditTypeWarning.instrumental')
          : t('creator.creditTypeWarning.vocal')}
      </p>
    </div>
  </div>
</div>
```

### Novas Traduções (pt-BR)
```json
"creator": {
  "creditTypeWarning": {
    "title": "Importante sobre os créditos",
    "vocal": "Os créditos deste plano são exclusivos para músicas cantadas. Não podem ser usados para criar instrumentais.",
    "instrumental": "Os créditos deste plano são exclusivos para músicas instrumentais. Não podem ser usados para criar músicas cantadas."
  }
}
```

---

## Benefícios

- **Transparência**: Usuários entendem claramente o que estão comprando
- **Menos Confusão**: Evita frustração ao tentar usar créditos incompatíveis
- **Preços Corretos**: Elimina inconsistência entre valor exibido e cobrado
- **UX Melhorada**: Informação clara antes da compra


# Plano: Correção de Preços Instrumentais e Clarificação de Créditos Creator

## ✅ CONCLUÍDO

### 1. ✅ Correção no Banco de Dados
Atualizado o registro `single_custom_lyric` para ter preços consistentes.

| Campo | Valor Anterior | Valor Atual |
|-------|----------------|-------------|
| price_display | R$ 9,90 | R$ 7,90 |

### 2. ✅ Avisos de Tipo de Crédito Adicionados

#### Homepage (`src/components/CreatorSection.tsx`)
- Adicionado toggle Vocal/Instrumental 
- Adicionado aviso visual explicando que créditos são específicos por tipo

#### Página de Planos (`src/pages/Planos.tsx`)
- Adicionado aviso abaixo dos cards Creator explicando a exclusividade dos créditos

### 3. ✅ Traduções Adicionadas
Novas chaves em todos os 4 idiomas (pt-BR, en, es, it):
- `creator.creditTypeWarning.title`
- `creator.creditTypeWarning.vocal`
- `creator.creditTypeWarning.instrumental`

---

## Arquivos Alterados

| # | Arquivo | Status |
|---|---------|--------|
| 1 | Database Migration | ✅ Executado |
| 2 | `src/components/CreatorSection.tsx` | ✅ Editado |
| 3 | `src/pages/Planos.tsx` | ✅ Editado |
| 4 | `public/locales/pt-BR/pricing.json` | ✅ Editado |
| 5 | `public/locales/en/pricing.json` | ✅ Editado |
| 6 | `public/locales/es/pricing.json` | ✅ Editado |
| 7 | `public/locales/it/pricing.json` | ✅ Editado |

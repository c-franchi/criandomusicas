
# Limpeza: Remover Referências aos Planos Instrumentais Separados

## Contexto

O sistema de créditos universais foi implementado, mas ainda existem referências residuais aos antigos planos Creator instrumentais (creator_start_instrumental, etc.) no código. Esses planos já estão desativados no banco de dados, mas o código ainda os menciona como fallbacks, causando confusão.

## Alterações Necessárias

### 1. useCreatorSubscription.tsx
Remover os planos instrumentais do mapeamento `PLAN_DETAILS`:

```typescript
// REMOVER estas linhas (25-27):
creator_start_instrumental: { ... },
creator_pro_instrumental: { ... },
creator_studio_instrumental: { ... },
```

### 2. useCredits.tsx
**a) Limpar PLAN_LABELS (linhas 192-194):**
```typescript
// REMOVER estas linhas:
'creator_start_instrumental': 'Creator Start',
'creator_pro_instrumental': 'Creator Pro',
'creator_studio_instrumental': 'Creator Studio',
```

**b) Limpar getCreditsForPlan (linhas 206-209):**
```typescript
// REMOVER estas linhas:
if (planId.includes('creator_studio_instrumental')) return 300;
if (planId.includes('creator_start_instrumental')) return 50;
```

### 3. Planos.tsx
Limpar fallbacks para planos instrumentais (linhas 46-50):
```typescript
// REMOVER estas linhas:
if (planId.includes('creator_studio_instrumental')) return 300;
if (planId.includes('creator_start_instrumental')) return 50;
```

## O que NÃO Mudar

| Campo/Componente | Manter? | Motivo |
|------------------|---------|--------|
| `orders.is_instrumental` | ✅ Sim | Identifica o tipo de música do pedido |
| `InstrumentalShowcase.tsx` | ✅ Sim | Mostra exemplos de músicas instrumentais |
| Textos "vocal, instrumental ou letra própria" | ✅ Sim | Descrevem o uso universal dos créditos |
| Planos avulsos instrumentais (`single_instrumental`, etc.) | ✅ Já desativados | Estão com `is_active: false` no DB |

## Resumo

A limpeza envolve remover referências obsoletas aos planos **Creator** instrumentais (`creator_*_instrumental`) que já foram desativados. O conceito de "música instrumental" ainda existe no sistema - apenas não há mais planos de assinatura separados para isso.

## Seção Técnica

Os planos Creator agora são universais:
- **Creator Start:** 40 créditos/mês
- **Creator Pro:** 150 créditos/mês  
- **Creator Studio:** 230 créditos/mês

Cada crédito pode ser usado para criar qualquer tipo de música (vocal, instrumental ou com letra própria do usuário).

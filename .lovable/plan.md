
# Plano: Correção do Sistema de Crédito Preview para Usuários Antigos

## Diagnóstico

### O que está acontecendo:
1. O trigger `grant_preview_credit` foi criado em **02/02/2026** (migração recente)
2. Apenas usuários cadastrados **APÓS** essa data recebem o crédito automaticamente
3. Todos os 9 usuários anteriores (tanto Google quanto email) NÃO têm o crédito preview

### Dados encontrados:
| Email | Provider | Crédito Preview |
|-------|----------|-----------------|
| trompeteweb@gmail.com | Google | **SIM** (02/02) |
| mnartsdesign@gmail.com | Google | NÃO |
| cbshinoselouvores@gmail.com | Google | NÃO |
| franchitrader@gmail.com | Email | NÃO |
| rogerinhovaz33@gmail.com | Email | NÃO |
| ... outros 5 usuários | Ambos | NÃO |

### Conclusão:
- O sistema **ESTÁ FUNCIONANDO** para novos cadastros (incluindo Google OAuth)
- O problema é que usuários **ANTIGOS** não foram contemplados retroativamente

## Solução

Criar uma migração SQL que concede crédito preview retroativamente para todos os usuários que não possuem.

### Migração a criar:

```sql
-- Conceder credito preview retroativo para usuarios existentes
INSERT INTO public.user_credits (user_id, plan_id, total_credits, used_credits, is_active)
SELECT 
  u.id,
  'preview_test',
  1,
  0,
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc 
  WHERE uc.user_id = u.id AND uc.plan_id = 'preview_test'
);
```

## Arquivos a Modificar

| Tipo | Ação |
|------|------|
| Migração SQL | Criar nova migração para conceder créditos retroativos |

## Resultado Esperado

Após a migração:
- Todos os 9 usuários antigos receberão 1 crédito preview
- Novos cadastros continuarão recebendo automaticamente via trigger
- Sistema de preview funcionará para todos os usuários

## Verificação

Após aplicar a correção, executar:
```sql
SELECT COUNT(*) as total_users,
       COUNT(uc.id) as users_with_preview
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id AND uc.plan_id = 'preview_test';
```

Ambos valores devem ser iguais.

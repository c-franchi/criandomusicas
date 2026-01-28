
# Plano: Corrigir Descrições dos Cards Creator

## Problema Identificado
Os cards dos planos Creator (Start, Pro, Studio) **não mostram as descrições** na página de planos (/planos), embora o código esteja correto nos arquivos.

Analisando o código atual:
- ✅ `Planos.tsx` tem a função `getCreatorPlanDescription()` (linhas 163-202)
- ✅ O JSX chama corretamente `{getCreatorPlanDescription(plan.id)}` (linha 559)
- ❌ Porém, na tela do usuário, as descrições **não aparecem**

## Causa Provável
O código anterior pode não ter sido aplicado corretamente. Vou **reescrever completamente** a seção de cards Creator no `Planos.tsx` para garantir que as descrições apareçam.

---

## Solução Proposta

### Alterações no `src/pages/Planos.tsx`

Modificarei a estrutura do card Creator para garantir que:

1. **Descrição apareça logo abaixo do nome do plano** com informações claras:
   - Número de créditos por mês (ex: "50 músicas/mês")
   - Descrição do perfil do usuário (ex: "Ideal para criadores que estão começando")

2. **Layout atualizado do CardHeader**:
```text
┌──────────────────────────────────────┐
│         [Badge: X músicas/mês]       │  ← Badge no topo
│                                      │
│            🎵 [Ícone]                │
│                                      │
│          Creator Start               │  ← Nome do plano
│                                      │
│    50 músicas/mês • Ideal para       │  ← DESCRIÇÃO
│    criadores que estão começando     │
│                                      │
│          R$ 29,90                    │  ← Preço
│          /mês                        │
│                                      │
│    Apenas R$ 0,60 por música         │  ← Custo unitário
└──────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Planos.tsx` | Garantir que `getCreatorPlanDescription()` seja chamado corretamente e exibido com destaque visual |
| `src/components/CreatorSection.tsx` | Confirmar que os cards na homepage também exibem descrições (já verificado que está correto) |

---

## Detalhes Técnicos

### Reforço na exibição da descrição em `Planos.tsx`:

```jsx
<CardHeader className="text-center pb-4 pt-8">
  {/* Ícone */}
  <div className="flex justify-center mb-4">
    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500">
      <PlanIcon className="w-8 h-8 text-white" />
    </div>
  </div>
  
  {/* Nome do plano */}
  <CardTitle className="text-2xl mb-2">
    {getPlanName(plan.id, plan.name)}
  </CardTitle>
  
  {/* ✅ DESCRIÇÃO - forçar visibilidade */}
  <p className="text-sm text-muted-foreground mb-4 leading-relaxed min-h-[48px]">
    {getCreatorPlanDescription(plan.id)}
  </p>
  
  {/* Preço */}
  <CardDescription className="text-4xl font-bold text-purple-400">
    {formatPrice(plan.price_cents)}
    <span className="text-base font-normal text-muted-foreground block mt-1">
      /mês
    </span>
  </CardDescription>
</CardHeader>
```

---

## Resultado Esperado

Após a implementação:
- **Creator Start**: "50 músicas/mês • Ideal para criadores que estão começando"
- **Creator Pro**: "150 músicas/mês • Para criadores de conteúdo frequentes"  
- **Creator Studio**: "300 músicas/mês • Produção em escala para profissionais"

As descrições aparecerão de forma clara e consistente tanto na página `/planos` quanto na homepage.

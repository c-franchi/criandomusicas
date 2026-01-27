
# Plano: Melhoria de Contraste e Cores em Todo o Site

## Problema Identificado
Analisando as imagens e o código, identifiquei vários problemas de contraste de cores que dificultam a leitura:

### Problemas Específicos:
1. **ProcessSteps.tsx** (imagem 1): Badges "3 músicas" e "5 músicas" com texto difícil de ler sobre fundo claro
2. **PlanComparison.tsx** (imagem 2): Badge "Assinatura Creator" com texto roxo (`text-primary`) sobre fundo roxo claro (`from-purple-500/20 to-pink-500/20`) - contraste muito baixo
3. **CreatorSection.tsx**: Textos verde e azul com pouco contraste (`text-green-600`, `text-blue-600` sobre fundos escuros)
4. **Badges gerais**: Uso inconsistente de cores de texto em badges com fundos semitransparentes

---

## Solução Proposta

### 1. ProcessSteps.tsx - Badges de Pacotes
**Problema**: Badge com `text-accent-foreground` sobre `bg-accent/20`

**Correção**:
- Badge "3 músicas": trocar de `text-accent-foreground` para `text-white`
- Badge "5 músicas": trocar de `text-primary` para `text-white`
- Aumentar opacidade dos fundos de `/20` para `/80`

### 2. PlanComparison.tsx - Badge "Assinatura Creator"
**Problema**: `text-primary` (roxo) sobre `from-purple-500/20` (roxo claro)

**Correção**:
- Trocar `text-primary` para `text-white`
- Aumentar opacidade do fundo para `/80` ou usar gradiente sólido

### 3. CreatorSection.tsx - Badges de Status
**Problema**: `text-green-600` e `text-blue-600` com baixo contraste em tema escuro

**Correção**:
- Trocar para `text-green-400` e `text-blue-400` (cores mais claras)
- Garantir que o fundo tenha contraste adequado

### 4. CreditsBanner.tsx - Badge Compacto
**Problema**: `text-amber-600` pode ter baixo contraste

**Correção**:
- Trocar para `text-amber-400` para melhor visibilidade

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/ProcessSteps.tsx` | Melhorar contraste dos badges de pacotes |
| `src/components/PlanComparison.tsx` | Corrigir badge "Assinatura Creator" |
| `src/components/CreatorSection.tsx` | Ajustar cores dos badges de status |
| `src/components/CreditsBanner.tsx` | Ajustar cores do badge compact |
| `src/components/Hero.tsx` | Verificar badges de créditos/subscription |

---

## Detalhes Técnicos

### Regra de Contraste WCAG
Para atingir AA (mínimo recomendado):
- Texto normal: ratio mínimo de 4.5:1
- Texto grande: ratio mínimo de 3:1

### Padrão de Cores Corrigido

```text
┌─────────────────────────────────────────────────────────┐
│  ANTES (baixo contraste)                                │
│  ┌──────────────────────────┐                           │
│  │ bg-purple-500/20         │ ← fundo roxo claro        │
│  │ text-primary (roxo)      │ ← texto roxo = ruim!      │
│  └──────────────────────────┘                           │
│                                                         │
│  DEPOIS (alto contraste)                                │
│  ┌──────────────────────────┐                           │
│  │ bg-purple-500/80         │ ← fundo roxo sólido       │
│  │ text-white               │ ← texto branco = ótimo!   │
│  └──────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

### Alterações Específicas por Componente

**ProcessSteps.tsx (linhas 86-97)**:
```tsx
// ANTES:
<Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
  3 músicas
</Badge>

// DEPOIS:
<Badge variant="secondary" className="bg-accent text-white border-accent">
  3 músicas
</Badge>
```

**PlanComparison.tsx (linha 93)**:
```tsx
// ANTES:
<Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-primary border-primary/30">
  Assinatura Creator
</Badge>

// DEPOIS:
<Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
  Assinatura Creator
</Badge>
```

**CreatorSection.tsx (linhas 99 e 103)**:
```tsx
// ANTES:
<span className="text-sm font-medium text-green-600">100% Original</span>
<span className="text-sm font-medium text-blue-600">Monetizável</span>

// DEPOIS:
<span className="text-sm font-medium text-green-400">100% Original</span>
<span className="text-sm font-medium text-blue-400">Monetizável</span>
```

---

## Resultado Esperado

Após as correções:
- Todos os badges terão contraste de pelo menos 4.5:1
- Textos serão facilmente legíveis em todos os dispositivos
- Consistência visual em todo o site
- Conformidade com diretrizes WCAG 2.1 AA

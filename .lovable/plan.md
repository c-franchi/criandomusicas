
# Correção do Efeito de Blur nas Seções

## Problema Identificado

O overlay de blur está configurado incorretamente:

```text
┌────────────────────────────────────────────────────────────┐
│                    PROBLEMA ATUAL                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ❌ Overlay com "fixed inset-0"                            │
│     → Cobre TODA a página, não só as seções alvo           │
│                                                            │
│  ❌ Blur só aumenta, nunca diminui                         │
│     → scrollYProgress [0, 0.3] → blur [0, 8]               │
│     → Quando scrollYProgress = 1, blur fica em 8px         │
│                                                            │
│  ❌ Seções abaixo ficam embaçadas                          │
│     → PlanComparison, InstrumentalShowcase, etc.           │
│     → Todas essas seções ficam com blur permanente         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Solução

Modificar o comportamento do blur para:
1. Aparecer quando a seção Creator ENTRA na tela
2. Desaparecer quando a seção Creator está TOTALMENTE visível
3. Limitar o escopo do efeito apenas às seções dentro do PinnedScrollSections

### Mudança no Transform do Blur

**Antes:**
```typescript
const bgBlur = useTransform(scrollYProgress, [0, 0.3], [0, 8]);
const bgDarken = useTransform(scrollYProgress, [0, 0.4], [0, 0.4]);
```

**Depois:**
```typescript
// Blur aparece e DESAPARECE - forma de "montanha"
const bgBlur = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 8, 8, 0]);
const bgDarken = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.4, 0.4, 0]);
```

### Mudança no Posicionamento do Overlay

**Antes:**
```tsx
<motion.div className="fixed inset-0 pointer-events-none z-25">
```

**Depois:**
```tsx
<motion.div className="absolute inset-0 pointer-events-none z-15">
```

Mudanças:
- `fixed` → `absolute`: limita o overlay ao container pai
- `z-25` → `z-15`: fica abaixo das seções internas mas acima do fundo

---

## Arquivo a Ser Alterado

| Arquivo | Alteração |
|---------|-----------|
| `src/components/PinnedScrollSections.tsx` | Corrigir transform do blur e posicionamento do overlay |

---

## Código Final

```typescript
// Blur aparece durante transição e desaparece quando seção está visível
const bgBlur = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 8, 8, 0]);
const bgDarken = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 0.4, 0.4, 0]);

// Overlay limitado ao container, não fixo na tela inteira
<motion.div
  className="absolute inset-0 pointer-events-none z-15 overflow-hidden"
  style={{
    backdropFilter: useTransform(bgBlur, (v) => `blur(${v}px)`),
    WebkitBackdropFilter: useTransform(bgBlur, (v) => `blur(${v}px)`),
    backgroundColor: useTransform(bgDarken, (v) => `rgba(0, 0, 0, ${v})`),
  }}
/>
```

---

## Resultado Esperado

```text
┌────────────────────────────────────────────────────────────┐
│                    COMPORTAMENTO CORRETO                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Scroll 0%   → Blur: 0px    (normal)                       │
│  Scroll 30%  → Blur: 8px    (transição entrando)           │
│  Scroll 50%  → Blur: 8px    (Creator em foco)              │
│  Scroll 70%  → Blur: 8px    (ainda em foco)                │
│  Scroll 100% → Blur: 0px    (transição saindo)             │
│                                                            │
│  ✅ Seções abaixo (PlanComparison, etc.) NÃO afetadas      │
│  ✅ Efeito cinematográfico preservado                      │
│  ✅ Blur some quando Creator está totalmente visível       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

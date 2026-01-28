
# Corrigir Animações Marquee Estáticas

## Problema Identificado

As animações marquee não funcionam porque o **Tailwind JIT não detecta classes CSS dinâmicas**.

O componente `marquee.tsx` constrói os nomes das classes assim:
```javascript
`animate-marquee-left-${speed}`  // Tailwind não vê isso!
```

Como resultado, as classes CSS necessárias **nunca são geradas**.

---

## Solução

### Opção 1: Safelist no Tailwind (Recomendada)

Adicionar as classes ao `safelist` do `tailwind.config.ts` para forçar a geração:

```text
// tailwind.config.ts
safelist: [
  'animate-marquee-left-slow',
  'animate-marquee-left-normal',
  'animate-marquee-left-fast',
  'animate-marquee-right-slow',
  'animate-marquee-right-normal',
  'animate-marquee-right-fast',
]
```

### Opção 2: Usar Classes Completas no Componente

Alterar o `marquee.tsx` para usar um mapeamento de classes completas:

```text
const animationClasses = {
  'left-slow': 'animate-marquee-left-slow',
  'left-normal': 'animate-marquee-left-normal',
  'left-fast': 'animate-marquee-left-fast',
  'right-slow': 'animate-marquee-right-slow',
  'right-normal': 'animate-marquee-right-normal',
  'right-fast': 'animate-marquee-right-fast',
};

const animationClass = animationClasses[`${direction}-${speed}`];
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `tailwind.config.ts` | Adicionar `safelist` com todas as classes de animação |

---

## Resultado Esperado

Após a correção:
- Os cards de **Depoimentos** terão 2 linhas com direções alternadas (esquerda/direita)
- Os cards de **Benefícios** terão movimento contínuo para a esquerda
- Os cards de **AudioSamples** terão 2 linhas com direções alternadas
- Animação suave, contínua e infinita em todas as seções

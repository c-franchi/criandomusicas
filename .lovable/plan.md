

# Visual Enhancement: Cards com Imagens e Abas Estilizadas

## Visao Geral

Transformar a experiencia visual do Dashboard e Briefing com:
1. Acordeao (accordion) para historico de musicas no Dashboard
2. Cards com imagens geradas por IA para opcoes de Tipo, Emocao e Genero no Briefing
3. Abas estilizadas com gradiente similar a imagem de referencia
4. Botao "Ver mais" para evitar poluicao visual

---

## Arquitetura das Mudancas

### 1. Dashboard - Abas Estilizadas + Accordion

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD COM NOVO VISUAL                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Abas com estilo gradiente (como referencia):                       │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│  │🎤 Vocais       │ │🎹 Instrumentais│ │📝 Letra Propria│           │
│  │    ⬅ ativo    │ │                │ │                │           │
│  │ (gradiente)   │ │   (outline)    │ │   (outline)    │           │
│  └────────────────┘ └────────────────┘ └────────────────┘           │
│                                                                     │
│  Historico em Accordion:                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ▼ Musica para Maria - Pop - Concluido        R$ 49,90   ▶  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │   "Historia sobre nosso primeiro encontro no parque..."     │   │
│  │   [Ver Detalhes] [Excluir]                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ▶ Trilha Corporativa - Jazz - Em producao   R$ 89,90       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Briefing - Cards com Imagens

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   SELECAO COM CARDS VISUAIS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Titulo: "Generos musicais"                         [Ver mais]      │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ 🌅      │ │ 🎸      │ │ 🎤      │ │ 🎷      │                   │
│  │ imagem  │ │ imagem  │ │ imagem  │ │ imagem  │                   │
│  │ (pop)   │ │ (rock)  │ │ (rap)   │ │ (jazz)  │                   │
│  ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤                   │
│  │  Pop    │ │  Rock   │ │  Rap    │ │  Jazz   │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
│                                                                     │
│  Cards redondos para emocoes (como referencia):                     │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐                                │
│  │ 😊│  │ 😢│  │ 💪│  │ ❤️│  │ 🎉│                                │
│  │   │  │   │  │   │  │   │  │   │                                │
│  └───┘  └───┘  └───┘  └───┘  └───┘                                │
│ Alegria Saudade Forca  Amor  Festa                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detalhamento Tecnico

### 1. Imagens a Gerar (usando IA)

Usarei a API de geracao de imagens (Nano banana) para criar as imagens dos cards:

| Categoria | Imagens Necessarias |
|-----------|---------------------|
| **Generos Musicais** | pop, rock, rap, sertanejo, mpb, jazz, gospel, forro, pagode, bossa, eletronico, classico |
| **Tipos de Musica** | homenagem, romantica, motivacional, infantil, religiosa, parodia, corporativa, trilha |
| **Emocoes** | alegria, saudade, gratidao, amor, esperanca, nostalgia, superacao, paz, fe |

Total: ~30 imagens de 256x256px

### 2. Estrutura do Componente ImageCard

Criar novo componente reutilizavel:

```typescript
// src/components/briefing/ImageCard.tsx
interface ImageCardProps {
  id: string;
  label: string;
  imageSrc: string;
  selected?: boolean;
  variant?: 'square' | 'circle'; // square para generos, circle para emocoes
  onClick: () => void;
}
```

### 3. Componente ImageCardGrid

```typescript
// src/components/briefing/ImageCardGrid.tsx
interface ImageCardGridProps {
  options: Array<{ id: string; label: string; imageSrc: string }>;
  selectedId?: string;
  variant?: 'square' | 'circle';
  initialVisible?: number; // quantos mostrar inicialmente
  onSelect: (id: string) => void;
}
```

### 4. Abas Estilizadas

```typescript
// Estilos para TabsTrigger com gradiente
const tabStyles = {
  inactive: "bg-muted/50 text-muted-foreground border border-border/50",
  active: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white border-0 shadow-lg"
}
```

### 5. Accordion para Pedidos

Usar o componente Accordion existente do shadcn/ui:

```typescript
<Accordion type="single" collapsible>
  {orders.map(order => (
    <AccordionItem key={order.id} value={order.id}>
      <AccordionTrigger>
        <OrderHeader order={order} />
      </AccordionTrigger>
      <AccordionContent>
        <OrderDetails order={order} />
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/briefing/ImageCard.tsx` | Card individual com imagem |
| `src/components/briefing/ImageCardGrid.tsx` | Grid de cards com "ver mais" |
| `src/assets/briefing/genres/*.webp` | Imagens de generos musicais |
| `src/assets/briefing/types/*.webp` | Imagens de tipos de musica |
| `src/assets/briefing/emotions/*.webp` | Imagens de emocoes |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Abas estilizadas + Accordion |
| `src/pages/Briefing.tsx` | Usar ImageCardGrid para opcoes |
| `src/components/dashboard/OrderCard.tsx` | Adaptar para formato accordion |

---

## Estilos das Abas (Referencia)

Baseado na imagem de referencia, as abas terao:
- Aba ativa: gradiente laranja-vermelho com texto branco
- Abas inativas: fundo transparente/muted com borda sutil
- Icones antes do texto (Mic, Piano, Edit)
- Bordas arredondadas (rounded-full ou rounded-lg)

---

## Geracao de Imagens

Para cada categoria, gerarei imagens usando prompts especificos:

**Generos Musicais:**
- Pop: "Concert stage with colorful lights, crowd silhouettes, pop music atmosphere, vibrant colors"
- Rock: "Electric guitar silhouette against dramatic stage lighting, rock concert energy"
- Rap: "Urban graffiti wall with microphone, hip hop culture, neon colors"
- etc.

**Tipos de Musica:**
- Homenagem: "Warm golden light surrounding a gift box with musical notes"
- Romantica: "Couple silhouette with hearts and soft pink lighting"
- etc.

**Emocoes:**
- Alegria: "Bright sunny sky with colorful balloons floating"
- Saudade: "Window with rain drops, warm interior light, nostalgic mood"
- etc.

---

## Resultado Esperado

1. Dashboard mais organizado com accordion colapsavel
2. Abas com visual premium (gradiente) seguindo o padrao do app
3. Selecao de opcoes muito mais atraente e intuitiva com imagens
4. Botao "Ver mais" para manter a tela limpa
5. Cards responsivos que funcionam bem em mobile e desktop
6. Imagens geradas por IA unicas para cada opcao


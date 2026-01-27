
# Plano de Correção: Letra + Style Próprio não Exibidos Corretamente no Admin

## Problema Identificado

Quando o usuário fornece **letra própria + style próprio**, o painel admin exibe apenas o STYLE, não mostrando a LETRA. Isso acontece porque:

1. A função `generate-style-prompt` detecta que já existe `style_prompt` customizado (linha 209-234)
2. Ao salvar o `final_prompt`, não adiciona a tag `[Lyrics]` necessária para o Admin Dashboard identificar e exibir a letra
3. O `final_prompt` é salvo como string vazia ou texto sem formatação, causando a não-exibição

---

## Correções Necessárias

### 1. Corrigir a função generate-style-prompt (Edge Function)

**Arquivo:** `supabase/functions/generate-style-prompt/index.ts`

**Problema na linha 213:**
```typescript
const finalPrompt = approvedLyrics || '';
```

**Correção:**
```typescript
// Formatar final_prompt com tag [Lyrics] para consistência com o padrão do sistema
const finalPrompt = approvedLyrics ? `[Lyrics]\n${approvedLyrics}` : '';
```

**Mudança completa no bloco (linhas 209-234):**
- Adicionar a tag `[Lyrics]` ao salvar o `final_prompt`
- Se `approvedLyrics` vier vazio mas existir letra no `story` do pedido, buscar do banco
- Garantir que tanto `final_prompt` quanto `style_prompt` sejam salvos corretamente

### 2. Verificar se há letra no story quando approvedLyrics está vazio

Quando o usuário fornece letra própria, a letra fica salva no campo `story` do pedido. O código precisa buscar essa letra caso `approvedLyrics` não seja passada na chamada.

**Adicionar no bloco de detecção de style_prompt existente:**
```typescript
if (!orderError && existingOrder?.style_prompt && existingOrder.style_prompt.trim().length > 0) {
  console.log("Order already has custom style_prompt, skipping generation");
  
  // Se approvedLyrics não foi passado, buscar a letra do story (para custom lyrics)
  let lyricsContent = approvedLyrics;
  if (!lyricsContent && existingOrder.has_custom_lyric) {
    // Buscar story do pedido que contém a letra customizada
    const { data: orderWithStory } = await supabaseCheck
      .from('orders')
      .select('story')
      .eq('id', orderId)
      .single();
    lyricsContent = orderWithStory?.story || '';
  }
  
  // Formatar com tag [Lyrics] para o Admin Dashboard
  const finalPrompt = lyricsContent ? `[Lyrics]\n${lyricsContent}` : '';
  
  // ... resto do código de update
}
```

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-style-prompt/index.ts` | Adicionar tag `[Lyrics]` ao `final_prompt` quando há style customizado |
| `supabase/functions/generate-style-prompt/index.ts` | Buscar letra do `story` se `approvedLyrics` não foi passado |

---

## Resultado Esperado

Após a correção:
1. O Admin Dashboard exibirá corretamente a seção LETRA para pedidos com letra própria + style próprio
2. O `final_prompt` terá o formato padrão: `[Lyrics]\n<conteúdo da letra>`
3. Ambos os campos (STYLE e LETRA) serão visíveis e copiáveis no painel admin

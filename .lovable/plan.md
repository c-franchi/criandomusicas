
# Plano de Correção: Estabilidade do Modo Áudio e Geração de Letras

## Problemas Identificados

Foram encontrados 5 problemas principais que causam a instabilidade relatada:

### 1. Loading infinito (tela travada "Gerando sua letra...")
O estado de "criando pedido" (`isCreatingOrder`) nunca é resetado dentro da funcao `processOrderAfterCredit`. Quando a geracao de letras falha ou tem timeout, o overlay de loading fica preso na tela para sempre.

### 2. Erros silenciosos na geracao de letras
Quando a IA falha ao gerar a letra, o sistema mostra um toast de erro mas continua navegando para a pagina de criacao (`/criar-musica`) mesmo sem letra gerada, causando uma experiencia quebrada.

### 3. Dependencia instavel na Edge Function `generate-lyrics`
A funcao usa `@supabase/supabase-js@2` sem versao fixa, o que causa falhas intermitentes no deploy ("Bundle generation timed out"). A funcao `generate-style-prompt` ja usa a versao fixa `@2.57.2`.

### 4. Dependencia instavel na Edge Function `transcribe-audio`
Usa `@supabase/supabase-js@2.49.1`, diferente da versao padronizada do projeto (`@2.57.2`).

### 5. Sem timeout no lado do cliente
A chamada `supabase.functions.invoke('generate-lyrics')` nao tem timeout no frontend. Se a Edge Function travar alem dos 90s do AbortController interno, o SDK pode ficar esperando indefinidamente.

---

## Correcoes Planejadas

### Correcao 1: Resetar estado de loading corretamente (Briefing.tsx)

Envolver toda a logica de `processOrderAfterCredit` com um `try/finally` que garante que `isCreatingOrder` e `isCreatingOrderRef` sao sempre resetados, independente de sucesso ou falha.

### Correcao 2: Parar execucao em caso de erro na geracao (Briefing.tsx)

Quando `lyricsError` ou `!lyricsResult?.ok`, a funcao deve fazer `return` apos o toast de erro, em vez de continuar navegando para a pagina de criacao com dados incompletos. Nestes casos, navegar para o dashboard com mensagem clara.

### Correcao 3: Fixar versao do Supabase SDK na `generate-lyrics`

Alterar o import de:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```
Para:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
```

### Correcao 4: Fixar versao do Supabase SDK na `transcribe-audio`

Alterar o import de:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
```
Para:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
```

### Correcao 5: Adicionar timeout no cliente + retry

Implementar um mecanismo de timeout de 120 segundos no frontend para a chamada `generate-lyrics`. Se expirar, mostrar opcao de "Tentar novamente" em vez de travar.

### Correcao 6: Padronizar versao do `std` no `generate-lyrics`

Atualizar de `std@0.168.0` para `std@0.190.0` (mesma versao usada em `generate-style-prompt`).

---

## Detalhes Tecnicos

### Arquivos modificados:
1. **`src/pages/Briefing.tsx`** - Correcoes no fluxo de `processOrderAfterCredit`:
   - Adicionar `try/finally` para garantir reset de estados
   - Adicionar `return` apos erros na geracao de letras
   - Adicionar timeout de 120s no frontend com AbortController
   - Adicionar opcao de retry apos falha

2. **`supabase/functions/generate-lyrics/index.ts`** - Estabilidade:
   - Fixar import `@supabase/supabase-js@2.57.2`
   - Atualizar `std@0.168.0` para `std@0.190.0`

3. **`supabase/functions/transcribe-audio/index.ts`** - Estabilidade:
   - Fixar import `@supabase/supabase-js@2.57.2`
   - Atualizar `std@0.168.0` para `std@0.190.0`

### Impacto:
- Elimina o problema de tela travada no loading
- Erros na geracao mostram feedback claro ao usuario
- Deploys das Edge Functions ficam estaveis e consistentes
- Usuario pode tentar novamente em caso de falha

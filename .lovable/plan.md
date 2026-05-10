## Diagnóstico

Testei as duas funções diretamente no servidor:

1. **`generate-lyrics`** — está respondendo **200 OK** com `gpt-5.2`. Ou seja, a comunicação com a IA está funcionando. O erro que você vê não vem da OpenAI, vem do fluxo cliente→backend.

2. **`apply-voucher`** — encontrei dois bugs reais:
   - **Bug A**: quando o voucher falha por motivo "esperado" (já usado, expirado, plano errado), a função retorna **HTTP 500**. O `supabase.functions.invoke` interpreta isso como exceção e o frontend mostra apenas "Erro ao aplicar voucher", **escondendo a mensagem real** ("Você já utilizou este voucher", "Voucher expirou", etc.).
   - **Bug B**: o `apply-voucher` não respeita `max_uses_per_user` (sempre trava no primeiro uso). Diverge do `validate-voucher`, então um voucher que diz "valid: true" pode falhar ao aplicar.

3. **Dados**: dos vouchers ativos, a maioria está expirada (DESCONTO50, PRIMA100, DESCONTO100, TESTES100). Apenas `DESCONTOAMIGO100` ainda está vigente (até 31/05). Seu usuário admin (`75c3ec36…`) já o usou em 25/03 — por isso, ao tentar de novo, o backend retorna "já utilizado", mas o frontend mostra erro genérico.

## Correções

### 1. `supabase/functions/apply-voucher/index.ts`
- Trocar todos os `throw new Error(...)` de validação (voucher não encontrado, expirado, sem usos, plano não permitido, já usado, pedido não pertence, pedido já pago) por `return Response(... status: 200, success: false, error: <mensagem>)`. Manter `status: 500` apenas para erros inesperados de banco.
- Substituir o check `existingRedemption` por contagem `userRedemptions.length` comparada a `voucher.max_uses_per_user` (espelhando `validate-voucher`).
- Manter logs `[APPLY-VOUCHER]` para rastrear.

### 2. `src/pages/PaymentGateway.tsx`
- No `catch` do `handleApplyVoucher`, ler `err?.context?.body` / `err?.context?.error` (FunctionsHttpError do supabase-js) para sempre exibir a mensagem real do backend no toast, mesmo se a função retornar não-2xx.
- Bloquear o botão "Aplicar" se o voucher estiver vazio (já existe), e exibir mensagem clara quando `data.success === false`.

### 3. Geração de letra — verificação e blindagem
- A função em si está OK. Para evitar falsos "erro ao gerar":
  - Em `src/pages/CreateSong.tsx` (linhas ~383 e ~646), no bloco `if (error) throw error`, ler `error.context?.body` para preservar a mensagem real (ex: 504 timeout, 429 rate limit, 402 sem créditos) e mostrar no toast.
  - Garantir que, se `generate-lyrics` retornar 504 (timeout 90s), o toast diga "A IA demorou para responder, tente novamente" em vez de mensagem genérica.
- Não vou alterar a lógica de prompt nem o modelo (`gpt-5.2`) — está correta e validada no teste.

## Arquivos a alterar

- `supabase/functions/apply-voucher/index.ts` (refatorar respostas de erro + corrigir `max_uses_per_user`)
- `src/pages/PaymentGateway.tsx` (mostrar erro real do edge function)
- `src/pages/CreateSong.tsx` (mostrar erro real ao chamar `generate-lyrics`)

## Fora do escopo
- Não vou criar novos vouchers nem reativar os expirados — isso é decisão de negócio sua (posso fazer depois se pedir).
- Não vou alterar o modelo de IA nem o pricing.

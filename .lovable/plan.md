
## Problemas identificados

### 1. Link de recuperação de senha entra direto no sistema

Quando o usuário clica no link do e-mail de redefinição, o Supabase redireciona para `/auth` com tokens na URL no formato:
```
/auth#access_token=...&refresh_token=...&type=recovery
```

Em `src/pages/Auth.tsx` (linha 46-90), o handler de "OAuth callback" detecta `access_token + refresh_token` e **imediatamente** chama `setSession` + redireciona para `/`, sem antes verificar se é um fluxo de recuperação (`type=recovery`). Resultado: o usuário é logado direto, em vez de ver o formulário de nova senha.

### 2. Modal de "créditos insuficientes / voucher" fica atrás da tela

Ao final do briefing, quando o usuário não tem créditos, o sistema abre um `Dialog` (`showNoCreditModal`) sobre a tela de confirmação. No mobile (viewport 393px), o modal:
- Pode ficar invisível por conflito de z-index com o `AudioModeLoadingOverlay` (`z-50`) e/ou pelo overlay da tela de confirmação.
- Aparece em três pontos diferentes do código (linhas 3163, 3215, 4485), com comportamentos ligeiramente diferentes.
- Não oferece um caminho de pagamento real com aplicação de voucher — apenas um botão "Ver opções de compra" que leva a `/planos` ou `/checkout/:orderId`.

O usuário pediu que, se for melhor, seja **criada uma página dedicada** para o pagamento com voucher, garantindo que o fluxo funcione sem travamentos.

---

## Solução

### Correção 1 — Recuperação de senha (`src/pages/Auth.tsx`)

Antes de processar o token como login, verificar se o hash contém `type=recovery`. Se sim, **não** chamar `setSession` para redirecionar; apenas estabelecer a sessão temporária e ativar `resetPasswordMode` para mostrar o formulário de nova senha.

Fluxo corrigido:
```text
Link do email
   │
   ▼
/auth#access_token=…&type=recovery
   │
   ▼
Auth.tsx detecta type=recovery
   │
   ├── setSession(tokens)  → cria sessão de recuperação
   ├── setResetPasswordMode(true)
   └── NÃO redireciona para /
   │
   ▼
Form "Nova senha" é exibido
   │
   ▼
Usuário define nova senha → signOut → volta para /auth
```

Ajustes:
- No `useEffect` de OAuth callback, verificar `hashParams.get('type') === 'recovery'` antes de redirecionar.
- Se for recovery: chamar `setSession`, ativar `resetPasswordMode`, limpar o hash, e **não** navegar para `/`.
- A guarda de redirect `if (user && !resetPasswordMode && !isRecoverySession)` (linha 126) já protege contra redirecionamento prematuro — apenas precisamos garantir que `resetPasswordMode` seja setado a tempo.

### Correção 2 — Página dedicada de pagamento com voucher

Criar uma nova rota e página `/pagamento/:orderId` (`src/pages/PaymentGateway.tsx`) que substitui o modal "Créditos insuficientes". A página oferece:

1. **Resumo do pedido** (estilo, duração, ocasião).
2. **Campo de voucher** com botão "Aplicar" (usa edge function `validate-voucher` + `apply-voucher` já existentes).
3. **Botão "Pagar com cartão"** → leva para `/checkout/:orderId?planId=…` (Stripe).
4. **Botão "Pagar com PIX"** → leva para `/checkout/:orderId?planId=…&method=pix` (fluxo PIX já existente).
5. **Botão "Comprar pacote/assinatura"** → leva para `/planos`.
6. **Botão "Cancelar"** → volta para `/dashboard` mantendo o pedido com `payment_status=PENDING`.

Mudanças no `Briefing.tsx`:
- Substituir todas as três instâncias do modal `showNoCreditModal` por `navigate('/pagamento/' + pendingOrderId)`.
- Remover o estado `showNoCreditModal`, `hasPreviewCreditForModal` e os três blocos de `<Dialog>` (linhas 3163, 3215, 4485).
- Manter a função `handleGoToCheckout` apenas como fallback interno se necessário, ou removê-la.

Vantagens:
- Sem conflitos de z-index com overlays.
- Funciona perfeitamente em mobile (tela inteira).
- Permite aplicar voucher sem sair do fluxo.
- Estado claro e sem travamentos.

Adicionar a rota em `src/App.tsx`:
```tsx
const PaymentGateway = lazy(() => import("./pages/PaymentGateway"));
// …
<Route path="/pagamento/:orderId" element={<PaymentGateway />} />
```

---

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/Auth.tsx` — adicionar verificação de `type=recovery` no handler de callback.
- `src/pages/Briefing.tsx` — remover os três `Dialog` de "Créditos insuficientes" e redirecionar para `/pagamento/:orderId`.
- `src/App.tsx` — registrar nova rota `/pagamento/:orderId`.

**Arquivos criados:**
- `src/pages/PaymentGateway.tsx` — nova página de pagamento com voucher, cartão, PIX e opção de comprar pacote.

**Edge functions reutilizadas (sem alterações):**
- `validate-voucher`, `apply-voucher`, `check-credits`, `create-payment` (já existentes no projeto).

**Testes manuais sugeridos após implementação:**
1. Esquecer senha → receber email → clicar no link → ver formulário de nova senha (não mais home com login).
2. Definir nova senha → ser deslogado e voltar para `/auth` para login.
3. Concluir um briefing sem créditos → ser redirecionado para `/pagamento/:orderId` (página inteira, sem modal).
4. Na página de pagamento: aplicar voucher válido → crédito é creditado → voltar para o dashboard com música em geração.
5. Na página de pagamento: pagar com cartão → fluxo Stripe normal.
6. Na página de pagamento: pagar com PIX → fluxo PIX normal.

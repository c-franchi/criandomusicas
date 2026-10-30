# Teste de compra — Itália

Conta: Sandbox di Modena, acct_1UVMtHBI0iXvcrrH; EUR; livemode=false. Oito preços conferidos na API. Foi possível criar pela conexão Stripe uma sessão de verificação de €2,99, sem pagamento nem pedido musical (expiração natural após 31 minutos). Isso não valida a credencial do backend nem o webhook.

## Fluxo isolado

ADM → Mais ações → Teste de compra — Itália (`/admin/teste-italia`). Somente administradores e seus próprios pedidos. Sem redirecionamento por país/idioma. A tela informa a configuração ausente e desabilita o pagamento enquanto faltarem secrets.

O pedido brasileiro é **apenas um modelo de briefing**. O servidor captura uma fotografia dos dados e calcula os itens pelo catálogo `it_test_catalog`. Nada do valor, moeda ou conta enviados pelo navegador é usado. O checkout aberto não trava nem altera o pagamento do modelo brasileiro.

O webhook com assinatura verificada e pagamento confirmado cria **novos** pedido/cartão de teste. Eles recebem `orders.sandbox_market='IT_TEST'`, `is_preview=true`, valor real do teste em EUR, e o cartão recebe `is_test=true`, novo token e dados visuais/dedicatória preservados. O pedido brasileiro original permanece pendente. Trocar a classificação de teste posteriormente é bloqueado por triggers. Nenhum crédito de produção é concedido.

As cópias ficam no filtro Testes Itália do ADM, fora dos contadores padrão. O próprio checkout mostra links para as cópias. Cartões continuam exigindo letra aprovada, áudio e liberação ADM. E-mails, push, aviso administrativo e Meta têm bloqueio de pedidos sandbox no servidor; lembretes excluem sandbox. O teste não inicia geração paga de IA automaticamente. Checkout/verificação BR recusam as cópias de teste, preservando o caminho comum de pedidos brasileiros.

Formatos: curtas 15s/30s, curta+adicional de cartão, cartão existente, cartão+música nova 15s/30s/completa e música completa comum. Não inclui impressão/frete, vouchers BRL, pacotes de créditos, modelos `is_test` antigos ou modalidade com letra própria. Esses casos são recusados explicitamente, sem conversão ou desconto inventado.

## Configuração ainda obrigatória

Salvar diretamente em **Lovable → Cloud → Secrets**, nunca no chat/repositório:

- `STRIPE_IT_TEST_RESTRICTED_KEY`: chave restrita de TESTE da conta italiana, com Checkout Sessions: Write; Prices: Read; Products: Read.
- `STRIPE_IT_TEST_WEBHOOK_SECRET`: assinatura do endpoint de TESTE, com `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

Endpoint criado e relido no sandbox: `we_1UWIWXBI0iXvcrrHhIYTV12L` (enabled, livemode=false). Seu segredo não foi impresso nem versionado.

URL: `https://haiiaqzhuydsjujtdcnq.supabase.co/functions/v1/stripe-it-test-webhook`.

Ambos são exigidos antes de criar a sessão. A conta italiana tem Managed Payments ativado por padrão; esta integração usa `managed_payments.enabled=false` **por sessão**, sem mudar a configuração da conta, e desativa conversão adaptativa para manter o teste em EUR.

## Verificações

- Testes de helpers e regressões de pedidos/upload/pagamento.
- `supabase/tests/it_test_checkout.sql`: assertions reais em transação com rollback; cobre música comum e cartão curto, preservação do original/foto/história, valor em EUR, duplicidade, não pago, assinatura processada somente no handler, evento anterior ao attach, moeda inválida, acesso não-admin e imutabilidade.
- TypeScript, build e verificador de assets.
- A validação de assinatura com a credencial real, compra pelo site e confirmação real do webhook continuam pendentes dos secrets. Não afirmar fluxo liberado antes disso.

Migração inicial aplicada pelo Lovable: `drizzle/migrations/0002_italy_test_checkout.sql`. Correção aplicada diretamente pelo conector SQL e versionada em `supabase/migrations/20261030160752_harden_italy_sandbox_isolation.sql` (sem registro automático no histórico do CLI). Não repetir a migração inicial.

Rollback: base `backup/antes-checkout-italia-teste-2026-10-30`. Primeiro desabilitar o endpoint/chaves IT. Preservar dados de teste e colunas aditivas; reverter só código de UI não deve restaurar o fluxo inicial que pagava o pedido brasileiro. Nenhuma chave ou preço brasileiro foi substituído.

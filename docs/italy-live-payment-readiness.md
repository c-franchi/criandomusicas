# Cobrança italiana em euros — configuração pendente

A escolha confirmada é cobrar clientes internacionais em EUR pela conta italiana. O catálogo atual é apenas de teste; não serve para vendas reais. Nenhuma função, tabela, preço ou chave brasileira foi alterada nesta etapa.

## Entregue

- Pix só é apresentado após o país do IP ser identificado como BR, independentemente do idioma/região selecionados. Falha na identificação não expõe Pix.
- Checkout de música, entrada de pagamento, vídeo e resumo de presente compartilham a regra.
- Fora do Brasil, o cartão brasileiro fica desabilitado com aviso de indisponibilidade de euros. Não há conversão silenciosa para cobrança BRL nem encaminhamento ao sandbox.
- A regra é de apresentação, não substitui autorização de cobrança no servidor. Nenhuma integração de produção EUR foi implementada ou liberada.

## Bloqueios para vendas reais

1. Conta italiana de produção verificada e catálogo EUR de produção (identificadores de preços, produtos, valores e modalidades). Não copiar identificadores de teste nem converter preços BRL.
2. Credencial italiana de produção e assinatura do endpoint dedicado, por formulário seguro; nunca reutilizar `STRIPE_SECRET_KEY` brasileira ou `STRIPE_IT_TEST_*`.
3. Integração própria de produção com preço/conta/moeda validados no servidor, ownership, retorno permitido, confirmação assinada e idempotente, valores/moeda próprios sem sobrescrever pedidos BRL.
4. Verificação da criação de sessão e confirmação antes de afirmar cobrança liberada. A simples adição de chaves não libera vendas.

## Verificação desta etapa

26 testes passam (país/Pix, localização, sandbox e isolamento). Build automático OK. Telas BR, IT e país indisponível verificadas com respostas simuladas em computador/celular, inclusive pedido AWAITING_PIX acessado de fora. Não houve compra, envio de mensagens, publicação de frontend ou alteração de dados. Conferência autenticada real indisponível: tentativa de sessão própria falhou na consulta do serviço.
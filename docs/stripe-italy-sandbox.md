# Catálogo italiano — sandbox

Conta verificada: Sandbox di Modena, acct_1UVMtHBI0iXvcrrH, país IT, moeda EUR,
livemode=false. Catálogo criado e relido pela API em 29/10/2026.
IDs e valores exatos: stripe-italy-sandbox-catalog.json.

| Produto | EUR |
| --- | ---: |
| Música curta 15s | 2,99 |
| Música curta 30s | 4,99 |
| Música completa | 9,99 |
| Adicional de cartão para música curta | 2,00 |
| Cartão com música existente | 2,99 |
| Cartão com música nova 15s | 4,99 |
| Cartão com música nova 30s | 6,99 |
| Cartão com música completa | 11,99 |

15s/30s são formatos de produção, sem promessa de duração exata. Todos os produtos
são serviços digitais, sem frete. O adicional não é uma música independente.
O cartão+curta custa o mesmo que curta+adicional, evitando dupla cobrança.
Não foram criados preços para impressão ou envio físico.

2,99 e 4,99 foram definidos pelo usuário. Demais valores são uma escala comercial
provisória escolhida para testes, não resultado de pesquisa de mercado e nem
validação de lucro, custos de IA, IVA ou enquadramento fiscal.
Preços foram criados como tax_behavior=inclusive para manter o total anunciado.
Isso NÃO ativa Stripe Tax nem configura obrigações/registro fiscal. Não houve
ativação de impostos, transferências, cobranças ou mudança de conta bancária.

## Estado da integração

Este arquivo documenta o catálogo; não é carregado no frontend e não habilita uma
compra por fallback estático. O checkout brasileiro e pricing_config em BRL
continuam intactos. Nenhuma chave secreta foi enviada ao chat ou ao repositório.
A chave pk_test disponibilizada pelo usuário é pública e não cria sessões no backend.

Para tornar o fluxo italiano testável no site ainda são necessários:

1. Chave restrita do sandbox configurada diretamente nos secrets do backend,
   com permissões estritamente necessárias para Checkout e consulta de preços.
2. Preços em EUR por mercado e conta em armazenamento confiável do servidor,
   alinhados com vouchers; moeda e conta gravadas em cada pedido.
3. Roteamento de mercado/domínio autorizado no backend, sem confiar em valor,
   idioma, IP ou chave enviados livremente pelo navegador.
4. Webhook italiano separado com assinatura verificada, eventos completed e
   async_payment_succeeded condicionados ao payment_status e idempotência.
5. Pedidos de teste identificados e isolados de notificações/produção reais;
   confirmação, falha, estorno e reconciliação testados de ponta a ponta.
6. Produção: cadastro real habilitado, conta autorizada, nova configuração
   de preços/chaves/webhook de produção e conferência fiscal/comercial.

Acesso MCP ao catálogo não fornece automaticamente credenciais ao site. Não
publicar botão italiano que aparente cobrar EUR antes de conectar o backend.

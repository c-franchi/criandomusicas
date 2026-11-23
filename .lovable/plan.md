# Painel separado de vendas da Itália

## O que será criado
- Nova rota administrativa `/admin/vendas-italia`, acessível por uma aba própria no menu do ADM.
- Resumo com faturamento confirmado em EUR, quantidade de vendas pagas e checkouts aguardando pagamento.
- Lista dos pagamentos reais com cliente, música, valor, datas, situação do pedido e confirmação registrada pelo webhook.
- Busca e filtros por situação, atualização manual e layout próprio para celular.
- Link de cada item para o pedido correspondente no painel principal.

## Regras técnicas
- Acesso restrito pelo controle de administrador já existente e leitura de `it_live_payments`, `orders` e `profiles` pelas permissões atuais.
- Somente pagamentos com `status = paid` entram no faturamento; `paid_at` identifica a confirmação do webhook.
- Valores permanecem em EUR, sem conversão para BRL; nenhum dado, pagamento, segredo, função ou permissão será alterado.
- Adicionar testes para os cálculos e filtros, verificar a compilação e conferir a página autenticada no navegador.

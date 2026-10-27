# Presentes musicais no fluxo da plataforma

Cartão digital e músicas curtas usam o mesmo pedido, checkout, comprovante PIX, confirmação de pagamento, escolha/edição de letras e aprovação usados nas músicas normais. A experiência de cartão continua em `musical_gifts`; a compra aponta para `checkout_order_id` e a música nova usa esse mesmo pedido em `production_order_id`. Uma música existente não cria outra produção.

## Fluxo do cliente

1. Escolher cartão digital ou música curta e preencher a personalização. Gênero usa os cards e opções do briefing original. Para uma música existente, selecionar uma faixa pronta da própria conta.
2. Conferir a prévia e o total configurado em `pricing_config`. Sem preço válido, a compra continua bloqueada. Confirmar leva ao checkout da plataforma.
3. Pagar por cartão pelo Stripe existente ou enviar o comprovante PIX no checkout original. Somente a confirmação administrativa ou a verificação real da sessão Stripe confirma o pagamento. O preço total fica fixado no servidor, incluindo adicionais.
4. Para música nova, abrir “Escolher e aprovar letra” no acompanhamento. Duas opções são geradas pelo serviço real; o cliente pode revisar/editar e aprovar antes de produzir o áudio. A geração de letra não aprova automaticamente pedidos de presente.
5. A produção recebe o pedido e a letra aprovada. A faixa deve ser produzida e enviada pelo processo atual. A infraestrutura existente não gera áudio automaticamente ao salvar o cartão.
6. ADM confere música, dedicatória, eventual data de disponibilidade e libera o presente. O link individual reproduz a faixa correta com a letra aprovada.

Um cartão com música já pronta passa pelo pagamento e conferência do cartão, sem repetir a geração ou aprovação da canção existente. Os créditos, cupons e benefícios VIP das músicas normais não são aplicados automaticamente aos novos produtos; dependem de condições comerciais próprias.

## Letras e áudio das músicas curtas

As modalidades continuam sendo até 15s e até 30s, com teto absoluto de 40s. A duração contratada continua valendo quando for menor que 40s.

- Até 15s: máximo de 20 palavras e 4 linhas cantadas.
- Até 30s: máximo de 40 palavras e 6 linhas cantadas.
- Uma estrofe curta, sem repetir refrão, sem monólogo, introdução longa, solo ou final prolongado.
- O gerador recebe uma instrução específica e tenta reduzir uma resposta longa uma vez. Resposta ainda fora do limite não é salva como letra válida.
- O formulário de aprovação, a função de aprovação e o banco conferem o tamanho da letra. Edições também precisam respeitar o limite.
- O upload no ADM mede o arquivo real; o banco exige duração informada válida para faixas curtas. Na liberação, o player permite conferir novamente a faixa selecionada.

Contagem de palavras orienta a produção, mas não garante duração sozinha. A validação final depende do áudio real. Nenhuma música curta pode ser liberada acima do limite escolhido ou de 40s.

## Gestão no ADM

`/admin` oferece filtros “Músicas normais”, “Cartões digitais” e “Músicas curtas”, com contagens por produto. Cada solicitação exibe identificação do produto, duração quando aplicável, número do pedido e marcação de teste. A busca aceita número, cliente, destinatário, título, gênero e história. Os estados originais mostram pagamento pendente, letras geradas, letras aprovadas e produção.

`/admin/presentes` continua sendo a gestão da personalização, link, QR Code e liberação. “Abrir solicitação no ADM” leva ao mesmo pedido de pagamento/produção. A etapa musical e a pendência de aprovação são mostradas no detalhe. A aprovação é feita pelo comprador em sua conta; o ADM não precisa aprovar a letra em seu lugar.

## Testes sem cobrança

A opção “Criar teste do ADM, sem cobrança” continua restrita a presentes da própria conta administradora. Música nova cria um pedido de teste, sem marcar pagamento como recebido e sem conceder créditos. O ADM, como comprador desse teste, segue a escolha e aprovação de letras normalmente. Teste não gera nem aprova áudio automaticamente.

## Entrega e configuração

- Cartão físico habilitado como cartão para impressão pelo próprio comprador. Após a liberação no ADM, o dono do pedido pode abrir `/presentes/:id/imprimir`, imprimir ou salvar como PDF pelo navegador. O QR abre a mesma página musical; impressão e envio postal não estão incluídos. A configuração permite desabilitar novos cartões físicos. Pedidos históricos são preservados.
- WhatsApp e e-mail são compartilhamento manual. A data programada controla quando o link abre; não dispara mensagens automaticamente.
- Link aleatório de 256 bits, sem expiração comercial fixa, sujeito à disponibilidade do serviço e aos termos. É informação privada que pode ser repassada por quem a recebe.
- QR Code é gerado a partir do link real. Letra sincronizada depende de marcações LRC reais. Fotografias são otimizadas e limitadas.
- Manutenção permanece ativa conforme configuração. Administradores autenticados podem testar; links individuais liberados continuam acessíveis.

## Dados e segurança

Migração `20261027135827_unify_gift_order_and_lyric_flow.sql` adiciona vínculo com checkout, duração do áudio, limites de letras, sincronização do pagamento e trava de geração para evitar duas chamadas simultâneas do pagamento e da página de letras. RLS e autorização dos presentes são preservadas. Pagamento pelo cliente não pode ser marcado como recebido; alterações de valor ou plano divergentes da cotação são bloqueadas.

Arquivos de backend alterados: `create-payment`, `verify-payment`, `generate-lyrics`, `generate-style-prompt` e `_shared/shortLyrics.ts`. Essas funções precisam ser publicadas no backend, além da publicação do frontend no Lovable.

Testes SQL usam transações com rollback. Não cobram, não disparam mensagens e não alteram os pedidos reais do usuário. Pagamento real, geração com IA e reprodução móvel continuam exigindo validação autenticada com uma solicitação real.

## Entrada unificada, imagem e modelos (27/10/2026)

A chamada principal “Criar minha música” abre `/escolher-musica`: com cartão ou somente música; cartão digital ou para imprimir; até 15s, até 30s ou duração padrão. Música completa sem cartão mantém o briefing original. Os cartões novos também permitem escolher 15s/30s; cada combinação tem preço próprio em `pricing_config` e o total é recalculado na personalização. Valores ausentes/inativos bloqueiam a compra.

A aprovação da letra retorna ao acompanhamento do presente. Pedidos cuja música já está pronta exibem a pendência de conferência/liberação. “Concluído” na produção musical não libera automaticamente o cartão; `/admin/presentes` exige a conferência. Na lista de pedidos do comprador, o tipo e estado do presente são identificados e o botão abre o cartão.

A foto original otimizada do comprador tem prioridade sobre qualquer capa gerada. Na aprovação do presente não se pede uma segunda capa; o banco preserva a foto no pedido de produção. Existem quatro fundos decorativos: corações, flores, celebração e clássico. O ADM pode enviar JPG/PNG/WEBP para a galeria de fundos e ocultar modelos de novas escolhas sem quebrar presentes existentes. A galeria só pode conter artes públicas, sem dados pessoais. O presente público recebe apenas o desenho e imagem de fundo, sem história ou endereço privados.

A geração de fundos por prompt não foi integrada. Depende da escolha do provedor, credencial e custo. As artes prontas e a galeria enviada pelo ADM funcionam sem essa dependência.

Migração: `20261027164133_printable_gift_flow.sql`. Backend atualizado: `generate-lyrics` e `generate-style-prompt`, para aplicar o mesmo limite às músicas curtas com cartão digital ou impresso.

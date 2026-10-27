# Fluxo de presentes musicais

Implementação incremental sobre o site existente em React/Vite, Supabase e publicação Lovable. Os pedidos e pagamentos antigos continuam no fluxo original. A manutenção continua ativa; administradores autenticados podem testar. Links individuais já liberados em `/presente/:token` permanecem acessíveis ao destinatário durante a manutenção.

## Caminho para testar sem cobrança

1. Entre em `/auth` com uma conta administradora e abra `/cartao-digital`.
2. Clique para criar o presente, escolha uma música pronta da sua conta ou uma música nova e preencha as etapas. A música existente precisa ter uma faixa READY e não pode ser uma prévia.
3. Confira a prévia. Salve o rascunho ou use a opção explícita de teste do ADM, sem cobrança. Essa opção só funciona para presentes da própria conta administradora.
4. Abra `/admin/presentes`, selecione o presente e confira seus dados. Para música nova, inicie a produção; um pedido será criado no processo musical existente. O botão de letras utiliza a função real `generate-lyrics`; produção e upload do áudio continuam necessários.
5. Quando a faixa estiver pronta, ouça e revise os dados. Nas músicas curtas, confira também a duração real. Libere o presente.
6. Em `/presentes`, abra o acompanhamento, copie o link e teste em uma janela sem login. Abra o presente, ouça o áudio, confira dedicatória, letra e QR Code. Presentes de teste exibem uma identificação visível.
7. Para cartão físico, abra a prova de impressão no ADM. Leia o QR Code na prova e confirme a revisão antes de marcar como pronto para impressão. Expedição e entrega são atualizações manuais.

Teste não confirma pagamento e não concede créditos. Pedidos de produção de teste são marcados como prévia e continuam com pagamento PENDING. Um teste não deve ser usado como pedido comercial.

## Configuração comercial e compra real

Em `/admin/presentes`, a aba de configuração comercial permite preencher e ativar os sete preços: cartão digital com música existente/nova, música curta de até 15/30 segundos, adicional de cartão, cartão físico com música existente/nova. Todos começam inativos, sem preço comercial definido. Não alteram os planos nem os créditos antigos.

O novo fluxo aceita PIX com a configuração real já existente. O servidor calcula e fixa o total ao confirmar o resumo. O comprador envia um comprovante privado; o ADM precisa conferir o recebimento e confirmar o pagamento antes de produzir/liberar. Enviar comprovante não equivale a pagar. Há rejeição com motivo e novo envio. Pagamento por cartão de crédito dos novos produtos depende de integração específica no checkout/Stripe e permanece indisponível; o Stripe dos produtos antigos foi preservado.

O cartão físico exige habilitar uma operação real e informar formato disponível, retirada e/ou envio, taxa fixa quando houver envio e condições de produção. O endereço é coletado para envio. Não há cotação de transportadora, rastreamento automático ou impressão automatizada. As opções de formato e acabamento dependem da operação configurada.

## Entrega e experiência

- Link aleatório de 256 bits, sem prazo comercial predefinido; acesso depende da disponibilidade do serviço e dos termos existentes.
- Liberação exige pagamento confirmado ou teste explícito, faixa correta disponível e revisão do ADM. Revogar invalida o token anterior.
- A data/hora controla a disponibilidade do link no servidor. **Não é disparo automático.** WhatsApp e e-mail abrem o compartilhamento manual do comprador. Envios automáticos, fila e tentativas precisam de provedor e tarefas de backend.
- Reprodução após interação, dedicatória, foto opcional otimizada, capa, letra aprovada e repetição. Temas em dez ocasiões e textos nos quatro idiomas já suportados.
- LRC opcional no ADM para letra sincronizada; sem tempos, mostra a letra completa. A duração das músicas curtas é verificada no player e confirmada pelo ADM; não há corte automático nem geração fictícia.
- QR Code gerado a partir do link verdadeiro; prova imprimível antes da impressão. Validar leitura também no papel e no celular.

## Dados e proteção

Migração `20261027000255_musical_gift_flow.sql`: tabelas `musical_gifts`, `musical_gift_events` e `gift_operations`, preços inativos e funções RPC. DDL idempotente e sem substituição dos pedidos existentes. RLS isola contas; alterações sensíveis passam por funções no banco. Dados privados não aparecem na resposta pública. Comprovantes usam o bucket privado `pix-receipts`, com URL temporária no ADM.

Foto é reduzida no navegador e armazenada como imagem limitada a 240 KiB; o arquivo original não é enviado. Remover a foto antes da compra também é possível. Não há gerador de imagens ou armazenamento público adicional.

As rotas de presente desativam analytics de marketing e usam noindex/referrer no HTML inicial e no componente. O site é uma SPA: esses cuidados não substituem cabeçalhos HTTP do servidor, SEO social no servidor nem políticas do provedor. Trate o link como informação privada: quem o receber pode abrir e repassar. O áudio usa a infraestrutura de mídia existente.

## Validação realizada

- Instalação reproduzível com npm ci, TypeScript, lint dos novos módulos e build Vite/PWA.
- Testes unitários de preços, LRC, URLs, imagens e controle de manutenção.
- Migração aplicada duas vezes em transação e testes SQL com rollback: isolamento entre contas, restrições de anônimo, valores indisponíveis, pagamento PIX, teste ADM, produção idempotente, publicação, data futura, revogação, tempos da letra e etapas físicas.
- Renderização de 80 combinações de idioma/tema/cartão e decodificação independente do QR Code.

Ainda requer validação humana autenticada no site publicado: pagamento real com conferência bancária, produção/upload reais, reprodução móvel, envio manual, leitura de prova impressa e conferência visual em dispositivos. Nenhum pagamento, mensagem externa ou despacho foi realizado pelos testes.

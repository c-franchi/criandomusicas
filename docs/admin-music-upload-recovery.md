# Envio de músicas no ADM

## Sintoma e diagnóstico

Relato: upload do presente Douglas permanece em “Enviando…”, no Android.
O caminho anterior aguardava indefinidamente Storage, gravações de tracks/orders,
notificações e até fetchOrders no tratamento de erro. A leitura de duração já
possuía limite de 15s. O SDK instalado envia File em FormData; definir somente
contentType nas opções não corrige o MIME do File dentro desse multipart.

Não foi possível reproduzir a requisição específica do aparelho. A consulta de
logs do Supabase negou permissão; não afirmar falha específica de RLS ou rede.

## Mudança

- Confirmação da sessão com limite de 20s; instrução de novo login se indisponível.
- Cliente temporário usa o mesmo JWT do ADM e as mesmas políticas RLS. Não usa
  service_role, não cria nova sessão e não altera o cliente de autenticação global.
- Apenas esse cliente tem fetch cancelável: 180s por operação de Storage e 20s
  por operação de banco, incluindo leitura do corpo de resposta.
- O limite rejeita mesmo se o transporte ignorar AbortSignal.
- MP3/WAV têm MIME normalizado no File real do multipart, inclusive arquivos
  selecionados com MIME vazio ou application/octet-stream.
- UI informa conferência de sessão/áudio, envio, gravação e conclusão; permite
  cancelar; atualização do ADM continua em 60s, pausada durante upload.
- Busca de pedidos e notificações não prendem a liberação dos controles.
- Uma faixa principal conclui produção, segunda versão continua opcional e
  presentes continuam exigindo liberação separada pelo ADM.
- Durações contratadas de 15s/30s conservam margens existentes de 20s/40s.
- Em erro de confirmação da gravação, não excluir o arquivo: o banco pode ter
  confirmado a operação antes da conexão cair. Atualizar o pedido antes de
  reenviar. Cancelamento não desfaz uma gravação já aceita pelo servidor.

Não há retentativa automática de escritas, mudança em RLS, limites de bucket,
produção musical, cobrança ou liberação automática de presentes.

## Verificação

Testes com SDK Supabase real e transporte simulado verificam JWT, MIME multipart,
sequência Storage → faixa → consulta → conclusão, sem escrita em musical_gifts.
Testes cobrem bloqueio de sessão, cancelamento, corpo de resposta travado,
conexão que ignora abort, erros parciais, tolerância de duração e versão opcional.

Reteste necessário no celular com MP3 e WAV reais, inclusive quando a sessão
expirou e quando o aparelho volta do seletor de arquivos. Não houve envio de
áudio nem alteração do pedido do cliente a partir do ambiente de desenvolvimento.

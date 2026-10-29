# ADM móvel, carregamento e sincronização da produção

## Causas confirmadas

- A listagem aguardava pelo menos três consultas sequenciais para cada pedido,
  com todas as linhas bloqueadas até o último pedido terminar, além das URLs de
  referência de áudio individuais. Para 90 pedidos, eram cerca de 272 leituras.
- A barra de ferramentas era uma linha flexível sem quebra; filtros de estado
  usavam rolagem horizontal e textos/players tinham tamanho mínimo intrínseco.
- No pedido b0e5b2a2 (presente c90a88dd), o banco confirmou MUSIC_GENERATING com
  approved_lyric_id preenchido e lyrics.is_approved=false. Nenhuma faixa READY.
- generate-style-prompt salva o pedido antes de atualizar o sinalizador da letra;
  uma falha na segunda escrita era ignorada. O cartão corretamente exigia ambos,
  mas o ADM geral mostrava apenas o estado do pedido.

## Correções

- Carrega pedido e vínculo de presente primeiro, depois títulos, faixas, perfis e
  referências em lotes de 100. Teste com 90 pedidos sem áudio de referência faz
  cinco consultas, em vez de consultas por linha. Preserva a versão escolhida.
- URLs assinadas de referência são geradas em lote e continuam temporárias.
- Usa o cliente com mesmo JWT e timeout, sem alterar sessão ou permissões.
- Mostra a lista básica antes de completar metadados. Erros aparecem com retry,
  sem deixar spinner indefinido. Uma falha de detalhe não elimina a lista básica.
- Pedidos de checkout e produção de um mesmo presente não duplicam a solicitação.
- Busca ao voltar à tela; intervalo automático continua em 60s e pausa durante
  mutações. Atualizações mantêm os cards e formulários montados.
- Cartões e músicas curtas usam uma ação: Gerenciar música e cartão. O painel
  existente reúne prompt, letra, upload, player, conferência e liberação.
- No mobile, detalhes do presente substituem a lista e têm botão de voltar.
- Toolbar em grade, filtros sem rolagem horizontal, seletor de tipo no celular,
  controles que quebram texto, UUIDs/prompts que cabem e players com largura limitada.
- Mesma evidência de aprovação nas telas: ID da letra, vínculo ao pedido e flag
  confirmada. Um registro divergente informa sincronização, não nova aprovação.

## Banco e pedido informado

A migração atomic_gift_lyric_approval foi aplicada pelo query_database do Lovable,
pois o conector Supabase direto negou acesso. Reaproveita a função privada
sync_gift_order, mantendo checagens de dono, pagamento, voucher, foto e letra do
pedido. Ao gravar o estado avançado com a letra já selecionada, sincroniza o flag
na mesma transação. Não escolhe letras e não publica presentes.

Corrigida somente a letra selecionada do pedido informado, com condições de ID,
vínculo, estado avançado e pagamento/teste. Conferência posterior: flag true,
pedido MUSIC_GENERATING, zero faixas READY. O áudio ainda precisa ser anexado.

Teste SQL com rollback: desalinhar temporariamente o flag, atualizar o pedido e
verificar sincronização; outras versões permanecem intactas. A transação de teste
foi desfeita. RLS de orders, lyrics e musical_gifts continua habilitada.
Migração é idempotente para reaplicação: reparo tem condição de flag divergente.
Nenhuma migração antiga foi editada; não houve pagamento, publicação ou envio.

## Validação e limites

Testes de lotes, falhas parciais, deduplicação, seleção de versão e divergência de
aprovação, mais regressões de upload, revisão e bloqueio de notificações.
TypeScript e build. A sessão de navegador disponível redirecionou /admin para
login; não houve validação visual autenticada no aparelho do usuário. Não declarar
100% de cobertura visual a partir de CSS e testes de componente.

## Retorno

Branch anterior: backup/antes-adm-mobile-sync-2026-10-29, commit 74edb997.
Para desfazer a apresentação, reverter o PR. Manter a aprovação correta do pedido
reparado: restaurar is_approved=false recriaria a inconsistência. O corpo anterior
da função está em rollback-gift-sync-before-atomic.sql para revisão técnica se
uma reversão de backend for necessária, sem restaurar dados errados.

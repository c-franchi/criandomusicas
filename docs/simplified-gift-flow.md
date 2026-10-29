# Simplificação do fluxo sem perda de contexto

## Ponto de retorno

Commit anterior: e69c2c2f128e20e10384a0280148a1583a73fcd0.
Branch permanente de referência: backup/antes-simplificacao-fluxo-2026-10-29.
Para desfazer, reverter o PR de simplificação e republicar; não apagar histórico
nem sobrescrever alterações posteriores. Não há migrações nem dados a restaurar.

## Organização

A entrada principal da Home já usa /escolher-musica; foi preservada.
O ADM já reúne produção e liberação na gestão do cartão; foi reaproveitado.

- Músicas curtas sem cartão: Música → Sua história → Conferir.
- Cartões: cinco etapas existentes, preservando personalização e entrega.
- Preferências de compartilhamento continuam acessíveis na revisão sem cartão.
- Mensagem opcional sem cartão fica junto aos dados da história; valor salvo
  em dedication permanece idêntico, compatível com rascunhos anteriores.
- Escolhas vindas da entrada aparecem resumidas e podem ser expandidas/alteradas;
  duração e formato não precisam ser escolhidos novamente para prosseguir.
- Revisão mostra os valores originais de história, relação, sentimentos, ocasião,
  remetente, estilo, tom, idioma, observações e dedicatória. Não há resumo por IA.
- Atalho para editar a história sem perder o restante do formulário.
- Acompanhamento usa o componente existente de próxima ação, sem três blocos
  repetidos sobre a mesma aprovação/produção/liberação.
- Ações finais reunidas: abrir, compartilhar, ouvir/baixar na página musical,
  avaliar na mesma página e imprimir quando aplicável.
- O upload dentro da gestão do cartão usa agora o mesmo cliente limitado e
  cancelável do ADM geral; atualizar consultas não mantém o botão travado.

Mantidos campos, limites de caracteres, validações, produção, aprovação de letra,
liberação administrativa, preços, pagamento, contratos de persistência,
privacidade e permissões. Não foram adicionados custos nem lembretes.

## Conferência da IA (código versionado)

- generate-lyrics: tenta OpenAI direta (OPENAI_API_KEY, gpt-5.5); se falhar,
  tenta Lovable AI com modelo OpenAI (openai/gpt-6-astra).
- A função de letras ainda exige LOVABLE_API_KEY na entrada e devolve uma
  identificação de modelo fixa/desatualizada; esse campo não comprova o provedor
  realmente usado. Nenhuma alteração de provedor foi feita nesta etapa.
- generate-style-prompt: títulos e instruções de estilo usam
  google/gemini-3-flash-preview pelo gateway Lovable.
- generate-audio-description usa OpenAI direta, gpt-4o-mini.
- Capas usam Gemini no gateway Lovable.

A consulta de generate-style-prompt publicado foi negada pelo conector Supabase.
Portanto esta é uma auditoria do código, não confirmação de execução em produção,
chaves configuradas ou consumo real. Não houve geração paga para testar modelos.

## Validação

Testes da sequência de etapas, renderização da revisão sem alteração da história,
traduções nos quatro idiomas e regressões de produção/pagamento/avaliação/upload.
TypeScript e build. O reteste interativo autenticado, com pedido e áudio reais,
permanece necessário; não foi alterado nenhum pedido de cliente nesta etapa.

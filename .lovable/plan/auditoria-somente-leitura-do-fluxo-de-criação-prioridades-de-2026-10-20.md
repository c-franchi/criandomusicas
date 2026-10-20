# Auditoria (somente leitura) do fluxo de criação + prioridades de correção

Nada foi editado, publicado, logado, pago ou gerado. Executado: `bun test src/lib` (12 passaram). Não executado: navegação no browser (sem sessão; as telas pós-finalidade exigem login). Todo o resto abaixo é leitura de código.

## Mapa do fluxo

```text
Home "Criar minha música" (Hero.tsx:31) -> /briefing
  -> PurposeSelector (público)
     Empresa -> submenu: company_team | company_anthem | company_jingle | link "narração" (company_voiceover)
  -> deslogado: /auth?redirect=/briefing?purpose=X  (Briefing.tsx:2588-2601)
     Auth valida destino (marketing-routes.ts:10-14), volta com replace; OAuth preserva
  -> applyPurpose (Briefing.tsx:2670-2697) grava ?purpose=, remove type
     rápido: gift | company_team | motivation  -> QuickCreation
     detalhado: anthem->passo 10 (emoção), jingle->32 (contato), voiceover->80 (roteiro),
                faith 44, kids 60, video 70 (trilha), letra própria 22, instrumental 1
     áudio: AudioModeWizard -> cria pedido direto, sem tela de revisão
  -> revisão (rápido: QuickCreation review; detalhado: confirmação, só checa crédito)
  -> cria pedido em orders (AWAITING_PAYMENT)
  -> check-credits: tem crédito -> use-credit (consome aqui) -> /criar-musica?orderId
                    sem crédito -> /pagamento/:id?planId -> /checkout/:id (cartão/PIX)
  -> acompanhamento: /acompanhar/:id, /dashboard
```

Empresa: equipe = música motivacional cantada (moment=trabalho, formulário rápido); institucional = corporativa sem narração; jingle = corporativa + contato/CTA + narração no final; narração = monólogo falado inteiro. Índices dos passos conferidos e corretos.

Login acontece depois da finalidade e antes de digitar qualquer coisa. Links legados: `?type=vocal` abre a finalidade; `?type=instrumental|custom_lyric`, `?planId`, celebração e `/#criadores`, `/planos#creator` funcionam.

## Bugs comprovados (código)

1. ALTA — `use-credit` não é idempotente: não verifica se o pedido já está pago antes de descontar (use-credit/index.ts:64-76, 303-312, 356-369). Chamada repetida no mesmo pedido consome outro crédito.
2. MÉDIA — retry do bloqueio otimista perde a condição de concorrência (use-credit:339-348).
3. MÉDIA — recarregar um fluxo detalhado com `?purpose=` apaga as respostas: applyPurpose sobrescreve o autosave (Briefing.tsx:427-432, 2689-2697).
4. MÉDIA — voltar do navegador/celular ignora submenu de empresa e formulário rápido e manda para a Home (Briefing.tsx:1579-1598).
5. MÉDIA — /pagamento deslogado vai para /auth sem redirect; após login cai na Home (PaymentGateway.tsx:47-51).
6. MÉDIA — sem reaproveitamento de pedido: erro após inserir e antes de navegar permite criar pedido duplicado no retry (Briefing.tsx:2338-2403; trava só em memória).
7. BAIXA — voltar do rápido mantém `?purpose=` na URL; recarregar reabre o formulário (Briefing.tsx:3019-3025).
8. BAIXA — rascunho rápido apagado manualmente reaparece ao recarregar (QuickCreation.tsx:103-108).
9. BAIXA — texto digitado e não enviado no chat não é salvo (inputValue fora do autosave).
10. BAIXA — detalhado -> rápido não leva as edições do detalhado (QuickCreation restaura o próprio rascunho).

## Dúvidas não comprovadas

- Se há trigger/constraint no banco impedindo crédito duplo na prática.
- Se dados do áudio sobrevivem ao retorno do pagamento.
- Se já houve pedidos duplicados reais (logs não consultados).
- Comportamento real no celular (não testado no browser).

## Parecer

Para cliente leigo a entrada ficou clara (uma pergunta, opção "Empresa" com subopções explicadas). Pontos de atrito: login obrigatório logo após escolher, botão voltar do celular indo para a Home e perda de respostas ao recarregar.

## Prioridades de correção (se aprovado)

1. Tornar `use-credit` idempotente (só consome se pedido não pago; update condicional) e corrigir o retry.
2. Reaproveitar pedido pendente do mesmo rascunho em vez de criar outro.
3. Restaurar autosave quando `?purpose=` coincide com o rascunho salvo.
4. Voltar do navegador seguir o mesmo comportamento do botão visível; limpar `?purpose=` ao voltar.
5. /pagamento deslogado com `redirect` para o próprio pedido.
6. Ajustes baixos (rascunho apagado, texto não enviado, rápido<->detalhado).
Testes novos: idempotência de crédito e restauração de rascunho.

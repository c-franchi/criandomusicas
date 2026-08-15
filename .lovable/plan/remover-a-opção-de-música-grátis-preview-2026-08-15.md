# Remover a opção de música grátis (preview)

Objetivo: eliminar completamente o "crédito preview grátis" (1 crédito automático no cadastro, geração de prévia verso+refrão e todos os avisos de preview, inclusive na página pública de compartilhamento), sem quebrar pedidos e músicas já existentes.

## Princípio de segurança

Nada é apagado do banco. Pedidos antigos marcados como preview continuam existindo e tocáveis; apenas deixam de ser criados novos e a interface deixa de exibir rótulos/avisos de preview. Assim nenhum usuário perde acesso ao que já recebeu.

## O que muda

### 1. Concessão do crédito grátis (a raiz)
- Remover o gatilho automático que dá 1 crédito `preview_test` a cada novo cadastro.
- Remover a função de servidor que concede esse crédito.
- Desativar os créditos `preview_test` ainda não usados (marcar como inativos), para que ninguém consiga gerar uma nova música grátis a partir de hoje.

### 2. Consumo de crédito
- Na lógica de uso de crédito, deixar de aceitar `preview_test` como crédito válido e deixar de marcar pedidos como preview.
- Na checagem de créditos, deixar de reportar "preview disponível".

### 3. Geração de letra
- Remover o caminho de letra reduzida (estrutura de prévia). Toda geração passa a usar a estrutura completa.

### 4. Interface
- Home: remover o selo "Teste grátis antes de comprar" do Hero e o cartão "Preview Gratuito" em ProcessSteps.
- Cadastro/login: remover a mensagem "você ganhou 1 crédito preview gratuito".
- Créditos (banner e gestão): remover o estado "1 preview grátis" e o contador fictício; sem créditos volta a ser sem créditos.
- Briefing / Criação rápida: remover o modo preview e o banner de aviso; o botão volta a ser sempre "Gerar".
- Dashboard e detalhes do pedido: remover o selo "Preview" e os avisos de prévia.
- Página pública de música compartilhada (`/m/:orderId`): remover o banner de preview e o modal de "prévia concluída"; a música é exibida normalmente.
- Excluir os componentes que ficam sem uso (banner de preview, modal de preview concluído) e o hook de crédito preview.

### 5. Textos
- Remover as chaves de tradução de preview nos 4 idiomas (pt-BR, en, es, it) nos arquivos afetados.

### 6. E-mails
- Remover do e-mail de reengajamento a menção a prévias disponíveis, para não convidar a um recurso que não existe mais.

## Detalhes técnicos

- Migração: `DROP TRIGGER on_auth_user_created_grant_preview ON auth.users` + `DROP FUNCTION public.grant_preview_credit()`; `UPDATE public.user_credits SET is_active = false WHERE plan_id = 'preview_test' AND used_credits < total_credits`.
- Excluir a edge function `grant-preview-credit`.
- Editar: `use-credit`, `check-credits`, `generate-lyrics` (remover `isPreviewOrder`/`previewStructure`/`simpleMode` ligado a preview), `get-public-track` (parar de retornar `is_preview`), `send-reengagement-email`.
- Frontend: `Hero.tsx`, `ProcessSteps.tsx`, `Auth.tsx`, `CreditsBanner.tsx`, `CreditsManagement.tsx`, `useCredits.tsx`, `Briefing.tsx`, `QuickCreation.tsx`, `Dashboard.tsx`, `OrderCard.tsx`, `OrderDetails.tsx`, `MusicShare.tsx`; remover `usePreviewCredit.tsx`, `PreviewBanner.tsx`, `PreviewCompletedModal.tsx`.
- As colunas `orders.is_preview` e o `plan_id = 'preview_test'` permanecem no banco por histórico, apenas sem uso novo.

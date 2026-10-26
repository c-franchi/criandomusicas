# Manutenção do site

## Operação no ADM

No painel `/admin`, abrir **Manutenção** ou acessar `/admin/configuracoes?tab=maintenance`.

1. Ajustar título e mensagem, se necessário.
2. Marcar ou desmarcar **Exibir página de manutenção**.
3. Clicar em **Salvar manutenção**. Alterar somente o interruptor não grava a configuração.
4. Usar **Visualizar página** para conferir a última mensagem salva em `/manutencao`.

A configuração inicial foi ativada conforme solicitação do usuário. O controle é global e fica no Supabase, não no armazenamento local do navegador. Administradores reconhecidos por `user_roles` continuam navegando no site, com um aviso de manutenção ativa.

Visitantes e clientes veem a página de manutenção, inclusive ao acessar diretamente briefing, checkout, pedidos ou as novas páginas de presentes. O login, seus callbacks, as páginas legais e o retorno de confirmação do pagamento permanecem acessíveis. Um visitante que abre `/admin` recebe o caminho para entrar. Isso preserva a possibilidade de administrar e desativar o modo depois.

O aplicativo consulta a configuração a cada 15 segundos enquanto está em uso e ao recuperar foco. Navegadores que ainda estejam executando uma versão antiga precisam atualizar para carregar a funcionalidade. A tela é uma manutenção da interface, não substitui autorização, RLS, suspensão de webhooks ou bloqueio de APIs no servidor. Nenhuma função de pagamento ou produção foi interrompida.

## Dados e permissões

`public.site_maintenance` contém uma única linha, com `id=true`, `enabled`, `title`, `message` e `updated_at`. Somente mensagem pública e estado são expostos na leitura.

- RLS habilitada.
- `anon` pode ler a configuração e não pode alterá-la.
- `authenticated` tem UPDATE somente nas colunas editáveis; RLS exige `public.has_role(auth.uid(), 'admin')`, tanto em USING quanto em WITH CHECK.
- Não há INSERT ou DELETE para clientes. A linha é provisionada pela migração.
- A identificação do ADM usa a tabela existente, sem e-mails hardcoded ou metadados editáveis pelo usuário.
- O bypass da interface usa consulta vinculada ao ID da sessão. Sair da conta não mantém privilégios da sessão anterior.
- Falha ao consultar a configuração mostra a tela de indisponibilidade, em vez de liberar conteúdo por engano. O caminho administrativo e o login continuam recuperáveis.
- Textos são exibidos como texto, sem interpretação de HTML.

Migração: `supabase/migrations/20261026231854_add_site_maintenance.sql`. Aplicada pelo acesso SQL do projeto Lovable, que confirmou stack Supabase. A conexão direta do plugin Supabase não tinha acesso ao projeto. A migração pode ser reaplicada sem apagar a linha ou sobrescrever escolhas posteriores do ADM.

## Validações antes do merge

- Build Vite e verificações de assets estáticos passaram.
- ESLint dos componentes e hooks novos passou.
- Nove testes de decisões passaram: bloqueio público, cliente sem bypass, ADM, logout, carregamento, falhas, desativação, recuperação administrativa e rotas de retorno.
- Consulta real confirmou `enabled=true`, RLS ativa e existência de administrador.
- Leitura HTTP anônima da configuração retornou 200.
- Tentativa HTTP anônima de UPDATE foi rejeitada com 401.
- Teste SQL executado com `SET LOCAL ROLE authenticated`: usuário sem papel ADM atualizou zero linhas; ADM atualizou uma linha. As gravações do teste foram revertidas com ROLLBACK.
- TypeScript completo continua apresentando somente o erro preexistente de `VideoOrdersManager.tsx:156`, documentado na etapa visual.

O merge sincroniza o código. A publicação pelo Lovable deve ser verificada separadamente no domínio oficial, conferindo a manutenção sem sessão e o acesso com uma conta ADM. Não confundir status de deploy da integração Vercel com publicação no Lovable.

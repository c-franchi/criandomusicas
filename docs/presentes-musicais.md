# Presentes musicais — desenvolvimento separado

## Base verificada em 26/10/2026

- Repositório `c-franchi/criandomusicas`, base `4040b199a7cda96a21c0b16dc47c43a37c0ce58e`.
- A base coincide com o commit informado pelo projeto Lovable `8b44c89b-d4bc-4aa8-b6fd-85522e79ace9`.
- O usuário utiliza publicação pelo Lovable. O status Vercel presente no GitHub é uma integração paralela; não foi removido nem usado como evidência da hospedagem do domínio.
- Lovable confirmou banco habilitado, stack `supabase`. `supabase/config.toml` referencia `haiiaqzhuydsjujtdcnq`.
- A conexão direta Supabase negou acesso ao projeto. Não foi possível confirmar as configurações de produção, branches de banco ou serviços por essa conexão.
- Existem também arquivos Firebase e um uso em `OrderLyricsPage`. Foram preservados.
- Existem funções de pagamento Stripe, aprovação administrativa de PIX e envio de e-mails com Resend. Existência de código não confirma credenciais ou operação em produção.
- Há migrações com `cron.schedule`; isso não comprova que os agendamentos estejam ativos no banco atual, nem constitui um agendador pronto para presentes.

## Etapa entregue nesta branch

1. Seção Presentes Musicais na Home, sem remover seções anteriores.
2. Rotas `/cartao-digital`, `/musicas-curtas` e `/cartao-fisico`, carregadas sob demanda.
3. Duas modalidades comerciais do cartão digital, formatos curtos e conceito do cartão físico.
4. Demonstração local de abertura do cartão, seleção de ocasião e seleção de duração. Ainda não é o formulário de personalização nem um cartão real.
5. Traduções em português, inglês, espanhol e italiano no namespace `home`.
6. Ilustrações em componentes, sem novos serviços, imagens remotas ou dependências. O símbolo QR é ilustrativo e não serve para impressão; QR real pertence à etapa de entrega.
7. Links para produtos no rodapé, preservando os links antigos.
8. Compra desabilitada, condições comerciais pendentes e avisos de demonstração. Não há áudio de exemplo apresentado como música de um pedido.

Não foram alterados banco, autenticação, checkout, funções, agendamentos, produtos existentes, domínio ou publicação. Não há preços inventados. O merge continua pendente.

## Como testar a apresentação com isolamento

```sh
npm run dev:gifts
```

Abrir `http://127.0.0.1:8081/`. Esse endereço é local ao computador que executa o comando; não é uma URL pública de homologação.

Essa entrada Vite utiliza somente os componentes visuais novos, o design system e os arquivos de tradução. Não monta `App`, `AuthProvider`, o cabeçalho autenticado ou o rodapé de produção. Não importa os clientes de banco, analytics, pagamentos, Firebase ou a configuração de PWA. Não exige credenciais e não usa `.env` para operações comerciais.

```sh
npm run build:gifts
```

Gera `dist-gifts-preview`, ignorado pelo Git. O HTML da prévia contém `noindex, nofollow`. Se a prévia for hospedada, usar destino separado, fallback SPA e preferencialmente controle de acesso + cabeçalho `X-Robots-Tag: noindex, nofollow`; `noindex` não é autenticação. Não apontar o domínio oficial para esse diretório.

O comando normal `npm run dev` monta o aplicativo inteiro com as conexões configuradas e **não é o ambiente isolado**. Não efetuar compras, cadastros ou testes de envio nele usando serviços de produção.

As páginas comerciais integradas usam SEO client-side; não se deve afirmar que isso cria previews sociais renderizados no servidor. A prévia isolada é HTML separado e não modifica o head do site oficial.

## Validação desta etapa

- Build completo e verificações estáticas de SEO: passaram.
- Build da prévia isolada: passou.
- ESLint dos componentes/entrada de prévia: sem erros.
- Renderização dos três produtos nos quatro idiomas: 12 combinações passaram, com títulos traduzidos, compra desabilitada e estado inicial da seleção.
- Links dos três cards da seção verificados por renderização em todos os idiomas.
- Bundle isolado verificado sem referência ao projeto de produção, `supabase.co`, segredo Stripe, chamada `gtag` ou carregamento do pixel Meta.
- `git diff --check`: passou.
- Checagem TypeScript completa: bloqueada pelo erro já existente em `src/components/admin/VideoOrdersManager.tsx:156`. O mesmo erro foi reproduzido em um worktree limpo da base, usando as mesmas dependências. Não foi corrigido nesta etapa para evitar mudança fora do escopo.
- `npm ci` da base falhou por divergência já existente entre package.json e package-lock.json (`@lovable.dev/cloud-auth-js` e tipos de gravação). Para as verificações, as dependências foram instaladas localmente com `npm install --no-save --package-lock=false --ignore-scripts`. Nenhum lockfile ou versão de dependência foi alterado. Uma instalação reproduzível precisa ser regularizada antes da liberação final.
- Revisão visual em navegador e cliques: pendentes. O navegador local não pôde ser instalado na sessão e o navegador remoto não alcançou a URL local. Não declarar responsividade ou interações como testadas em dispositivos até essa validação.

## Próximas etapas, sem ativação em produção

1. Revisar o visual em 360/390px, tablet e desktop, idiomas, teclado e contraste. Aprovar direção visual e substituir/expandir ilustrações por imagens finais, se desejado.
2. Configurar hospedagem da prévia isolada, com URL separada, sem substituir a branch principal do Lovable nem publicar no domínio oficial. A URL de prévia do projeto original não representa automaticamente esta branch.
3. Preparar projeto/branch Supabase de testes, storage próprio, usuários fictícios e chaves Stripe de teste. Conferir políticas de acesso e domínio de callbacks. Não copiar dados pessoais ou secrets de produção.
4. Modelar presentes separados dos pedidos musicais, com proprietário, faixa e versão, destinatário, remetente, dedicatória, tema, foto, token, preparação e liberação. Testar a autorização da faixa existente.
5. Integrar formulários em etapas e prévias persistidas, depois checkout. Cartão avulso não deve disparar produção musical nem conceder créditos por engano. Confirmações repetidas de pagamento devem ser idempotentes.
6. Liberar o presente somente com pagamento confirmado, cartão preparado e faixa concluída. Escolher limites de duração e número de versões dos produtos curtos.
7. Implementar reprodução após interação, texto da letra e sincronização apenas com tempos reais. Não expor endereço, pagamento ou dados internos na página por token.
8. Integrar compartilhamento manual WhatsApp, e-mail real e agendamento com estados, tentativas e erros. WhatsApp automático depende de serviço próprio; não confundir com abrir o compartilhamento no aparelho.
9. Gerar QR real com URL estável, exportação e prova de leitura. Configurar impressão, entrega, frete e eventual rastreamento com a operação real.
10. Testar os fluxos completos e os existentes antes de aprovar o merge. Publicação pelo Lovable e migrações serão decisões explícitas posteriores; esta branch não as executa.

## Decisões comerciais pendentes

Preços e adicionais em `pricing_config`, prazos, versões por música curta, impressão/formato, meios de entrega, frete, política de edição após envio, horário/fuso de agendamento e tratamento de presente ainda não pronto na data desejada. Disponibilidade dos presentes sem expiração comercial fixa, condicionada aos termos e à continuidade do serviço.

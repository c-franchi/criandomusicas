# 🎵 Criando Músicas

Plataforma de criação de músicas personalizadas com inteligência artificial. Transforme histórias, homenagens e momentos especiais em músicas únicas.

## ✨ Funcionalidades

- **Músicas Personalizadas**: Crie músicas vocais ou instrumentais baseadas na sua história
- **Letra Própria**: Envie sua própria letra para ser musicada
- **Múltiplos Estilos**: Sertanejo, Pop, Gospel, Rock, MPB, Forró, Funk, Eletrônica e mais
- **Geração de Letras com IA**: Duas versões de letra geradas automaticamente
- **Pronúncia Fonética**: Sistema de pronúncia para nomes e termos específicos
- **Vídeos Personalizados**: Opção de vídeo pronto para compartilhar
- **PWA**: Aplicativo instalável com notificações push
- **Painel Admin**: Gerenciamento completo de pedidos e conteúdo

## 🛠️ Tecnologias

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Query

### Backend
- Supabase (Database, Auth, Storage, Edge Functions)
- Firebase Functions
- Stripe (Pagamentos)

## 📦 Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/criando-musicas.git
cd criando-musicas

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
VITE_SUPABASE_PROJECT_ID=seu_project_id
```

### Secrets (Supabase Edge Functions)
- `LOVABLE_API_KEY` - Chave do AI Gateway
- `STRIPE_SECRET_KEY` - Chave secreta do Stripe
- `OPENAI_API_KEY` - Chave da API OpenAI
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` - Chaves para Push Notifications

## 📁 Estrutura do Projeto

```
├── src/
│   ├── components/          # Componentes React
│   │   ├── admin/           # Componentes do painel admin
│   │   └── ui/              # Componentes shadcn/ui
│   ├── pages/               # Páginas da aplicação
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilitários e configurações
│   └── integrations/        # Integrações (Supabase)
├── supabase/
│   └── functions/           # Edge Functions
│       ├── create-payment/  # Criação de pagamentos Stripe
│       ├── generate-lyrics/ # Geração de letras com IA
│       ├── generate-style-prompt/ # Geração de prompts musicais
│       ├── validate-prompt/ # Validação de prompts
│       ├── send-push-notification/ # Notificações push
│       └── ...
├── functions/               # Firebase Functions
└── public/                  # Assets estáticos
```

## 🚀 Deploy

### Build de Produção
```bash
npm run build
```

### Firebase Hosting
```bash
firebase deploy --only hosting
```

### Supabase Edge Functions
As Edge Functions são deployadas automaticamente via integração.

## 📱 PWA

A aplicação é um Progressive Web App completo com:
- Instalação no dispositivo
- Funcionamento offline
- Notificações push
- Atualização automática

## 🎨 Planos Disponíveis

| Plano | Descrição | Preço |
|-------|-----------|-------|
| Single | 1 música personalizada | R$ 19,90 |
| Single (Letra Própria) | 1 música com sua letra | R$ 9,90 |
| Instrumental | 1 música sem vocal | R$ 15,92 |
| Pacote 3 | 3 músicas | R$ 47,90 |
| Pacote 5 | 5 músicas | R$ 69,90 |

## 📄 Licença

Proprietário - Todos os direitos reservados.

## 📞 Contato

- Website: [criandomusicas.com.br](https://criandomusicas.com.br)

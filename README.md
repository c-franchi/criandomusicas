# Criando Músicas

Plataforma de criação de músicas personalizadas com inteligência artificial.

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase (Backend, Auth, Storage)
- Firebase (Functions, Hosting)

## Desenvolvimento Local

```sh
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Variáveis de Ambiente

O projeto utiliza as seguintes variáveis de ambiente:

### Frontend (.env)
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Chave pública do Supabase

### Firebase Functions
- `OPENAI_API_KEY`: Chave da API OpenAI
- `OPENAI_MODEL`: Modelo a usar (padrão: "gpt-4o")

Para configurar o modelo OpenAI:
```bash
firebase functions:config:set openai.model="gpt-4o"
```

## Build

```sh
npm run build
```

## Deploy

### Firebase Hosting
```sh
firebase deploy --only hosting
```

### Supabase Edge Functions
As Edge Functions são deployadas automaticamente.

## Estrutura do Projeto

```
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas da aplicação
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilitários
│   └── integrations/   # Integrações (Supabase)
├── supabase/
│   └── functions/      # Edge Functions
└── functions/          # Firebase Functions
```

## Licença

Proprietário - Todos os direitos reservados.

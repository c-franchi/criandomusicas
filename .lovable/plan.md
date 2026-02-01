

# Plano: Configurar Login com Google via Lovable Cloud

## Diagnóstico

O login com Google não está funcionando porque:
1. O código atual usa `supabase.auth.signInWithOAuth` diretamente
2. Este projeto está no Lovable Cloud, que tem seu próprio sistema gerenciado de Google OAuth
3. A pasta `src/integrations/lovable` não existe (integração OAuth não configurada)

## Solução

Usar o sistema **gerenciado** de OAuth do Lovable Cloud:
- Não precisa de credenciais próprias do Google
- Configuração automática
- Funciona tanto no preview quanto em produção

## Implementação

### Passo 1: Configurar OAuth Social do Lovable Cloud

Usar a ferramenta interna para gerar a integração:
- Criará automaticamente a pasta `src/integrations/lovable`
- Instalará o pacote `@lovable.dev/cloud-auth-js`

### Passo 2: Atualizar Auth.tsx

**Antes (linha 209-235):**
```typescript
import { supabase } from '@/integrations/supabase/client';

const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://criandomusicas.com.br/',
    },
  });
};
```

**Depois:**
```typescript
import { lovable } from '@/integrations/lovable/index';

const handleGoogleSignIn = async () => {
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
};
```

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/integrations/lovable/index.ts` | Criado automaticamente |
| `src/pages/Auth.tsx` | Atualizar função handleGoogleSignIn |
| `package.json` | Adicionar @lovable.dev/cloud-auth-js |

## Benefícios

- Login com Google funcionará imediatamente
- Sem necessidade de configurar credenciais no Google Cloud Console
- Funciona em preview e produção automaticamente
- O branding "Criando Músicas" aparecerá na tela de consentimento do Google

## Alternativa (caso queira usar credenciais próprias)

Se preferir usar suas próprias credenciais do Google (para branding personalizado):
1. Acessar Lovable Cloud Dashboard
2. Ir em Users → Authentication Settings → Sign In Methods → Google
3. Adicionar Client ID e Secret do Google Cloud Console


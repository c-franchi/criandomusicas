
# Plano: Corrigir Login Google no Domínio Personalizado

## Diagnóstico do Problema

### Causa Raiz Identificada
O erro 404 ocorre porque:

1. **O domínio `criandomusicas.com.br` está hospedado no Firebase Hosting**
2. **O OAuth do Lovable Cloud usa rotas especiais `/~oauth/*`** que são interceptadas pelo servidor do Lovable Cloud
3. **O Firebase Hosting não conhece essas rotas** e tenta servir o SPA, que também não tem essa rota

### Fluxo Atual (Quebrado)
```text
1. Usuário acessa criandomusicas.com.br (Firebase Hosting)
2. Clica em "Login com Google"
3. lovable.auth.signInWithOAuth() redireciona para:
   criandomusicas.com.br/~oauth/initiate?provider=google...
4. Firebase não conhece /~oauth/* → tenta servir index.html
5. React Router não tem rota /~oauth/initiate → 404
```

### Fluxo Correto (No Lovable Cloud)
```text
1. Usuário acessa criandomusicas.lovable.app (Lovable Cloud)
2. Clica em "Login com Google"
3. lovable.auth.signInWithOAuth() redireciona para:
   criandomusicas.lovable.app/~oauth/initiate?provider=google...
4. Lovable Cloud intercepta /~oauth/* → processa OAuth
5. Redireciona de volta com tokens → login funciona
```

## Solução

Modificar o código para detectar quando está em um domínio não-Lovable e usar o domínio Lovable Cloud como intermediário para o OAuth.

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Auth.tsx` | Detectar domínio e usar URL do Lovable Cloud para OAuth |
| `src/App.tsx` | Adicionar rota para capturar retorno do OAuth |

### Detalhes Técnicos

#### 1. Auth.tsx - Modificar handleGoogleSignIn

```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    const currentHost = window.location.host;
    const isLovableHost = currentHost.includes('lovable.app') || 
                          currentHost.includes('lovableproject.com');
    
    // URL publicada do Lovable Cloud
    const LOVABLE_CLOUD_URL = 'https://criandomusicas.lovable.app';
    
    if (isLovableHost) {
      // Domínio Lovable - OAuth normal
      console.log('[Auth] Lovable domain, using normal OAuth flow');
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (error) {
        toast({ title: t('errors.googleError'), description: error.message, variant: 'destructive' });
      }
    } else {
      // Domínio Firebase/personalizado - redirecionar via Lovable Cloud
      console.log('[Auth] Custom domain detected, redirecting to Lovable Cloud for OAuth');
      
      // Salvar domínio original para retorno
      sessionStorage.setItem('oauth_return_host', window.location.origin);
      
      // Redirecionar para Lovable Cloud que sabe processar /~oauth/*
      // Após OAuth, Lovable Cloud redirecionará de volta para /auth com tokens
      const returnUrl = `${window.location.origin}/auth`;
      window.location.href = `${LOVABLE_CLOUD_URL}/auth?oauth_google=true&return_to=${encodeURIComponent(returnUrl)}`;
    }
  } catch (err) {
    console.error('[Auth] Google sign in error:', err);
    toast({ title: t('errors.unexpectedError'), variant: 'destructive' });
  }
  setLoading(false);
};
```

#### 2. Abordagem Alternativa (Recomendada)

Como o OAuth do Lovable Cloud depende das rotas `/~oauth/*` serem interceptadas pelo servidor, a solução mais limpa seria:

**Opção A**: Redirecionar diretamente para o Lovable Cloud para fazer OAuth
```typescript
const handleGoogleSignIn = async () => {
  const currentHost = window.location.host;
  const isLovableHost = currentHost.includes('lovable.app');
  
  if (!isLovableHost) {
    // No domínio personalizado, usar URL do Lovable Cloud
    // O SDK vai iniciar OAuth a partir do domínio correto
    window.location.href = 'https://criandomusicas.lovable.app/auth?start_google_oauth=true';
    return;
  }
  
  // Fluxo normal para domínios Lovable
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: `${window.location.origin}/auth`,
  });
  // ...
};
```

**Opção B**: Adicionar rewrite no Firebase para proxy das rotas /~oauth/*
Esta opção não é viável pois o Firebase Hosting não suporta proxy para domínios externos.

## Solução Final Recomendada

A solução mais robusta é **processar o OAuth através do domínio Lovable Cloud** e depois sincronizar a sessão de volta para o domínio personalizado.

### Implementação

#### Auth.tsx - handleGoogleSignIn Corrigido

```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    const currentHost = window.location.host;
    const isLovableHost = currentHost.includes('lovable.app') || 
                          currentHost.includes('lovableproject.com');
    
    console.log('[Auth] Starting Google OAuth, host:', currentHost, 'isLovable:', isLovableHost);
    
    if (!isLovableHost) {
      // Domínio personalizado (Firebase) - não pode processar /~oauth/*
      // Redirecionar para fazer OAuth no Lovable Cloud e voltar com tokens
      console.log('[Auth] Custom domain - redirecting through Lovable Cloud');
      
      // Armazenar URL de retorno
      const returnUrl = `${window.location.origin}/auth`;
      sessionStorage.setItem('oauth_return_url', returnUrl);
      
      // Fazer OAuth via domínio Lovable e retornar
      const lovableUrl = 'https://criandomusicas.lovable.app';
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${lovableUrl}/auth`,
      });
      
      if (error) {
        console.error('[Auth] OAuth init error:', error);
        toast({ title: t('errors.googleError'), description: error.message, variant: 'destructive' });
      }
      // O SDK vai redirecionar para lovable.app/~oauth/initiate automaticamente
      return;
    }
    
    // Domínio Lovable - OAuth normal funciona
    console.log('[Auth] Lovable domain, using standard OAuth');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/auth`,
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error);
      toast({ title: t('errors.googleError'), description: error.message, variant: 'destructive' });
    }
  } catch (err) {
    console.error('[Auth] Google sign in error:', err);
    toast({ title: t('errors.unexpectedError'), variant: 'destructive' });
  }
  setLoading(false);
};
```

#### Auth.tsx - Detectar retorno OAuth e redirecionar para domínio original

No useEffect de OAuth callback, adicionar lógica para redirecionar de volta:

```typescript
// Após estabelecer sessão com sucesso:
if (session?.user) {
  console.log('[Auth] Session established for:', session.user.email);
  
  // Verificar se veio de domínio personalizado
  const returnUrl = sessionStorage.getItem('oauth_return_url');
  if (returnUrl && !window.location.origin.includes(new URL(returnUrl).host)) {
    console.log('[Auth] Redirecting back to custom domain:', returnUrl);
    sessionStorage.removeItem('oauth_return_url');
    
    // Passar tokens para o domínio original (via hash)
    // O domínio original vai capturar e estabelecer sessão
    window.location.href = `${returnUrl}#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer`;
    return;
  }
  
  // Fluxo normal - redirecionar para home
  window.location.href = '/';
}
```

## Resumo das Alterações

1. **Detectar domínio** no `handleGoogleSignIn`
2. **Para domínios não-Lovable**: Usar domínio Lovable Cloud (`criandomusicas.lovable.app`) como redirect_uri
3. **Após OAuth bem-sucedido**: Redirecionar de volta para domínio original com tokens no hash
4. **No domínio original**: Capturar tokens do hash e estabelecer sessão via `supabase.auth.setSession()`

## Testes Necessários

1. Login Google no domínio `criandomusicas.lovable.app` (deve funcionar normalmente)
2. Login Google no domínio `criandomusicas.com.br` (deve redirecionar via Lovable Cloud e voltar logado)


# Plano: Corrigir OAuth Google para Domínio Personalizado

## Problema Identificado

O código atual na linha 321-323 do `Auth.tsx` chama `lovable.auth.signInWithOAuth()` mesmo estando no domínio personalizado:

```typescript
// PROBLEMA: Esta chamada redireciona para /~oauth/initiate no domínio ATUAL
const { error } = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: `${LOVABLE_CLOUD_URL}/auth`,  // ← Este parâmetro é ignorado no INÍCIO do fluxo
});
```

O SDK do Lovable sempre inicia o OAuth no domínio atual, causando tentativa de acesso à rota `/~oauth/initiate` no Firebase, que resulta em 404.

## Solução

Modificar o fluxo para que o OAuth NUNCA seja iniciado no domínio personalizado. Em vez disso, redirecionar o navegador diretamente para o domínio Lovable.

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Auth.tsx` | Corrigir `handleGoogleSignIn` e adicionar detecção de `?start_google_oauth=true` |

## Detalhes Técnicos

### 1. Modificar handleGoogleSignIn (linhas 301-362)

**Antes (código problemático):**
```typescript
if (!isLovableHost) {
  sessionStorage.setItem('oauth_return_url', returnUrl);
  // PROBLEMA: Chama o SDK no domínio errado
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: `${LOVABLE_CLOUD_URL}/auth`,
  });
}
```

**Depois (código corrigido):**
```typescript
if (!isLovableHost) {
  // Salvar apenas a origem (não a URL completa com /auth)
  sessionStorage.setItem('oauth_return_url', window.location.origin);
  
  // NÃO chamar o SDK aqui - redirecionar diretamente para o domínio Lovable
  window.location.href = `${LOVABLE_CLOUD_URL}/auth?start_google_oauth=true`;
  return; // Importante: parar execução aqui
}
```

### 2. Adicionar Detecção de `?start_google_oauth=true`

Adicionar um novo `useEffect` no início do componente para detectar o parâmetro e iniciar OAuth automaticamente:

```typescript
// Detectar se veio redirecionado do domínio personalizado para iniciar OAuth
useEffect(() => {
  const startGoogleOAuth = searchParams.get('start_google_oauth');
  const currentHost = window.location.host;
  const isLovableHost = currentHost.includes('lovable.app') || currentHost.includes('lovableproject.com');
  
  // Só iniciar OAuth se:
  // 1. Estiver no domínio Lovable
  // 2. Tiver o parâmetro start_google_oauth=true
  // 3. Não estiver já processando OAuth
  if (isLovableHost && startGoogleOAuth === 'true' && !isProcessingOAuth) {
    console.log('[Auth] Starting Google OAuth from redirect');
    
    // Limpar o parâmetro da URL para evitar loop
    window.history.replaceState(null, '', '/auth');
    
    // Iniciar OAuth agora que estamos no domínio correto
    lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/auth`,
    }).then(({ error }) => {
      if (error) {
        console.error('[Auth] OAuth start error:', error);
      }
    });
  }
}, [searchParams, isProcessingOAuth]);
```

### 3. Ajustar Lógica de Retorno (linhas 121-153)

Corrigir para usar apenas a origem salva (não `/auth`):

```typescript
// Verificar se oauth_return_url contém apenas a origem
const returnUrl = sessionStorage.getItem('oauth_return_url');

if (session?.access_token && session?.refresh_token) {
  const returnOrigin = returnUrl; // Já é apenas a origem
  if (returnOrigin && !returnOrigin.includes('lovable.app')) {
    console.log('[Auth] Redirecting back to custom domain');
    sessionStorage.removeItem('oauth_return_url');
    
    // Redirecionar para /auth no domínio original com tokens
    window.location.href = `${returnOrigin}/auth#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer`;
  }
}
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuário em criandomusicas.com.br clica "Entrar com Google"   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleGoogleSignIn detecta domínio personalizado             │
│    - Salva origem em sessionStorage                             │
│    - Redireciona para lovable.app/auth?start_google_oauth=true  │
│    - NÃO chama SDK                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Auth.tsx no domínio Lovable detecta ?start_google_oauth=true │
│    - useEffect captura o parâmetro                              │
│    - Chama lovable.auth.signInWithOAuth()                       │
│    - SDK redireciona para /~oauth/initiate (funciona!)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Google OAuth acontece normalmente                            │
│    - Usuário autentica no Google                                │
│    - Google redireciona de volta para lovable.app/auth          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Supabase estabelece sessão no domínio Lovable                │
│    - useEffect detecta oauth_return_url no sessionStorage       │
│    - Redireciona para criandomusicas.com.br/auth#tokens...      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Auth.tsx no domínio personalizado captura tokens do hash     │
│    - supabase.auth.setSession() estabelece sessão local         │
│    - Usuário está autenticado!                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Alterações Resumidas no Código

1. **Linha ~312-335**: Remover chamada ao SDK no domínio personalizado, usar `window.location.href` diretamente

2. **Adicionar novo useEffect**: Detectar `?start_google_oauth=true` e iniciar OAuth no domínio Lovable

3. **Linha ~316**: Salvar apenas `window.location.origin` (não `/auth`) no sessionStorage

4. **Linha ~141**: Ajustar para usar `${returnOrigin}/auth#tokens...`

## Testes Necessários

1. Acessar `criandomusicas.com.br/auth` e clicar em "Entrar com Google"
   - Deve redirecionar para `criandomusicas.lovable.app/auth?start_google_oauth=true`
   - NÃO deve tentar acessar `/~oauth/initiate` no domínio personalizado

2. OAuth deve completar no domínio Lovable
   - Google login funciona normalmente

3. Após autenticação, usuário deve retornar ao domínio personalizado
   - Sessão deve estar ativa
   - Não deve haver erro 404

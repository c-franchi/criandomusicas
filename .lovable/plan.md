

# Plano: Corrigir Logout e Login Google

## Diagnóstico

Os logs do servidor mostram:
- `session_not_found` no endpoint `/logout` com status `403`
- Isso significa que o logout no servidor falha, mas o código atual **não limpa os dados locais** quando isso acontece

### Fluxo Atual (Quebrado)
1. Usuário clica logout
2. `supabase.auth.signOut()` é chamado
3. Servidor retorna erro 403 (sessão não existe)
4. **localStorage NÃO é limpo** porque o SDK não força limpeza local em erro
5. Usuário vai para tela de login, mas sessão antiga ainda está no localStorage
6. Ao tentar login Google, há conflito de sessões
7. Erro 404 aparece, mas depois a sessão antiga é restaurada

## Solução

### 1. Melhorar `handleSignOut` em `useAuth.tsx`

Forçar limpeza local independente do resultado da API:

```typescript
const handleSignOut = async () => {
  console.log('[Auth] Starting signOut...');
  
  try {
    // Attempt server signout but don't depend on success
    await supabase.auth.signOut({ scope: 'local' });
    console.log('[Auth] Server signOut completed');
  } catch (error) {
    console.error('[Auth] Server signOut error (will clean local anyway):', error);
  }
  
  // ALWAYS clear local state regardless of server response
  setUser(null);
  setSession(null);
  setProfile(null);
  
  // Force clear localStorage auth keys
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('sb-') || key.includes('supabase')
  );
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log('[Auth] Local storage cleaned, keys removed:', keysToRemove.length);
};
```

### 2. Adicionar Logs no OAuth Callback

Melhorar o `useEffect` em `Auth.tsx` para mais visibilidade:

```typescript
useEffect(() => {
  const handleOAuthCallback = async () => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    console.log('[Auth] Page load check:', {
      path: currentPath,
      hasHash: !!currentHash,
      hashPreview: currentHash.substring(0, 50)
    });
    
    // Check for existing session first
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    console.log('[Auth] Existing session:', existingSession ? existingSession.user.email : 'none');
    
    // ... rest of logic
  };
  
  handleOAuthCallback();
}, []);
```

### 3. Tratar Redirecionamento OAuth Corretamente

Atualizar lógica de redirecionamento para evitar 404:

```typescript
// No handleOAuthCallback
if (session?.user) {
  console.log('[Auth] OAuth complete, user:', session.user.email);
  
  // Use React Router navigation instead of window.location
  // to avoid potential 404 issues
  setIsProcessingOAuth(false);
  // Let the Navigate component handle redirect
  return;
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAuth.tsx` | Melhorar `handleSignOut` com limpeza forçada do localStorage |
| `src/pages/Auth.tsx` | Adicionar mais logs e melhorar tratamento de redirecionamento |

## Detalhes Técnicos

### useAuth.tsx - handleSignOut Melhorado

```typescript
const handleSignOut = async () => {
  console.log('[Auth] Initiating sign out...');
  
  try {
    // Use 'local' scope to ensure local cleanup even if server session is gone
    await supabase.auth.signOut({ scope: 'local' });
    console.log('[Auth] Supabase signOut completed');
  } catch (error) {
    // Log but don't throw - we'll clean up locally anyway
    console.error('[Auth] SignOut API error:', error);
  }
  
  // CRITICAL: Always clear state regardless of API result
  setUser(null);
  setSession(null);
  setProfile(null);
  
  // Force clear all Supabase-related localStorage items
  try {
    const storageKeys = Object.keys(localStorage);
    const supabaseKeys = storageKeys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase') ||
      key.includes('auth-token')
    );
    
    supabaseKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('[Auth] Removed localStorage key:', key);
    });
    
    console.log('[Auth] Local cleanup complete. Removed', supabaseKeys.length, 'keys');
  } catch (e) {
    console.error('[Auth] localStorage cleanup error:', e);
  }
};
```

### Auth.tsx - OAuth Callback Melhorado

```typescript
useEffect(() => {
  const handleOAuthCallback = async () => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    console.log('[Auth] ======= OAuth Check Start =======');
    console.log('[Auth] Path:', currentPath);
    console.log('[Auth] Hash exists:', !!currentHash);
    console.log('[Auth] Full URL:', window.location.href);
    
    // First check existing session state
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    console.log('[Auth] Existing session check:', {
      hasSession: !!existingSession,
      userEmail: existingSession?.user?.email || 'none'
    });
    
    // Detect OAuth callback scenarios
    const hashParams = new URLSearchParams(currentHash.substring(1));
    const accessToken = hashParams.get('access_token');
    const isOAuthCallbackPath = currentPath === '/~oauth/callback';
    const isAuthCallbackPath = currentPath === '/auth/callback';
    
    const isOAuthCallback = !!accessToken || isOAuthCallbackPath || isAuthCallbackPath;
    
    console.log('[Auth] OAuth detection:', {
      hasAccessToken: !!accessToken,
      isOAuthCallbackPath,
      isAuthCallbackPath,
      isOAuthCallback
    });
    
    if (!isOAuthCallback) {
      console.log('[Auth] Not an OAuth callback, skipping');
      return;
    }
    
    console.log('[Auth] Processing OAuth callback...');
    setIsProcessingOAuth(true);
    
    // ... rest of session check logic
  };
  
  handleOAuthCallback();
}, []);
```

## Testes Recomendados

1. **Teste de Logout**:
   - Fazer login com qualquer método
   - Fazer logout
   - Verificar no console que os logs `[Auth] Local cleanup complete` aparecem
   - Verificar no DevTools > Application > Local Storage que não há chaves `sb-*`

2. **Teste de Login Google após Logout**:
   - Fazer login com Google
   - Fazer logout
   - Tentar login com Google novamente
   - Verificar se NÃO há erro 404
   - Verificar se o login completa normalmente

3. **Verificação de Console**:
   - Todos os passos devem mostrar logs `[Auth]` no console
   - Facilita debug de problemas futuros


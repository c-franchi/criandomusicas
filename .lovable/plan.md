
# Plano: Simplificar OAuth - Usar Apenas Supabase Auth Nativo

## Problema Atual

O código atual mistura dois sistemas de OAuth que conflitam:

1. **Lovable OAuth SDK** (`lovable.auth.signInWithOAuth`)
2. **Supabase Auth** (`supabase.auth.signInWithOAuth`)

Isso causa:
- Callbacks diferentes disputando a sessão
- Sessão criada → sobrescrita → destruída
- Loop de "pisca e volta"

## Solução

**Remover completamente o Lovable OAuth** e usar **apenas Supabase Auth nativo**, que já funcionava antes.

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Auth.tsx` | Simplificar para usar apenas `supabase.auth.signInWithOAuth()` |

## Alterações Detalhadas

### 1. Remover Import do Lovable (linha 11)

```typescript
// REMOVER esta linha:
import { lovable } from '@/integrations/lovable/index';
```

### 2. Remover useEffect de Cross-Domain OAuth (linhas 121-152)

Todo este bloco será **REMOVIDO** - não precisamos mais detectar `start_google_oauth`:

```typescript
// REMOVER este useEffect inteiro:
useEffect(() => {
  const startGoogleOAuth = searchParams.get('start_google_oauth');
  // ... todo o código de cross-domain redirect
}, [searchParams, isProcessingOAuth, toast, t]);
```

### 3. Remover useEffect de Redirect de Retorno (linhas 155-181)

Todo este bloco será **REMOVIDO** - não há mais fluxo cross-domain:

```typescript
// REMOVER este useEffect inteiro:
useEffect(() => {
  const checkCrossDomainRedirect = async () => {
    // ... todo o código de redirect back
  };
  // ...
}, [user]);
```

### 4. Simplificar handleGoogleSignIn (linhas 329-375)

**ANTES (complexo com cross-domain):**
```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    const currentHost = window.location.host;
    const isLovableHost = currentHost.includes('lovable.app');
    const LOVABLE_CLOUD_URL = 'https://criandomusicas.lovable.app';
    
    if (!isLovableHost) {
      sessionStorage.setItem('oauth_return_url', window.location.origin);
      window.location.href = `${LOVABLE_CLOUD_URL}/auth?start_google_oauth=true`;
      return;
    }
    
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/auth`,
    });
    // ...
  }
};
```

**DEPOIS (simples com Supabase nativo):**
```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    console.log('[Auth] Starting Google OAuth with Supabase');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`
      }
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error);
      toast({
        title: t('errors.googleError'),
        description: error.message,
        variant: 'destructive',
      });
    }
  } catch (err) {
    console.error('[Auth] Google sign in error:', err);
    toast({
      title: t('errors.unexpectedError'),
      variant: 'destructive',
    });
  }
  setLoading(false);
};
```

### 5. Manter useEffect de Captura de Tokens (linhas 46-94)

Este **permanece** - ainda é útil para capturar tokens do hash da URL após OAuth:

```typescript
// MANTER este useEffect (funciona com Supabase OAuth também)
useEffect(() => {
  const handleOAuthCallback = async () => {
    const currentHash = window.location.hash;
    if (!currentHash) return;

    const hashParams = new URLSearchParams(currentHash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // ... estabelecer sessão
    }
  };
  handleOAuthCallback();
}, [toast, t]);
```

### 6. Remover Estado desnecessário

```typescript
// REMOVER:
const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

// MANTER o loading para o botão:
const [loading, setLoading] = useState(false);
```

### 7. Remover Loading de OAuth Processing (linhas 184-193)

```typescript
// REMOVER este bloco:
if (isProcessingOAuth) {
  return (
    <div className="...">
      <Loader2 ... />
      <p>Processando login...</p>
    </div>
  );
}
```

## Fluxo Simplificado

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuário clica "Entrar com Google" (qualquer domínio)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. supabase.auth.signInWithOAuth({                              │
│      provider: 'google',                                        │
│      options: { redirectTo: window.location.origin/auth }       │
│    })                                                           │
│                                                                 │
│    Supabase redireciona para:                                   │
│    haiiaqzhuydsjujtdcnq.supabase.co/auth/v1/authorize?...       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Google OAuth acontece normalmente                            │
│    (no domínio do Google)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Google redireciona para:                                     │
│    haiiaqzhuydsjujtdcnq.supabase.co/auth/v1/callback            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Supabase processa callback e redireciona para:               │
│    criandomusicas.com.br/auth#access_token=...                  │
│    (ou lovable.app, dependendo do redirectTo original)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. useEffect captura tokens do hash                             │
│    supabase.auth.setSession() estabelece sessão                 │
│    Usuário autenticado!                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Configuração Necessária no Backend (Usuário deve fazer)

### Google Cloud Console

Em **Authorized redirect URIs**, deve ter **APENAS**:

```
https://haiiaqzhuydsjujtdcnq.supabase.co/auth/v1/callback
```

### Lovable Cloud Dashboard (URL Configuration)

- **Site URL**: `https://criandomusicas.com.br`
- **Additional Redirect URLs**:
  - `https://criandomusicas.com.br/auth`
  - `https://criandomusicas.lovable.app/auth`

## Resumo das Alterações no Código

| Linha | Ação | Descrição |
|-------|------|-----------|
| 11 | REMOVER | Import do `lovable` |
| 37 | REMOVER | Estado `isProcessingOAuth` |
| 121-152 | REMOVER | useEffect de `start_google_oauth` |
| 155-181 | REMOVER | useEffect de redirect cross-domain |
| 184-193 | REMOVER | Loading de OAuth processing |
| 329-375 | REESCREVER | `handleGoogleSignIn` simplificado |

## Benefícios

1. **Código mais simples** - menos de 100 linhas removidas
2. **Um único sistema de auth** - apenas Supabase
3. **Funciona em qualquer domínio** - sem cross-domain hacks
4. **Era assim que funcionava antes** - testado e comprovado
5. **Branding** - pode ser ajustado no Google Console sem tocar no código

## Testes Necessários

1. Publicar a aplicação
2. Acessar `criandomusicas.com.br/auth` e clicar em "Entrar com Google"
3. Verificar que OAuth completa sem erro 404
4. Verificar que sessão persiste no domínio próprio

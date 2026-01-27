

# Plano: Corrigir redirectTo do Login Google

## Problema

O `redirectTo` no login Google usa `window.location.origin`, que pode retornar diferentes valores dependendo de onde o usuário acessa:
- Preview Lovable: `https://id-preview--...lovable.app`
- URL publicada: `https://criandomusicas.lovable.app`
- Domínio próprio: `https://criandomusicas.com.br`

Isso causa conflito com as configurações do Google OAuth e Supabase que esperam o domínio próprio.

---

## Solução

Forçar o `redirectTo` para sempre usar o domínio de produção: `https://criandomusicas.com.br`

---

## Mudança no Código

**Arquivo:** `src/pages/Auth.tsx`

**Antes (linha 199-204):**
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/`,
  },
});
```

**Depois:**
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://criandomusicas.com.br/',
  },
});
```

---

## Considerações

| Cenário | Antes | Depois |
|---------|-------|--------|
| Acesso pelo preview | Redireciona para preview (pode falhar) | Redireciona para domínio próprio |
| Acesso por criandomusicas.lovable.app | Redireciona para lovable.app (pode falhar) | Redireciona para domínio próprio |
| Acesso por criandomusicas.com.br | Funciona | Funciona |

**Nota:** Após a mudança, logins iniciados no preview serão redirecionados para o domínio de produção após autenticação.

---

## Passo a Passo

1. Alterar `redirectTo` de `${window.location.origin}/` para `https://criandomusicas.com.br/`
2. Publicar a alteração
3. Testar em aba anônima acessando `https://criandomusicas.com.br/auth`
4. Verificar se o Google mostra o branding correto e o login funciona


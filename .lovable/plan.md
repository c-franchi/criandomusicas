
# Plano de Implementação - Correções e Melhorias

## Resumo dos Problemas Identificados

1. **Criação Rápida sem feedback de processo**: O overlay de loading existe mas pode não estar sendo mostrado durante todo o fluxo
2. **Admin sem "Iniciar Produção"**: Pedidos do modo rápido devem aparecer com status `LYRICS_APPROVED` para mostrar o botão
3. **Email de boas-vindas no login Google**: O email está sendo enviado apenas no signup tradicional (linhas 188-197 de Auth.tsx), mas usuários Google também estão recebendo - isso sugere que há um trigger de banco de dados ou que o fluxo está incorreto
4. **Aviso de 12h para entrega**: Adicionar informação visual sobre prazo de entrega
5. **Login Google com 404**: O callback OAuth precisa de tratamento adequado

## Análise do Fluxo de Email

### Situação Atual
- O email de boas-vindas é enviado **apenas** na função `handleSignUp` após cadastro com email/senha
- Para login Google, NÃO há envio de email de boas-vindas no código atual
- **Possibilidade**: O trigger `handle_new_user` no banco de dados cria o perfil para novos usuários, mas não envia email

### Fluxo Correto para Google OAuth
Para usuários Google, o fluxo de email deveria funcionar assim:
1. Usuário clica "Entrar com Google"
2. OAuth callback retorna com sessão
3. Se é a **primeira vez** (novo usuário), enviar email de boas-vindas
4. Se já existe, apenas logar sem enviar email

## Correções Planejadas

### 1. Corrigir Login Google (Auth.tsx)

**Problema**: Após OAuth, o usuário cai em 404 porque a sessão não é capturada corretamente.

**Solução**: Adicionar detecção de callback OAuth e aguardar a sessão ser estabelecida:

```text
Arquivo: src/pages/Auth.tsx

Adicionar useEffect para detectar OAuth callback:
- Verificar se URL tem hash com access_token ou se é rota /~oauth/callback
- Mostrar loading enquanto processa
- Após sessão estabelecida, redirecionar para home
```

### 2. Email de Boas-Vindas para Google OAuth

**Problema**: Usuários Google não deveriam receber email OU deveriam receber apenas na primeira vez.

**Solução**: Verificar se é novo usuário via `event === 'SIGNED_IN'` combinado com checagem de perfil existente:

```text
Arquivo: src/pages/Auth.tsx

No useEffect que detecta OAuth callback:
1. Após sessão estabelecida, verificar se é primeiro login
2. Se profile não existe ou foi criado agora, enviar welcome email
3. Usar user.user_metadata.name ou email como userName
```

### 3. Melhorar Feedback na Criação Rápida (Briefing.tsx)

**Problema**: Loading pode não persistir durante todo o fluxo.

**Solução**:
```text
Arquivo: src/pages/Briefing.tsx

1. Manter isCreatingOrder=true até navigate()
2. Adicionar toasts intermediários mostrando progresso:
   - "Verificando créditos..."
   - "Gerando letra..."
   - "Aprovando automaticamente..."
   - "Iniciando produção..."
3. Incluir aviso de prazo: "Sua música será entregue em até 12 horas"
```

### 4. Aviso de 12 Horas na Criação Rápida

**Solução**: Adicionar mensagem no toast final e no loading overlay:

```text
Arquivo: src/pages/Briefing.tsx

No toast de sucesso:
title: '🎵 Música em produção!'
description: 'Você receberá sua música em até 12 horas. Acompanhe no dashboard.'

No overlay de loading:
- Adicionar subtítulo: "Sua música será entregue em até 12 horas ⏰"
```

### 5. Atualizar Traduções

```text
Arquivos: public/locales/{pt-BR,en,es,it}/briefing.json

Adicionar chaves:
- quickCreation.creatingProgress: "Criando sua música..."
- quickCreation.deliveryTime: "Entrega em até 12 horas"
- quickCreation.successDescription: "Você receberá sua música em até 12 horas. Acompanhe no dashboard."
```

### 6. Atualizar Email de Boas-Vindas (48h → 24h)

**Observação**: O email de boas-vindas menciona "48 horas" (linha 89), mas o prazo correto é 24h conforme memória do sistema.

```text
Arquivo: supabase/functions/send-welcome-email/index.ts

Alterar linha 89:
De: "Em até 48 horas, sua música estará pronta"
Para: "Em até 24 horas, sua música estará pronta"
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Auth.tsx` | Adicionar tratamento de OAuth callback e welcome email para Google |
| `src/pages/Briefing.tsx` | Melhorar feedback de loading e adicionar aviso de 12h |
| `public/locales/pt-BR/briefing.json` | Novas chaves de tradução |
| `public/locales/en/briefing.json` | Novas chaves de tradução |
| `public/locales/es/briefing.json` | Novas chaves de tradução |
| `public/locales/it/briefing.json` | Novas chaves de tradução |
| `supabase/functions/send-welcome-email/index.ts` | Corrigir prazo de 48h para 24h |

---

## Detalhes Técnicos

### Código para Auth.tsx - OAuth Callback Handler

```typescript
// Adicionar após os estados existentes
const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

// Novo useEffect para OAuth callback
useEffect(() => {
  const handleOAuthCallback = async () => {
    // Detectar se é callback OAuth
    const isOAuthCallback = window.location.pathname === '/~oauth/callback' ||
      window.location.hash.includes('access_token');
    
    if (!isOAuthCallback) return;
    
    setIsProcessingOAuth(true);
    
    // Aguardar sessão ser estabelecida
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verificar se é novo usuário (perfil criado recentemente)
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (profile) {
          const profileAge = Date.now() - new Date(profile.created_at).getTime();
          const isNewUser = profileAge < 60000; // Menos de 1 minuto
          
          if (isNewUser) {
            // Enviar email de boas-vindas
            const userName = session.user.user_metadata?.name || 
                           session.user.email?.split('@')[0] || 
                           'Usuário';
            
            try {
              await supabase.functions.invoke('send-welcome-email', {
                body: { email: session.user.email, userName }
              });
            } catch (e) {
              console.error('Welcome email error:', e);
            }
          }
        }
        
        // Limpar hash e redirecionar
        window.history.replaceState(null, '', '/');
        setIsProcessingOAuth(false);
      }
    };
    
    // Aguardar um pouco para sessão processar
    setTimeout(checkSession, 500);
  };
  
  handleOAuthCallback();
}, []);

// Mostrar loading se processando OAuth
if (isProcessingOAuth) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

### Código para Briefing.tsx - Feedback Melhorado

```typescript
// Na função processOrderAfterCredit, adicionar toasts de progresso:

} else if (isQuickMode) {
  // MODO RÁPIDO: gerar letra + aprovar automaticamente
  toast({
    title: '✨ Gerando letra...',
    description: 'Aguarde alguns segundos.',
  });
  
  // 1. Gerar letras
  await supabase.functions.invoke('generate-lyrics', { ... });
  
  // 2. Aguardar e aprovar
  toast({
    title: '📝 Aprovando automaticamente...',
    description: 'Quase lá!',
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentar para 3s
  
  // ... resto do código ...
  
  toast({
    title: '🎵 Música em produção!',
    description: 'Você receberá sua música em até 12 horas. Acompanhe no dashboard.',
  });
}

// No overlay de loading (linha ~2915):
{isCreatingOrder && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-foreground font-medium">{t('quickCreation.creating')}</p>
      <p className="text-sm text-muted-foreground">{t('quickCreation.deliveryTime')}</p>
    </div>
  </div>
)}
```

---

## Testes Recomendados

1. **Login Google**:
   - Criar nova conta via Google
   - Verificar se email de boas-vindas é enviado (apenas 1x)
   - Verificar se não há erro 404
   - Deslogar e logar novamente - NÃO deve enviar outro email

2. **Criação Rápida**:
   - Criar música com crédito disponível
   - Verificar overlay de loading com mensagem de 12h
   - Verificar toasts de progresso
   - Confirmar redirecionamento para dashboard

3. **Admin**:
   - Verificar se pedido do modo rápido aparece com botão "Iniciar Produção"
   - Confirmar status LYRICS_APPROVED após criação rápida

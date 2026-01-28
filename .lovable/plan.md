
# Sistema de Notificações por E-mail

## Resumo

Vou implementar um sistema completo de e-mails transacionais para registrar e notificar os usuários em momentos-chave da jornada, usando a infraestrutura já existente (Resend + Edge Functions).

## Tipos de E-mail a Implementar

### 1. E-mail de Boas-Vindas (Cadastro)
- **Gatilho**: Novo usuário se registra na plataforma
- **Conteúdo**: Saudação personalizada, instruções de uso, link para dashboard
- **Template**: Design moderno com gradiente roxo, branding "Criando Músicas"

### 2. E-mail de Compra/Créditos (já existe parcialmente)
- **Atual**: `send-purchase-email` já envia confirmações de compra
- **Melhorias**: Adicionar mais detalhes da transação, número do pedido formatado

### 3. E-mail de Música Pronta
- **Gatilho**: Quando o status do pedido muda para `MUSIC_READY`
- **Conteúdo**: Notificação de que a música está pronta, link direto para ouvir
- **CTA**: "Ouvir Minha Música"

### 4. E-mail de PIX Confirmado (para Admin confirmar)
- **Gatilho**: Admin confirma pagamento PIX
- **Conteúdo**: Confirmação de pagamento recebido, próximos passos

## Arquitetura Técnica

```text
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE E-MAILS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │   Auth Events   │────►│  send-welcome-email         │   │
│  │   (Sign Up)     │     │  (Nova Edge Function)       │   │
│  └─────────────────┘     └─────────────────────────────┘   │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  Payment Flow   │────►│  send-purchase-email        │   │
│  │  (verify-payment│     │  (Já Existe - Melhorar)     │   │
│  │   / PIX Admin)  │     └─────────────────────────────┘   │
│  └─────────────────┘                                        │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  Music Ready    │────►│  send-music-ready-email     │   │
│  │  Status Change  │     │  (Nova Edge Function)       │   │
│  └─────────────────┘     └─────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementação Detalhada

### Fase 1: E-mail de Boas-Vindas

**Nova Edge Function: `send-welcome-email`**

```typescript
// supabase/functions/send-welcome-email/index.ts
interface WelcomeEmailRequest {
  email: string;
  userName: string;
}
```

**Template do E-mail:**
- Header com logo e gradiente roxo
- Mensagem de boas-vindas personalizada
- 3 passos para começar (Briefing → Pagamento → Música)
- Botão CTA "Criar Minha Primeira Música"
- Footer com contato

**Integração:**
- Chamar no `Auth.tsx` após `signUp` bem-sucedido
- Ou usar Database Webhook no Supabase (quando profile é criado)

### Fase 2: E-mail de Música Pronta

**Nova Edge Function: `send-music-ready-email`**

```typescript
interface MusicReadyEmailRequest {
  email: string;
  userName: string;
  orderId: string;
  songTitle?: string;
  musicType: string;
}
```

**Template do E-mail:**
- Celebração com emoji 🎵
- Título da música (se disponível)
- Botão "Ouvir Minha Música"
- Seção para compartilhar
- CTA para avaliar o serviço

**Integração:**
- Chamar no `AdminDashboard.tsx` quando admin marca música como pronta
- Ou usar Database Trigger no Supabase

### Fase 3: Melhorias no E-mail de Compra

**Atualizações em `send-purchase-email`:**
- Adicionar ID do pedido formatado (primeiros 8 caracteres)
- Incluir resumo do briefing (tipo de música, estilo)
- Prazo estimado de entrega
- Instruções específicas por tipo de compra

### Fase 4: E-mail de PIX Confirmado

**Reutilizar `send-purchase-email`**
- Adicionar flag `paymentMethod: 'pix'`
- Mensagem específica para PIX
- Instruções de próximos passos

## Arquivos a Criar/Modificar

### Novos Arquivos:
1. `supabase/functions/send-welcome-email/index.ts` - E-mail de boas-vindas
2. `supabase/functions/send-music-ready-email/index.ts` - E-mail de música pronta

### Arquivos a Modificar:
1. `supabase/config.toml` - Adicionar novas funções
2. `src/hooks/useAuth.tsx` ou `src/pages/Auth.tsx` - Chamar welcome email
3. `src/pages/AdminDashboard.tsx` - Chamar music ready email
4. `supabase/functions/send-purchase-email/index.ts` - Adicionar suporte a PIX

## Templates de E-mail (Visual)

Todos os e-mails seguirão o padrão visual existente:
- **Header**: Gradiente roxo (#7c3aed → #a855f7) com logo
- **Corpo**: Fundo branco, tipografia clara
- **Cards**: Fundo cinza claro para destaque de informações
- **Botões**: Gradiente roxo, bordas arredondadas
- **Footer**: Copyright + aviso de e-mail automático

## Considerações de Segurança

1. **Validação de entrada**: Zod para validar campos obrigatórios
2. **Rate limiting**: Não enviar duplicados
3. **Logs**: Registrar todas as tentativas de envio
4. **Fallback**: Não falhar operações principais se e-mail falhar

## Próximos Passos (Opcionais)

- E-mail de lembrete para pedidos abandonados
- E-mail de renovação de assinatura Creator
- E-mail de aniversário de cliente
- E-mail de feedback após 7 dias da entrega

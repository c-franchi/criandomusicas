
# Arquitetura Profissional de Emails

## Configuração Ideal

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE EMAILS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📤 RESEND (Envio Automático)                                   │
│  ├── Remetente: noreply@criandomusicas.com.br                   │
│  ├── Reply-To: contato@criandomusicas.com.br  ← NOVO!           │
│  ├── SPF, DKIM, DMARC configurados                              │
│  └── Todos os emails transacionais                              │
│                                                                 │
│                        ↓ Resposta do cliente                    │
│                                                                 │
│  📥 HOSTINGER (Recebimento)                                     │
│  ├── contato@criandomusicas.com.br                              │
│  ├── suporte@criandomusicas.com.br                              │
│  └── Caixa de entrada para responder usuários                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## O Que Será Feito

### Adicionar `replyTo` em Todas as Edge Functions

O Resend suporta o campo `replyTo` que permite:
- Manter `noreply@` como remetente técnico
- Direcionar respostas para `contato@` no Hostinger

**Antes:**
```typescript
from: "Criando Músicas <noreply@criandomusicas.com.br>",
```

**Depois:**
```typescript
from: "Criando Músicas <noreply@criandomusicas.com.br>",
replyTo: "contato@criandomusicas.com.br",
```

---

## Arquivos a Serem Alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-recovery-email/index.ts` | Adicionar `replyTo: "contato@criandomusicas.com.br"` |
| `supabase/functions/send-welcome-email/index.ts` | Adicionar `replyTo: "contato@criandomusicas.com.br"` |
| `supabase/functions/send-purchase-email/index.ts` | Adicionar `replyTo: "contato@criandomusicas.com.br"` |
| `supabase/functions/send-music-ready-email/index.ts` | Adicionar `replyTo: "contato@criandomusicas.com.br"` |

---

## Mudança de Texto nos Emails

Também vou atualizar o texto do footer dos emails:

**Antes:**
```html
Este é um email automático, por favor não responda.
```

**Depois:**
```html
Responda este email para falar diretamente conosco.
```

---

## Benefícios

| Recurso | Descrição |
|---------|-----------|
| **Profissionalismo** | Email técnico separado do email de atendimento |
| **Resposta Fácil** | Clientes podem responder diretamente e cai na caixa Hostinger |
| **Sem Conflito** | Resend envia, Hostinger recebe - cada um faz sua função |
| **Melhor Entregabilidade** | `noreply@` com SPF/DKIM adequado |

---

## Detalhes Técnicos

### Código Final (Exemplo)

```typescript
const emailResponse = await resend.emails.send({
  from: "Criando Músicas <noreply@criandomusicas.com.br>",
  replyTo: "contato@criandomusicas.com.br",
  to: [email],
  subject: "...",
  html: emailHtml,
});
```

### Resultado para o Usuário

Quando o cliente receber um email e clicar em "Responder":
- O email será enviado para `contato@criandomusicas.com.br`
- Você receberá na caixa de entrada do Hostinger
- Pode responder normalmente pelo Hostinger

---

## Resumo

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `send-recovery-email/index.ts` | Adicionar `replyTo` + atualizar texto footer |
| 2 | `send-welcome-email/index.ts` | Adicionar `replyTo` |
| 3 | `send-purchase-email/index.ts` | Adicionar `replyTo` |
| 4 | `send-music-ready-email/index.ts` | Adicionar `replyTo` |

Esta é a arquitetura correta e profissional que você solicitou!

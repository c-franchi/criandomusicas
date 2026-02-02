
# Plano: Notificações Admin via E-mail + WhatsApp (TextMeBot)

## Objetivo

Implementar sistema de notificações alternativo para o admin usando:
1. **E-mail** via Resend (já configurado)
2. **WhatsApp** via TextMeBot API

## Secret Necessário

| Secret | Descrição |
|--------|-----------|
| `TEXTMEBOT_API_KEY` | Chave da API TextMeBot |

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/notify-admin-order/index.ts` | Adicionar e-mail + WhatsApp |

## Implementação

### Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│              NOVO PEDIDO / PIX RECEBIDO                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              notify-admin-order (Edge Function)                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Push Notification (existente - pode falhar)             ││
│  │ 2. E-mail via Resend ✅                                    ││
│  │ 3. WhatsApp via TextMeBot ✅                               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Detalhes Técnicos

**1. Serviço WhatsApp (TextMeBot)**

```typescript
// Função centralizada com boas práticas anti-ban
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("TEXTMEBOT_API_KEY");
  if (!apiKey) {
    console.error("[WhatsApp] API Key não configurada");
    return false;
  }

  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.textmebot.com/send.php?recipient=${phone}&apikey=${apiKey}&text=${encodedMessage}`;
    
    const response = await fetch(url);
    const result = await response.text();
    
    console.log(`[WhatsApp] Enviado para ${phone}: ${result}`);
    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Erro:", error);
    return false;
  }
}
```

**2. E-mail via Resend**

```typescript
// Usando Resend já configurado
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

await resend.emails.send({
  from: "Criando Músicas <noreply@criandomusicas.com.br>",
  to: ["neizao.franchi@gmail.com"],
  replyTo: "contato@criandomusicas.com.br",
  subject: isPixReceipt 
    ? `💰 Comprovante PIX - ${userName}` 
    : `🎵 Novo Pedido - ${userName}`,
  html: emailTemplate
});
```

### Mensagens de Notificação

**E-mail (HTML)**:
```html
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #8B5CF6;">🎵 Novo Pedido Recebido!</h2>
  <p><strong>Cliente:</strong> {userName}</p>
  <p><strong>Tipo:</strong> {musicType}</p>
  <p><strong>Pedido:</strong> #{orderId}</p>
  <a href="https://criandomusicas.lovable.app/admin" 
     style="background: #8B5CF6; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 8px; display: inline-block;">
    Abrir Painel Admin
  </a>
</div>
```

**WhatsApp (Texto)**:
```text
🎵 *Novo Pedido!*

👤 Cliente: {userName}
🎶 Tipo: {musicType}
📋 Pedido: #{orderId}

🔗 https://criandomusicas.lovable.app/admin
```

### Dados Fixos do Admin

| Campo | Valor |
|-------|-------|
| E-mail | neizao.franchi@gmail.com |
| WhatsApp | 5516997813038 |

### Boas Práticas Implementadas

| Prática | Implementação |
|---------|---------------|
| API Key em variável de ambiente | `TEXTMEBOT_API_KEY` |
| Encode correto da mensagem | `encodeURIComponent()` |
| Fallback de erro | Try/catch com log |
| Estrutura modular | Função `sendWhatsAppMessage()` |
| Sem loops automáticos | Envio único por evento |
| Logs de envio | Console.log com status |

### Fluxo de Fallback

```text
Evento (Novo Pedido/PIX)
         │
         ├─→ Push (pode falhar) ──→ Log
         │
         ├─→ E-mail (Resend) ────→ Log
         │
         └─→ WhatsApp (TextMeBot) → Log
```

## Testes Necessários

1. Criar pedido de teste no modo rápido
2. Verificar e-mail no inbox do admin
3. Verificar mensagem WhatsApp no celular do admin
4. Testar upload de comprovante PIX
5. Verificar logs da edge function

## Próximo Passo

Preciso da **API Key do TextMeBot** para configurar como secret. Se ainda não tiver, acesse https://textmebot.com para obter.

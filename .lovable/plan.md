
# Plano de Implementacao: Compartilhamento de Vouchers e Creditos

## Visao Geral

Este plano cobre duas funcionalidades solicitadas:

1. **Painel Admin**: Adicionar botoes para compartilhar vouchers criados nas redes sociais
2. **Usuarios**: Permitir que usuarios transfiram creditos para amigos

---

## Parte 1: Compartilhamento de Vouchers pelo Admin

### Objetivo
Permitir que administradores compartilhem vouchers criados diretamente nas redes sociais (WhatsApp, Facebook, Instagram, Twitter) com uma mensagem pre-formatada e atraente.

### Implementacao

#### 1.1 Adicionar Botao de Compartilhamento na Lista de Vouchers

**Arquivo**: `src/pages/AdminSettings.tsx`

Adicionar um novo botao "Compartilhar" ao lado dos botoes de editar e excluir em cada card de voucher (linhas 762-775).

```text
Estrutura atual:
[Badge Status] [Editar] [Excluir]

Nova estrutura:
[Badge Status] [Compartilhar] [Editar] [Excluir]
```

#### 1.2 Criar Funcoes de Compartilhamento

Adicionar funcoes para gerar links de compartilhamento com mensagens formatadas:

```typescript
const generateVoucherShareText = (voucher: Voucher) => {
  const discount = voucher.discount_type === 'percent'
    ? `${voucher.discount_value}% de desconto`
    : `R$ ${(voucher.discount_value / 100).toFixed(2).replace('.', ',')} de desconto`;
  
  const expiry = voucher.valid_until 
    ? `\nValido ate: ${format(new Date(voucher.valid_until), "dd/MM/yyyy", { locale: ptBR })}` 
    : '';
  
  return `🎵 CUPOM DE DESCONTO 🎵\n\n` +
    `Use o codigo: *${voucher.code}*\n` +
    `Desconto: ${discount}\n` +
    `${expiry}\n\n` +
    `🎶 Crie sua musica personalizada em:\n` +
    `https://criandomusicas.com.br/planos`;
};

const shareVoucherWhatsApp = (voucher: Voucher) => {
  const text = generateVoucherShareText(voucher);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

const shareVoucherFacebook = (voucher: Voucher) => {
  const url = `https://criandomusicas.com.br/planos?voucher=${voucher.code}`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
};

const shareVoucherTwitter = (voucher: Voucher) => {
  const text = `🎵 Use o cupom ${voucher.code} e ganhe desconto na sua musica personalizada! 🎶`;
  const url = `https://criandomusicas.com.br/planos`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
};

const copyVoucherLink = async (voucher: Voucher) => {
  const text = generateVoucherShareText(voucher);
  await navigator.clipboard.writeText(text);
  toast({ title: 'Cupom copiado!', description: 'Cole nas suas redes sociais.' });
};
```

#### 1.3 UI do Botao de Compartilhamento

Adicionar um `DropdownMenu` com as opcoes de compartilhamento:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <Share2 className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => shareVoucherWhatsApp(voucher)}>
      <WhatsAppIcon /> WhatsApp
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => shareVoucherFacebook(voucher)}>
      <Facebook /> Facebook
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => shareVoucherTwitter(voucher)}>
      <Twitter /> Twitter/X
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => copyVoucherLink(voucher)}>
      <Copy /> Copiar Texto
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Parte 2: Transferencia de Creditos entre Usuarios

### Objetivo
Permitir que usuarios transfiram creditos disponiveis para amigos atraves de email ou codigo.

### Arquitetura

```text
                 Usuario A                    Sistema                    Usuario B
                     |                           |                           |
                     |  Solicita transferencia   |                           |
                     |  (email + qtd creditos)   |                           |
                     |-------------------------->|                           |
                     |                           |  Valida creditos          |
                     |                           |  Cria registro pendente   |
                     |                           |  Envia notificacao        |
                     |                           |-------------------------->|
                     |                           |                           |
                     |                           |  Usuario B aceita         |
                     |                           |<--------------------------|
                     |                           |                           |
                     |                           |  Transfere creditos       |
                     |  Notifica sucesso         |  Atualiza saldos          |
                     |<--------------------------|-------------------------->|
```

### 2.1 Criar Tabela de Transferencias

**Migracao SQL**:

```sql
-- Tabela para rastrear transferencias de creditos
CREATE TABLE public.credit_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_email TEXT NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
  credit_type TEXT NOT NULL DEFAULT 'vocal', -- 'vocal' ou 'instrumental'
  source_credit_id UUID NOT NULL REFERENCES public.user_credits(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  transfer_code TEXT UNIQUE NOT NULL,
  message TEXT, -- Mensagem opcional do remetente
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- RLS Policies
ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver transferencias que enviaram
CREATE POLICY "Users can view their sent transfers"
  ON public.credit_transfers FOR SELECT
  USING (auth.uid() = from_user_id);

-- Usuarios podem ver transferencias destinadas a eles
CREATE POLICY "Users can view transfers to their email"
  ON public.credit_transfers FOR SELECT
  USING (
    to_user_id = auth.uid() OR
    to_user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Usuarios podem criar transferencias de seus proprios creditos
CREATE POLICY "Users can create transfers"
  ON public.credit_transfers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Usuarios podem atualizar transferencias destinadas a eles (aceitar/rejeitar)
CREATE POLICY "Users can update transfers to them"
  ON public.credit_transfers FOR UPDATE
  USING (
    to_user_id = auth.uid() OR
    to_user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

### 2.2 Criar Edge Function para Transferencia

**Arquivo**: `supabase/functions/transfer-credits/index.ts`

```typescript
// Funcionalidades:
// 1. Validar creditos disponiveis do remetente
// 2. Criar registro de transferencia com codigo unico
// 3. Reservar creditos (decrementar do remetente temporariamente)
// 4. Enviar notificacao por email ao destinatario
```

### 2.3 Criar Edge Function para Aceitar Transferencia

**Arquivo**: `supabase/functions/accept-credit-transfer/index.ts`

```typescript
// Funcionalidades:
// 1. Validar codigo de transferencia
// 2. Verificar se nao expirou
// 3. Criar novo registro de creditos para o destinatario
// 4. Marcar transferencia como aceita
// 5. Notificar remetente
```

### 2.4 Interface do Usuario - Componente de Transferencia

**Arquivo**: `src/components/CreditTransfer.tsx`

Criar componente com duas abas:

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Enviar Creditos</TabsTrigger>
    <TabsTrigger>Transferencias Recebidas</TabsTrigger>
  </TabsList>
  
  <TabsContent value="send">
    {/* Formulario para enviar creditos */}
    <Input placeholder="Email do amigo" />
    <Select placeholder="Tipo de credito" />
    <Input type="number" placeholder="Quantidade" />
    <Textarea placeholder="Mensagem (opcional)" />
    <Button>Enviar Creditos</Button>
  </TabsContent>
  
  <TabsContent value="received">
    {/* Lista de transferencias pendentes */}
    {pendingTransfers.map(transfer => (
      <Card>
        <p>{transfer.from_user_email} te enviou {transfer.credits_amount} creditos</p>
        <Button onClick={() => acceptTransfer(transfer.id)}>Aceitar</Button>
        <Button variant="outline" onClick={() => rejectTransfer(transfer.id)}>Recusar</Button>
      </Card>
    ))}
  </TabsContent>
</Tabs>
```

### 2.5 Integrar na Pagina de Perfil

**Arquivo**: `src/pages/Profile.tsx`

Adicionar nova aba "Compartilhar" ou integrar ao componente `CreditsManagement`:

```tsx
<TabsList>
  <TabsTrigger value="profile">Perfil</TabsTrigger>
  <TabsTrigger value="credits">Creditos</TabsTrigger>
  <TabsTrigger value="transfer">Compartilhar</TabsTrigger> {/* NOVO */}
</TabsList>
```

### 2.6 Notificacoes

Enviar emails usando Resend (ja configurado) para:
- Destinatario: "Voce recebeu X creditos de [Nome]!"
- Remetente: "Sua transferencia foi aceita/recusada"

---

## Arquivos a Modificar/Criar

### Modificacoes:
1. `src/pages/AdminSettings.tsx` - Adicionar compartilhamento de vouchers
2. `src/components/CreditsManagement.tsx` - Adicionar botao para transferir
3. `src/pages/Profile.tsx` - Adicionar aba de transferencias

### Novos Arquivos:
1. `src/components/CreditTransfer.tsx` - Componente de transferencia
2. `src/components/VoucherShareMenu.tsx` - Menu de compartilhamento de vouchers
3. `supabase/functions/transfer-credits/index.ts` - Edge function para iniciar transferencia
4. `supabase/functions/accept-credit-transfer/index.ts` - Edge function para aceitar
5. Migracao SQL para tabela `credit_transfers`

---

## Secao Tecnica

### Dependencias Utilizadas
- `lucide-react`: Icones (Share2, Copy, Gift, Send)
- `sonner`/`use-toast`: Notificacoes
- `@radix-ui/react-dropdown-menu`: Menu de compartilhamento
- `supabase`: Operacoes de banco de dados

### Fluxo de Seguranca para Transferencias

1. **Validacao de Propriedade**: Verificar se o usuario possui os creditos que deseja transferir
2. **Limite de Transferencia**: Nao permitir transferir mais creditos do que possui
3. **Expiracao**: Transferencias pendentes expiram apos 7 dias
4. **Codigo Unico**: Cada transferencia tem um codigo unico para identificacao
5. **RLS Policies**: Garantir que usuarios so vejam suas proprias transferencias

### Consideracoes de UX

1. **Compartilhamento de Vouchers (Admin)**:
   - Botao discreto mas acessivel
   - Mensagens pre-formatadas e atraentes
   - Suporte a todas as principais redes sociais

2. **Transferencia de Creditos (Usuario)**:
   - Interface simples e intuitiva
   - Confirmacao antes de enviar
   - Feedback claro sobre status da transferencia
   - Badge de notificacao para transferencias pendentes


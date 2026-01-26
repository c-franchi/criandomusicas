
# Plano Completo: Correções de Bugs + Novos Recursos + Reestruturação Homepage

## Visão Geral

Este plano aborda 4 correções de bugs, implementação de 2 novos recursos, e uma reestruturação completa da homepage com novos planos para criadores de conteúdo.

---

## PARTE 1: Correções de Bugs

### Bug 1: Transferência de Créditos por Código/Link Compartilhável

**Problema**: Atualmente só é possível transferir créditos via email. Usuário solicita opção de compartilhar via código/link.

**Solução**:

**Arquivo**: `src/components/CreditTransfer.tsx`

Adicionar uma nova aba "Resgatar Código" e funcionalidade de compartilhar link:

1. Ao criar uma transferência, gerar link compartilhável
2. O destinatário pode inserir o código manualmente ou clicar no link
3. Adicionar botões de compartilhamento (WhatsApp, copiar link)

```text
Nova estrutura de abas:
[Enviar] [Recebidas] [Resgatar Código]

Na aba "Enviar":
- Adicionar opção "Gerar Código para Compartilhar" que cria transferência sem email específico
- Mostrar link/código gerado com botões de compartilhamento

Na aba "Resgatar Código":
- Input para código de transferência
- Botão "Resgatar Créditos"
```

**Arquivo**: `supabase/functions/transfer-credits/index.ts`

- Modificar para aceitar transferências sem `toEmail` (apenas código)
- O `to_user_id` será preenchido quando alguém resgatar

**Arquivo**: `supabase/functions/accept-credit-transfer/index.ts`

- Adicionar método de aceitar por `transfer_code` diretamente

---

### Bug 2: Sessão PIX Clicável (Não Apenas o Botão)

**Problema**: Na página de checkout, ao mostrar a opção de enviar comprovante PIX, apenas o botão é clicável. O usuário quer que toda a área seja clicável.

**Solução**:

**Arquivo**: `src/pages/Checkout.tsx` (linhas ~1078-1140)

Transformar o card de upload em área clicável completa:

```tsx
// Antes (apenas botão clicável)
<Card className="mt-4 p-4 ...">
  <input ref={receiptInputRef} type="file" className="hidden" />
  <Button onClick={() => receiptInputRef.current?.click()}>
    Selecionar Comprovante
  </Button>
  <Button onClick={confirmWithReceipt} disabled={!receiptFile}>
    Confirmar Pagamento
  </Button>
</Card>

// Depois (área toda clicável para selecionar, botão separado para confirmar)
<Card 
  className="mt-4 p-4 cursor-pointer hover:border-primary/50 transition-all ..."
  onClick={() => !receiptFile && receiptInputRef.current?.click()}
>
  <input ref={receiptInputRef} type="file" className="hidden" />
  {/* Área de drop/preview */}
  <div className="text-center">
    {receiptPreview ? <img ... /> : <Upload icon />}
    <p>Clique ou arraste para adicionar comprovante</p>
  </div>
  {/* Botão confirmar fora da área de click do card */}
  <Button 
    onClick={(e) => { e.stopPropagation(); confirmWithReceipt(); }}
    disabled={!receiptFile}
  >
    Confirmar Pagamento
  </Button>
</Card>
```

---

### Bug 3: Título da Música Sendo Substituído pelo Prompt

**Problema**: Quando o usuário define um título para a música, ele está sendo sobrescrito pelo sistema.

**Análise**: O código em `generate-lyrics/index.ts` já tem lógica para respeitar `songName` quando `autoGenerateName = false`. Porém, o título pode estar sendo sobrescrito em dois lugares:

1. **`generate-lyrics`**: A função `extractTitleAndBody` pode estar extraindo título da letra gerada
2. **`generate-style-prompt`**: Pode estar salvando título incorreto

**Solução**:

**Arquivo**: `supabase/functions/generate-lyrics/index.ts` (linhas ~88-129)

A função `extractTitleAndBody` já tem lógica correta, mas precisa garantir que o título do usuário seja passado corretamente:

```typescript
// Melhorar a função extractTitleAndBody
function extractTitleAndBody(raw: string, providedTitle?: string): { title: string; body: string } {
  // Se título foi fornecido pelo usuário, usar EXATAMENTE ele
  if (providedTitle && providedTitle.trim()) {
    // Remover QUALQUER título gerado pela IA do corpo da letra
    let bodyLines = raw.split(/\r?\n/).filter(l => l.trim());
    
    // Remove primeira linha se não for uma tag estrutural [Intro], [Verse], etc.
    if (bodyLines.length > 0) {
      const firstLine = bodyLines[0].trim();
      if (!firstLine.startsWith('[') && firstLine.length < 100) {
        bodyLines = bodyLines.slice(1);
      }
    }
    
    return { title: providedTitle.trim(), body: bodyLines.join('\n').trim() };
  }
  // ... resto da lógica para auto-geração
}
```

**Arquivo**: `supabase/functions/generate-style-prompt/index.ts`

Verificar que o `songTitle` passado do frontend está sendo respeitado:

```typescript
// Garantir que o título do usuário tem prioridade
if (songTitle && songTitle.trim()) {
  updateData.song_title = songTitle.trim();
  console.log("Using USER-PROVIDED song_title:", songTitle);
} else if (isInstrumental && generatedInstrumentalTitle) {
  updateData.song_title = generatedInstrumentalTitle;
}
```

**Arquivo**: `src/pages/CreateSong.tsx`

Garantir que `editedTitle` é preservado do `briefingData.songName`:

```typescript
// Na função loadExistingOrder e ao carregar briefing
setEditedTitle(orderData.song_title || briefingData.songName || '');
```

---

### Bug 4: Pedidos Duplicados no Dashboard

**Problema**: A imagem mostra dois cards para o mesmo pedido "Feliz Aniversário Maurício".

**Análise**: O realtime subscription pode estar adicionando duplicatas quando:
1. Um INSERT é detectado para um pedido que já existe na lista
2. Race condition entre fetch inicial e subscription

**Solução**:

**Arquivo**: `src/pages/Dashboard.tsx` (linhas ~140-160)

Adicionar verificação de duplicatas no handler de INSERT:

```typescript
if (payload.eventType === 'INSERT') {
  const newOrder = payload.new as Order;
  
  // CORREÇÃO: Verificar se o pedido já existe antes de adicionar
  setOrders(prev => {
    const exists = prev.some(o => o.id === newOrder.id);
    if (exists) {
      console.log('Order already exists, skipping INSERT:', newOrder.id);
      return prev;
    }
    // Fetch lyric title and add
    return [{ ...newOrder, lyric_title: null }, ...prev];
  });
}
```

**Arquivo**: `src/pages/AdminDashboard.tsx`

Aplicar mesma correção na subscription do admin.

---

## PARTE 2: Novos Recursos

### Recurso 1: Compartilhamento de Créditos via Código/Link

Já coberto no Bug 1, mas detalhando o fluxo completo:

```text
FLUXO DE COMPARTILHAMENTO POR CÓDIGO:

1. Usuário A clica "Gerar Código" em CreditTransfer
2. Sistema cria registro em credit_transfers com:
   - transfer_code: gerado automaticamente
   - to_user_email: null (para código compartilhável)
   - status: 'pending'
3. Usuário A recebe código (ex: "CRED-ABC123") e link
4. Usuário A compartilha via WhatsApp, copy, etc.
5. Usuário B acessa /resgatar?code=CRED-ABC123 ou insere código manualmente
6. Sistema valida código e associa to_user_id ao Usuário B
7. Usuário B aceita e recebe os créditos
```

**Novos componentes/arquivos**:
- Modificar `src/components/CreditTransfer.tsx` - adicionar aba "Resgatar Código"
- Modificar `supabase/functions/transfer-credits/index.ts` - aceitar modo "código"
- Modificar `supabase/functions/accept-credit-transfer/index.ts` - aceitar por código direto

---

### Recurso 2: Compartilhamento de Vouchers nas Redes Sociais (Admin)

Já implementado no arquivo `src/components/VoucherShareMenu.tsx`, mas precisamos garantir que está integrado corretamente no AdminSettings.

**Verificar**: `src/pages/AdminSettings.tsx` deve ter o componente `VoucherShareMenu` renderizado nos cards de vouchers.

---

## PARTE 3: Reestruturação da Homepage - Planos para Criadores

### 3.1 Nova Seção: "Para Criadores de Conteúdo"

**Novo arquivo**: `src/components/CreatorSection.tsx`

Criar seção destacada abaixo dos planos atuais:

```tsx
const CreatorSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Badge */}
        <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          🎬 Para Criadores de Conteúdo
        </Badge>
        
        {/* Headline */}
        <h2 className="text-4xl font-bold mb-6">
          Músicas Originais para Seu Conteúdo
        </h2>
        
        {/* Subheadline + Comparação sutil com Suno */}
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl">
          Esqueça prompts complexos e edição manual. Você descreve, nós criamos. 
          Músicas prontas para YouTube, TikTok, Reels e podcasts.
        </p>
        
        {/* Diferenciais Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader>
              <FileText className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Letras Curadas</CardTitle>
            </CardHeader>
            <CardContent>
              Identidade musical consistente para seu canal
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <ImageIcon className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Capas Prontas</CardTitle>
            </CardHeader>
            <CardContent>
              Thumbnails profissionais para seus vídeos
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Formatos Curtos</CardTitle>
            </CardHeader>
            <CardContent>
              Otimizado para 30s, 60s e formatos de Reels
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Suporte Humano</CardTitle>
            </CardHeader>
            <CardContent>
              Aprovação de letra e ajustes com nossa equipe
            </CardContent>
          </Card>
        </div>
        
        {/* CTA */}
        <Button size="lg" variant="hero" asChild>
          <Link to="/planos#creator">
            Conhecer Planos de Criador
            <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  );
};
```

---

### 3.2 Novos Planos de Assinatura para Criadores

**Banco de dados**: Adicionar novos registros na tabela `pricing_config`:

```sql
INSERT INTO pricing_config (id, name, price_cents, price_promo_cents, features, is_popular, is_active, sort_order) VALUES
('creator_start', 'Creator Start', 4990, NULL, 
 '["3 músicas/mês", "Capas inclusas", "Formatos curtos (30s, 60s)", "Entrega em 48h", "Suporte por email"]'::jsonb, 
 false, true, 10),
 
('creator_pro', 'Creator Pro', 9990, NULL,
 '["8 músicas/mês", "Capas inclusas", "Formatos curtos", "Entrega prioritária 24h", "Suporte VIP WhatsApp", "Revisões ilimitadas de letra"]'::jsonb,
 true, true, 11),
 
('creator_studio', 'Creator Studio', 19990, NULL,
 '["20 músicas/mês", "Capas + Vídeos básicos", "Todos os formatos", "Entrega express 12h", "Suporte dedicado", "Diretor de conta"]'::jsonb,
 false, true, 12);
```

---

### 3.3 Atualizar Componente PricingPlans

**Arquivo**: `src/components/PricingPlans.tsx`

Modificar para mostrar dois blocos:

```text
ESTRUTURA PROPOSTA:

1. [Toggle Vocal/Instrumental - existente]

2. BLOCO 1: "Para Presentes e Homenagens" (planos avulsos existentes)
   - Single, Package 3, Package 5
   - Destaque: uso único, sem prazo, presente perfeito

3. SEPARADOR VISUAL

4. BLOCO 2: "Para Criadores de Conteúdo" (novas assinaturas)
   - Creator Start, Creator Pro, Creator Studio
   - Destaque: créditos mensais, renovação automática
   
5. TABELA COMPARATIVA (opcional): Avulso vs Assinatura
```

---

### 3.4 Seção Explicativa: Avulso vs Assinatura

**Novo arquivo ou adicionar em PricingPlans**:

```tsx
const PlanComparisonSection = () => (
  <Card className="my-12 p-8 border-primary/20">
    <h3 className="text-2xl font-bold mb-6 text-center">
      Qual opção é ideal para você?
    </h3>
    
    <div className="grid md:grid-cols-2 gap-8">
      {/* Avulso */}
      <div className="space-y-4">
        <Badge variant="outline">Pacotes Avulsos</Badge>
        <h4 className="text-xl font-semibold">Presente Único e Especial</h4>
        <ul className="space-y-2 text-muted-foreground">
          <li>✓ Ideal para aniversários, casamentos, homenagens</li>
          <li>✓ Créditos nunca expiram</li>
          <li>✓ 2 opções de letra para escolher</li>
          <li>✓ Entrega em até 48h</li>
        </ul>
        <Button variant="outline" asChild>
          <Link to="#planos">Ver Pacotes</Link>
        </Button>
      </div>
      
      {/* Assinatura */}
      <div className="space-y-4">
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
          Assinatura Creator
        </Badge>
        <h4 className="text-xl font-semibold">Conteúdo em Volume</h4>
        <ul className="space-y-2 text-muted-foreground">
          <li>✓ Músicas todo mês para YouTube, TikTok, Podcasts</li>
          <li>✓ Preço unitário até 60% menor</li>
          <li>✓ Formatos otimizados (30s, 60s)</li>
          <li>✓ Suporte prioritário</li>
          <li>⚠️ Créditos renovam mensalmente</li>
        </ul>
        <Button variant="hero" asChild>
          <Link to="/planos#creator">Assinar Agora</Link>
        </Button>
      </div>
    </div>
  </Card>
);
```

---

### 3.5 Atualizar FAQ

**Arquivo**: `src/components/FAQ.tsx`

Adicionar novas perguntas:

```typescript
const newFaqs = [
  // ... FAQs existentes ...
  {
    question: "Posso usar as músicas em vídeos monetizados?",
    answer: "Sim! As músicas criadas são 100% originais e você tem todos os direitos para uso comercial, incluindo monetização no YouTube, TikTok, Instagram e outras plataformas."
  },
  {
    question: "Como funciona a assinatura Creator?",
    answer: "Na assinatura, você recebe créditos todo mês para criar músicas. Os créditos são renovados automaticamente e você pode cancelar quando quiser. É ideal para quem produz conteúdo regularmente."
  },
  {
    question: "Os créditos da assinatura expiram?",
    answer: "Sim, os créditos da assinatura Creator renovam mensalmente. Créditos não utilizados não acumulam para o mês seguinte. Se você prefere créditos que nunca expiram, escolha os pacotes avulsos."
  },
  {
    question: "Posso cancelar minha assinatura?",
    answer: "Sim, você pode cancelar sua assinatura a qualquer momento. Você continua com acesso até o fim do período pago e seus créditos restantes podem ser usados até lá."
  }
];
```

---

### 3.6 Atualizar Index.tsx

**Arquivo**: `src/pages/Index.tsx`

Adicionar novas seções:

```tsx
import CreatorSection from "@/components/CreatorSection";
import PlanComparison from "@/components/PlanComparison";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEO ... />
      <Hero />
      <ProcessSteps />
      <AudioSamples />
      <InstrumentalShowcase />
      <WhyChooseUs />
      <PricingPlans />           {/* Planos avulsos existentes */}
      <CreatorSection />          {/* NOVA: Seção para criadores */}
      <PlanComparison />          {/* NOVA: Comparação Avulso vs Assinatura */}
      <CustomLyricHighlight />
      <VideoServiceSection />
      <Testimonials />
      <ReactionVideosShowcase />
      <FAQ />                     {/* Atualizado com novas perguntas */}
      <CTA />
      <Footer />
      <CookieConsent />
      <ScrollToTop />
    </main>
  );
};
```

---

## PARTE 4: Arquivos a Criar/Modificar

### Novos Arquivos:
1. `src/components/CreatorSection.tsx` - Seção destacada para criadores
2. `src/components/PlanComparison.tsx` - Comparação Avulso vs Assinatura
3. `src/components/CreatorPricingCards.tsx` - Cards dos planos de assinatura

### Arquivos a Modificar:
1. `src/components/CreditTransfer.tsx` - Adicionar código compartilhável
2. `src/pages/Checkout.tsx` - Área PIX toda clicável
3. `src/pages/Dashboard.tsx` - Corrigir duplicatas
4. `src/pages/AdminDashboard.tsx` - Corrigir duplicatas
5. `src/pages/Index.tsx` - Adicionar novas seções
6. `src/components/FAQ.tsx` - Novas perguntas
7. `src/components/PricingPlans.tsx` - Reestruturar com blocos
8. `src/pages/Planos.tsx` - Adicionar planos Creator
9. `supabase/functions/generate-lyrics/index.ts` - Preservar título do usuário
10. `supabase/functions/generate-style-prompt/index.ts` - Preservar título
11. `supabase/functions/transfer-credits/index.ts` - Modo código
12. `supabase/functions/accept-credit-transfer/index.ts` - Aceitar por código

### Migração SQL:
- Adicionar planos `creator_start`, `creator_pro`, `creator_studio` na `pricing_config`

---

## Ordem de Implementação Sugerida

1. **Fase 1 - Correções de Bugs** (Prioridade Alta)
   - Bug 4: Pedidos duplicados (rápido, crítico)
   - Bug 3: Título da música (impacta UX)
   - Bug 2: Área PIX clicável (UX)
   - Bug 1: Código compartilhável (parcialmente novo recurso)

2. **Fase 2 - Estrutura para Criadores**
   - Migração SQL dos novos planos
   - Componente CreatorSection
   - Componente PlanComparison
   - Atualização PricingPlans.tsx
   - Atualização Planos.tsx

3. **Fase 3 - Finalizações**
   - Atualizar FAQ
   - Atualizar Index.tsx
   - Testes de integração
   - Deploy das edge functions


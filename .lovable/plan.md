

# Plano: Sistema de Analytics de Compartilhamento de Links

## Objetivo

Implementar um sistema completo de rastreamento para entender:
- **Quantos usuários compartilham** suas músicas
- **Quantos cliques** os links compartilhados recebem
- **Quantos visitantes** clicam para visitar o site principal

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE TRACKING                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. SHARE (Compartilhamento)                                       │
│     OrderDetails.tsx → trackShareEvent() → share_analytics         │
│     Eventos: whatsapp, facebook, instagram, native, copy           │
│                                                                     │
│  2. VIEW (Visualização do link)                                    │
│     MusicShare.tsx → trackViewEvent() → get-public-track           │
│     Registra: orderId, referrer, userAgent                         │
│                                                                     │
│  3. CLICK CTA (Clique para criar música)                           │
│     MusicShare.tsx → trackCtaClick() → share_analytics             │
│     Registra: orderId + action: 'cta_click'                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Criar Tabela de Analytics

**Migração SQL para criar tabela `share_analytics`:**

```sql
-- Tabela para rastrear eventos de compartilhamento
CREATE TABLE public.share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID, -- Pode ser NULL para visitantes anônimos
  event_type TEXT NOT NULL, -- 'share', 'view', 'play', 'cta_click'
  platform TEXT, -- 'whatsapp', 'facebook', 'instagram', 'native', 'copy', 'direct'
  referrer TEXT, -- URL de origem (para saber de onde veio)
  user_agent TEXT, -- Browser/device info
  ip_hash TEXT, -- Hash do IP para contar únicos sem armazenar IP
  metadata JSONB DEFAULT '{}', -- Dados extras
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_share_analytics_order_id ON public.share_analytics(order_id);
CREATE INDEX idx_share_analytics_event_type ON public.share_analytics(event_type);
CREATE INDEX idx_share_analytics_created_at ON public.share_analytics(created_at);

-- RLS: Permitir INSERT anônimo (para tracking público), SELECT apenas admin
ALTER TABLE public.share_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
  ON public.share_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all analytics"
  ON public.share_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

---

## 2. Modificar Edge Function `get-public-track`

**Arquivo:** `supabase/functions/get-public-track/index.ts`

**Mudanças:**
- Adicionar registro de evento `view` quando alguém acessa a página de música
- Capturar `referrer` e `user_agent` do request
- Gerar hash do IP para contar visitantes únicos

```typescript
// Adicionar após buscar os dados da track:
// Registrar visualização (async, não bloqueia resposta)
const headers = Object.fromEntries(req.headers.entries());
supabase.from('share_analytics').insert({
  order_id: orderId,
  event_type: 'view',
  referrer: headers['referer'] || null,
  user_agent: headers['user-agent'] || null,
  ip_hash: await hashIP(req.headers.get('x-forwarded-for') || ''),
}).then(() => {}).catch(console.error);
```

---

## 3. Modificar Página MusicShare

**Arquivo:** `src/pages/MusicShare.tsx`

**Mudanças:**
- Registrar evento `play` quando usuário clica em "Ouvir Música"
- Registrar evento `cta_click` quando clica em "Criar minha música"

```typescript
// Nova função para tracking
const trackEvent = async (eventType: 'play' | 'cta_click') => {
  try {
    await supabase.from('share_analytics').insert({
      order_id: orderId,
      event_type: eventType,
      platform: 'web',
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.error('Track error:', e);
  }
};

// No botão Ouvir:
<Button onClick={() => { trackEvent('play'); togglePlay(); }}>

// No botão CTA:
<Link to="/" onClick={() => trackEvent('cta_click')}>
```

---

## 4. Modificar Página OrderDetails

**Arquivo:** `src/pages/OrderDetails.tsx`

**Mudanças:**
- Adicionar tracking em todos os botões de compartilhamento
- Registrar plataforma usada (whatsapp, facebook, instagram, native, copy)

```typescript
// Nova função para tracking de share
const trackShare = async (platform: string) => {
  try {
    await supabase.from('share_analytics').insert({
      order_id: orderId,
      user_id: user?.id,
      event_type: 'share',
      platform,
    });
  } catch (e) {
    console.error('Track share error:', e);
  }
};

// Modificar funções existentes:
const shareOnWhatsApp = () => {
  trackShare('whatsapp');
  // ... código existente
};

const shareOnFacebook = () => {
  trackShare('facebook');
  // ... código existente
};

// etc para cada plataforma
```

---

## 5. Criar Componente de Analytics para Admin

**Novo arquivo:** `src/components/admin/ShareAnalytics.tsx`

**Funcionalidades:**
- Cards com totais (Compartilhamentos, Visualizações, Plays, Conversões)
- Gráfico de linha mostrando tendência nos últimos 30 dias
- Tabela das músicas mais compartilhadas
- Breakdown por plataforma (WhatsApp, Facebook, etc.)

```typescript
// Estrutura do componente
const ShareAnalytics = () => {
  const [stats, setStats] = useState({
    totalShares: 0,
    totalViews: 0,
    totalPlays: 0,
    totalCtaClicks: 0,
    conversionRate: 0, // (cta_clicks / views) * 100
  });
  
  const [topSongs, setTopSongs] = useState([]);
  const [platformBreakdown, setPlatformBreakdown] = useState({});
  const [dailyStats, setDailyStats] = useState([]);
  
  // Fetch data on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>🔗 {stats.totalShares} Compartilhamentos</Card>
        <Card>👁 {stats.totalViews} Visualizações</Card>
        <Card>▶️ {stats.totalPlays} Reproduções</Card>
        <Card>🎯 {stats.conversionRate}% Conversão</Card>
      </div>
      
      {/* Chart */}
      <Card>
        <LineChart data={dailyStats} />
      </Card>
      
      {/* Top Songs & Platform Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>{/* Top 10 músicas mais visualizadas */}</Card>
        <Card>{/* Breakdown por plataforma */}</Card>
      </div>
    </div>
  );
};
```

---

## 6. Adicionar Tab de Analytics no AdminSettings

**Arquivo:** `src/pages/AdminSettings.tsx`

**Mudanças:**
- Adicionar nova opção no `configTab`: `'analytics'`
- Importar e renderizar `ShareAnalytics` quando selecionado

```typescript
// No estado
const [configTab, setConfigTab] = useState<'pricing' | 'vouchers' | 'audio' | 'pix' | 'videos' | 'reactions' | 'reviews' | 'analytics'>('pricing');

// Na TabsList
<TabsTrigger value="analytics">
  <BarChart3 className="w-4 h-4 mr-2" />
  Analytics
</TabsTrigger>

// No TabsContent
<TabsContent value="analytics">
  <ShareAnalytics />
</TabsContent>
```

---

## Resumo de Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Nova Migração SQL** | Criar | Tabela `share_analytics` com RLS |
| `supabase/functions/get-public-track/index.ts` | Modificar | Registrar evento `view` |
| `src/pages/MusicShare.tsx` | Modificar | Registrar `play` e `cta_click` |
| `src/pages/OrderDetails.tsx` | Modificar | Registrar `share` por plataforma |
| `src/components/admin/ShareAnalytics.tsx` | **Criar** | Dashboard de analytics |
| `src/components/admin/index.ts` | Modificar | Exportar ShareAnalytics |
| `src/pages/AdminSettings.tsx` | Modificar | Adicionar tab Analytics |

---

## Métricas Disponíveis Após Implementação

| Métrica | Descrição |
|---------|-----------|
| **Total de Compartilhamentos** | Quantas vezes usuários clicaram em "Compartilhar" |
| **Por Plataforma** | WhatsApp vs Facebook vs Instagram vs Copiar Link |
| **Visualizações** | Quantas pessoas abriram o link compartilhado |
| **Reproduções** | Quantas pessoas clicaram em "Ouvir Música" |
| **Cliques CTA** | Quantas pessoas clicaram em "Criar minha música" |
| **Taxa de Conversão** | (CTA Clicks / Views) × 100 |
| **Top Músicas** | Ranking das mais compartilhadas/visualizadas |
| **Visitantes Únicos** | Baseado em hash de IP |

---

## Visualização do Dashboard Admin

```text
┌─────────────────────────────────────────────────────────────────┐
│                    📊 Analytics de Compartilhamento             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ 🔗 245    │  │ 👁 1.2K   │  │ ▶️ 890    │  │ 🎯 12.3%  │    │
│  │ Shares    │  │ Views     │  │ Plays     │  │ Conversão │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📈 Últimos 30 dias                                      │   │
│  │    Views ─── Plays ─── CTA Clicks                       │   │
│  │   ▲                                                     │   │
│  │   │     ╱╲    ╱╲                                        │   │
│  │   │   ╱    ╲╱    ╲                                      │   │
│  │   │ ╱              ╲                                    │   │
│  │   └──────────────────────────────────────────▶          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 🏆 Top Músicas      │  │ 📱 Plataformas      │              │
│  │ 1. Amor Eterno 245  │  │ WhatsApp    68%     │              │
│  │ 2. Mãe Querida 189  │  │ Facebook    15%     │              │
│  │ 3. Feliz Aniver 156 │  │ Copiar Link 12%     │              │
│  │ 4. Nossa História 98│  │ Instagram    5%     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```


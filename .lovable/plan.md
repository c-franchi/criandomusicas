

# Simplificação do Fluxo de Criação com Abas

## Problema Atual

O fluxo atual obriga o usuário a escolher o tipo de música/plano TODA VEZ que vai criar, mesmo quando já tem créditos específicos:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUXO ATUAL (CONFUSO)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dashboard → Clicar "Criar Música"                                  │
│                          ↓                                          │
│  Briefing → Tela de Seleção com 8+ opções misturadas:               │
│     • Música Vocal        • Trilha Instrumental                     │
│     • Já tenho a letra    • Pacote 3x Vocal                         │
│     • Pacote 3x Instrum.  • Pacote 5x Vocal                         │
│     • Pacote 5x Instrum.  • etc...                                  │
│                          ↓                                          │
│  Usuário seleciona → Pergunta "Cantada ou Instrumental?"            │
│  (redundante se já escolheu!)                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Solução: Abas no Dashboard + Navegação Direta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     NOVO FLUXO (SIMPLIFICADO)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dashboard com 3 Abas:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🎤 Vocais (12) │ 🎹 Instrumentais (5) │ 📝 Letra Própria (2)│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Cada aba mostra:                                                   │
│  • Lista de pedidos daquele tipo                                    │
│  • CTA específico: "Criar Vocal", "Criar Instrumental", etc.        │
│  • Badge de créditos disponíveis daquele tipo                       │
│                          ↓                                          │
│  Clicar em "Criar Vocal" → /briefing?type=vocal                     │
│  → PULA seleção de plano                                            │
│  → PULA pergunta "cantada/instrumental" (já sabe que é vocal)       │
│  → Vai DIRETO para pergunta de tipo de música                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### 1. Dashboard com Abas (src/pages/Dashboard.tsx)

Adicionar componente de Tabs que filtra os pedidos por tipo:

```typescript
// Filtros de pedidos
const vocalOrders = orders.filter(o => !o.is_instrumental && !o.has_custom_lyric);
const instrumentalOrders = orders.filter(o => o.is_instrumental);
const customLyricOrders = orders.filter(o => o.has_custom_lyric);
```

Layout das abas:
- Aba 1: "Vocais" - ícone Mic, contador, CTA "Criar Vocal"
- Aba 2: "Instrumentais" - ícone Piano, contador, CTA "Criar Instrumental"  
- Aba 3: "Letra Própria" - ícone Edit, contador, CTA "Já Tenho a Letra"

### 2. Novos Parâmetros de URL no Briefing

O Briefing aceitará um novo parâmetro `type`:
- `/briefing?type=vocal` → Música cantada com IA gerando letra
- `/briefing?type=instrumental` → Trilha instrumental
- `/briefing?type=custom_lyric` → Usuário já tem a letra

Comportamento:
```typescript
// Em Briefing.tsx
const urlParams = new URLSearchParams(window.location.search);
const typeFromUrl = urlParams.get('type'); // vocal, instrumental, custom_lyric

// Se type vier na URL, PULAR seleção de planos
if (typeFromUrl === 'vocal') {
  setFormData(prev => ({ ...prev, isInstrumental: false, hasCustomLyric: false }));
  setShowPlanSelection(false);
  setCurrentStep(1); // Vai direto para musicType
  addBotMessage(chatFlow[1]);
}
```

### 3. Lógica de Navegação Simplificada

Quando vem da aba específica:
```text
type=vocal       → Pula step 0 (isInstrumental) → Vai para step 1 (musicType)
type=instrumental → Pula step 0 → Vai para step 2 (style instrumental)
type=custom_lyric → Pula step 0 → Vai para step 22 (customLyricText)
```

### 4. CreditsBanner Atualizado

Modificar para mostrar CTAs separados por tipo de crédito:
```typescript
// Se tem créditos vocais
<Button to="/briefing?type=vocal">Criar Vocal ({totalVocal})</Button>

// Se tem créditos instrumentais  
<Button to="/briefing?type=instrumental">Criar Instrumental ({totalInstrumental})</Button>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Adicionar Tabs com filtro de pedidos por tipo, CTAs específicos |
| `src/pages/Briefing.tsx` | Aceitar parâmetro `type` na URL, pular seleção de planos quando vier |
| `src/components/CreditsBanner.tsx` | CTAs separados por tipo de crédito |
| `public/locales/*/dashboard.json` | Traduções para as novas abas |

---

## Detalhamento do Dashboard

### Estrutura das Abas

```typescript
<Tabs defaultValue="vocal" className="w-full">
  <TabsList className="grid w-full grid-cols-3 mb-6">
    <TabsTrigger value="vocal" className="flex items-center gap-2">
      <Mic className="w-4 h-4" />
      {t('tabs.vocal')} ({vocalOrders.length})
    </TabsTrigger>
    <TabsTrigger value="instrumental" className="flex items-center gap-2">
      <Piano className="w-4 h-4" />
      {t('tabs.instrumental')} ({instrumentalOrders.length})
    </TabsTrigger>
    <TabsTrigger value="custom" className="flex items-center gap-2">
      <Edit className="w-4 h-4" />
      {t('tabs.customLyric')} ({customLyricOrders.length})
    </TabsTrigger>
  </TabsList>

  <TabsContent value="vocal">
    {/* CTA específico */}
    <Button asChild>
      <Link to="/briefing?type=vocal">
        <Mic className="w-4 h-4 mr-2" />
        {t('buttons.createVocal')}
        {totalVocal > 0 && <Badge>Usar Crédito</Badge>}
      </Link>
    </Button>
    
    {/* Lista de pedidos vocais */}
    {vocalOrders.map(order => <OrderCard key={order.id} order={order} />)}
  </TabsContent>

  <TabsContent value="instrumental">
    <Button asChild>
      <Link to="/briefing?type=instrumental">
        <Piano className="w-4 h-4 mr-2" />
        {t('buttons.createInstrumental')}
        {totalInstrumental > 0 && <Badge>Usar Crédito</Badge>}
      </Link>
    </Button>
    
    {instrumentalOrders.map(order => <OrderCard key={order.id} order={order} />)}
  </TabsContent>

  <TabsContent value="custom">
    <Button asChild>
      <Link to="/briefing?type=custom_lyric">
        <Edit className="w-4 h-4 mr-2" />
        {t('buttons.createCustomLyric')}
        {totalVocal > 0 && <Badge>Usar Crédito</Badge>}
      </Link>
    </Button>
    
    {customLyricOrders.map(order => <OrderCard key={order.id} order={order} />)}
  </TabsContent>
</Tabs>
```

---

## Traduções Necessárias

```json
{
  "tabs": {
    "vocal": "Músicas Vocais",
    "instrumental": "Instrumentais",
    "customLyric": "Letra Própria"
  },
  "buttons": {
    "createVocal": "Criar Música Vocal",
    "createInstrumental": "Criar Instrumental",
    "createCustomLyric": "Já Tenho a Letra"
  },
  "empty": {
    "vocalTitle": "Nenhuma música vocal",
    "vocalSubtitle": "Crie sua primeira música com letra!",
    "instrumentalTitle": "Nenhuma trilha instrumental",
    "instrumentalSubtitle": "Crie sua primeira trilha!",
    "customTitle": "Nenhuma música com letra própria",
    "customSubtitle": "Envie sua letra e transforme em música!"
  }
}
```

---

## Fluxo Visual

```text
┌────────────────── DASHBOARD ──────────────────┐
│                                                │
│  ┌──────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ 🎤 Vocais│ │🎹 Instrumentais│ │📝 Própria │  │
│  │   (12)   │ │     (5)       │ │    (2)    │  │
│  └──────────┘ └──────────────┘ └───────────┘  │
│       ↓              ↓               ↓        │
│  [Criar Vocal] [Criar Instrum.] [Enviar Letra]│
│       ↓              ↓               ↓        │
│  Lista pedidos  Lista pedidos   Lista pedidos │
│    vocais      instrumentais   letra própria  │
│                                                │
└────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────── BRIEFING ───────────────────────┐
│                                                 │
│  Se veio com ?type=vocal:                       │
│  → PULA seleção de plano                        │
│  → PULA "Cantada ou Instrumental?"              │
│  → Vai DIRETO para "Qual tipo de música?"       │
│                                                 │
│  Se veio com ?type=instrumental:                │
│  → PULA seleção de plano                        │
│  → PULA "Cantada ou Instrumental?"              │
│  → Vai DIRETO para "Qual estilo instrumental?"  │
│                                                 │
│  Se veio SEM parâmetro (link externo):          │
│  → Mostra tela de seleção normal                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Dashboard organizado por tipo em abas claras
2. CTAs específicos que levam direto ao fluxo correto
3. Sem necessidade de escolher plano quando já tem créditos
4. Sem pergunta redundante "Cantada ou Instrumental?"
5. Experiência muito mais rápida e intuitiva
6. Mantém compatibilidade com links externos (sem parâmetro mostra seleção)


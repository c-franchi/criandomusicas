
# Plano: Consumo Automático de Créditos + Fluxo Rápido Direto para Produção

## Problema Atual

1. **Modal de confirmação desnecessário**: Quando o usuário tem créditos, aparece modal perguntando se quer usar o crédito ou ir para checkout
2. **Modo rápido mostra letras**: No fluxo rápido, o usuário é redirecionado para `/criar-musica` onde precisa aprovar a letra manualmente

## Comportamento Desejado

1. **Com créditos**: Consumir automaticamente SEM modal, processar direto
2. **Sem créditos**: Mostrar modal informando que precisa adquirir um plano
3. **Modo rápido**: Gerar letra via IA e enviar direto para produção (sem aprovação manual)

---

## Fluxo Atualizado

```text
Usuário clica "Criar Música"
        │
        ▼
   Verifica créditos
        │
   ┌────┴────┐
   │         │
TEM          NÃO TEM
   │         │
   ▼         ▼
Consumir  Modal "Sem créditos"
autom.    → Ir para checkout
   │
   ▼
É modo rápido?
   │
┌──┴──┐
│     │
SIM   NÃO
│     │
▼     ▼
Gerar  Ir para
letra  /criar-musica
+ aprovar  (revisão)
autom.
│
▼
Dashboard
(produção)
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Lógica de consumo automático + identificar modo rápido |
| `src/components/briefing/QuickCreation.tsx` | Passar flag `isQuickMode` no submit |

---

## Detalhes Técnicos

### 1. Modificar `finishBriefing` (Briefing.tsx)

Alterar a lógica de verificação de créditos (linhas 2152-2164):

**Antes:**
```javascript
if (creditsData?.has_credits && creditsData?.total_available > 0) {
  // Mostrar modal de confirmação
  setPendingOrderId(orderData.id);
  setShowCreditModal(true);
  return;
}
```

**Depois:**
```javascript
if (creditsData?.has_credits && creditsData?.total_available > 0) {
  // Consumir crédito automaticamente SEM modal
  const result = await supabase.functions.invoke('use-credit', {
    body: { orderId: orderData.id }
  });
  
  if (result.error || !result.data?.success) {
    // Erro ao usar crédito, ir para checkout
    navigate(`/checkout/${orderData.id}?planId=${planId}`);
    return;
  }
  
  // Crédito consumido! Agora processar baseado no modo
  await processOrderAfterCredit(orderData.id, briefingData, isQuickMode);
  return;
}

// Sem créditos - mostrar modal para ir ao checkout
setPendingOrderId(orderData.id);
setShowNoCreditModal(true); // Novo modal
return;
```

### 2. Nova Função: `processOrderAfterCredit`

```javascript
const processOrderAfterCredit = async (
  orderId: string, 
  briefingData: any, 
  isQuickMode: boolean
) => {
  if (briefingData.isInstrumental) {
    // Instrumental: gerar style prompt e ir para dashboard
    await supabase.functions.invoke('generate-style-prompt', {...});
    toast.success('🎹 Música instrumental em produção!');
    clearSavedBriefing();
    navigate('/dashboard');
  } else if (isQuickMode) {
    // MODO RÁPIDO: gerar letra + aprovar automaticamente
    toast.info('✨ Gerando sua música...');
    
    // 1. Gerar letras
    const lyricsResult = await supabase.functions.invoke('generate-lyrics', {
      body: { orderId, story: briefingData.story, briefing: briefingData }
    });
    
    // 2. Pegar primeira letra gerada
    const { data: lyricsData } = await supabase
      .from('lyrics')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (lyricsData?.[0]) {
      // 3. Aprovar automaticamente
      await supabase.functions.invoke('generate-style-prompt', {
        body: {
          orderId,
          lyricId: lyricsData[0].id,
          approvedLyrics: lyricsData[0].text,
          songTitle: lyricsData[0].title,
          briefing: briefingData
        }
      });
    }
    
    toast.success('🎵 Música em produção!');
    clearSavedBriefing();
    navigate('/dashboard');
  } else {
    // Modo detalhado: ir para página de revisão de letras
    await supabase.functions.invoke('generate-lyrics', {...});
    clearSavedBriefing();
    navigate(`/criar-musica?orderId=${orderId}`);
  }
};
```

### 3. Novo Modal: "Sem Créditos Disponíveis"

Substituir o modal atual por um que apenas informa que o usuário precisa comprar:

```jsx
<Dialog open={showNoCreditModal} onOpenChange={setShowNoCreditModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-xl">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        Créditos insuficientes
      </DialogTitle>
      <DialogDescription className="pt-2">
        Você não possui créditos disponíveis para criar esta música.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Adquira um pacote ou assinatura para continuar criando músicas.
      </p>
      
      <Button onClick={handleGoToCheckout} className="w-full">
        <CreditCard className="w-5 h-5 mr-2" />
        Ver opções de compra
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### 4. Identificar Modo Rápido

Adicionar estado para rastrear se é modo rápido:

```javascript
// Estado
const [isQuickMode, setIsQuickMode] = useState(false);

// No handleQuickCreationSubmit:
const handleQuickCreationSubmit = (data: QuickCreationData) => {
  // ... converter dados ...
  setIsQuickMode(true); // Marcar como modo rápido
  showConfirmationScreen(newFormData);
};

// No handlePlanSelection (modo detalhado):
const handlePlanSelection = (planId: string) => {
  setIsQuickMode(false); // Modo detalhado
  // ...
};
```

---

## Estados a Adicionar/Modificar

| Estado | Antes | Depois |
|--------|-------|--------|
| `showCreditModal` | Modal de confirmação | Remover |
| `showNoCreditModal` | N/A | Modal "sem créditos" |
| `isQuickMode` | N/A | Boolean para identificar fluxo |

---

## Traduções Necessárias

```json
{
  "noCreditModal": {
    "title": "Créditos insuficientes",
    "description": "Você não possui créditos disponíveis para criar esta música.",
    "message": "Adquira um pacote ou assinatura para continuar criando músicas.",
    "buyButton": "Ver opções de compra"
  }
}
```

---

## Resultado Esperado

1. **Com créditos + modo rápido**: Clicar em "Criar" → Consumir crédito → Gerar letra automaticamente → Aprovar automaticamente → Dashboard (produção)

2. **Com créditos + modo detalhado**: Clicar em "Criar" → Consumir crédito → Ir para `/criar-musica` para revisar letras

3. **Sem créditos**: Clicar em "Criar" → Modal informando que precisa comprar → Ir para checkout

---

## Fluxo Simplificado do Modo Rápido

```text
Prompt: "Uma música romântica para minha esposa"
Gênero: Pop
Voz: Feminina
        │
        ▼
  [Criar Música]
        │
        ▼
Crédito consumido automaticamente
        │
        ▼
IA gera letra (aguarde ~5s)
        │
        ▼
Letra aprovada automaticamente
        │
        ▼
  → Dashboard
    (acompanhe produção)
```

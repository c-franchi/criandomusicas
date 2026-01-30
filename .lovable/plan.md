
# Refinamento do Fluxo de Data Comemorativa no Briefing

## Problema Identificado

Quando o usuário clica no banner de Carnaval (ou outra data comemorativa), o fluxo atual:

```text
┌────────────────────────────────────────────────────────────┐
│                    FLUXO ATUAL (PROBLEMA)                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuário vê banner: "🎭 Carnaval está chegando!"        │
│  2. Clica em "Criar música de Carnaval"                    │
│  3. Banner fecha + pré-preenche musicType/atmosphere       │
│  4. ❌ Usuário ainda precisa escolher um plano manualmente │
│  5. ❌ Chat começa do zero sem mencionar Carnaval          │
│  6. ❌ Não há indicador visual de que é música temática    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Solução Proposta

```text
┌────────────────────────────────────────────────────────────┐
│                    FLUXO REFINADO                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuário vê banner: "🎭 Carnaval está chegando!"        │
│  2. Clica em "Criar música de Carnaval"                    │
│  3. ✅ Abre mini-modal para escolher tipo de música:       │
│     - 🎤 Música Cantada de Carnaval                        │
│     - 🎹 Instrumental de Carnaval                          │
│     - 📝 Já tenho letra (para Carnaval)                    │
│  4. ✅ Seleciona plano automaticamente (single_*)          │
│  5. ✅ Pula pergunta de musicType (já definido)            │
│  6. ✅ Chat inicia com mensagem personalizada:             │
│     "🎭 Vamos criar sua música de Carnaval! ..."           │
│  7. ✅ Badge persistente no header: "🎭 Carnaval"          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Implementacao Tecnica

### 1. Novo Estado para Celebration Selecionada

Adicionar ao `BriefingFormData`:

```typescript
interface BriefingFormData {
  // ... campos existentes
  
  // Novo campo para rastrear a celebracao
  celebrationType?: string;        // Ex: "carnaval", "dia_das_maes"
  celebrationName?: string;        // Ex: "Carnaval", "Dia das Maes"
  celebrationEmoji?: string;       // Ex: "🎭", "👩‍👧‍👦"
}
```

### 2. Novo Estado para Modal de Tipo

```typescript
const [showCelebrationTypeModal, setShowCelebrationTypeModal] = useState(false);
const [selectedCelebration, setSelectedCelebration] = useState<UpcomingCelebration | null>(null);
```

### 3. Handler Atualizado

```typescript
const handleCelebrationAccept = () => {
  if (!closestDate) return;
  
  // Guardar celebracao selecionada
  setSelectedCelebration(closestDate);
  
  // Abrir modal para escolher tipo (cantada, instrumental, letra propria)
  setShowCelebrationTypeModal(true);
};

const handleCelebrationTypeSelect = (type: 'vocal' | 'instrumental' | 'custom_lyric') => {
  if (!selectedCelebration) return;
  
  setCelebrationDismissed(true);
  setShowCelebrationTypeModal(false);
  setShowPlanSelection(false);
  
  // Pre-preencher formData com sugestoes da celebracao
  const newFormData = {
    ...formData,
    musicType: selectedCelebration.suggested_music_type || 'parodia',
    atmosphere: selectedCelebration.suggested_atmosphere || 'festivo',
    emotion: selectedCelebration.suggested_emotion || 'alegria',
    celebrationType: selectedCelebration.id,
    celebrationName: selectedCelebration.localizedName,
    celebrationEmoji: selectedCelebration.emoji,
    isInstrumental: type === 'instrumental',
    hasCustomLyric: type === 'custom_lyric',
  };
  
  setFormData(newFormData);
  
  // Definir plano baseado no tipo
  const planId = type === 'instrumental' ? 'single_instrumental' 
               : type === 'custom_lyric' ? 'single_custom_lyric' 
               : 'single';
  setSelectedPlanId(planId);
  
  // Pular para o step correto (pulando musicType que ja foi definido)
  if (type === 'custom_lyric') {
    setCurrentStep(22);
    addBotMessage(chatFlow[22]);
  } else {
    // Pular step 1 (musicType) e ir direto para emotion (cantada) ou style (instrumental)
    const nextStep = type === 'instrumental' ? 2 : 10;
    setCurrentStep(nextStep);
    addBotMessageWithCelebration(nextStep, selectedCelebration);
  }
};
```

### 4. Mensagem de Chat Personalizada

```typescript
const addBotMessageWithCelebration = (stepIndex: number, celebration: UpcomingCelebration) => {
  // Mensagem inicial personalizada mencionando a celebracao
  const celebrationIntro = {
    id: 'msg-celebration-intro',
    type: 'bot' as const,
    content: `${celebration.emoji} Vamos criar sua musica de ${celebration.localizedName}!\n\nJa selecionei o estilo ${celebration.suggested_music_type} com atmosfera ${celebration.suggested_atmosphere} para combinar com a data.`,
  };
  
  setMessages([celebrationIntro]);
  
  setTimeout(() => {
    addBotMessage(chatFlow[stepIndex], stepIndex);
  }, 1000);
};
```

### 5. Badge Persistente no Header

No header do chat, mostrar badge quando for musica tematica:

```tsx
{/* Header */}
<header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
  <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
    {/* ... botao voltar e titulo */}
    
    {/* Celebration Badge */}
    {formData.celebrationName && (
      <Badge variant="outline" className="text-sm px-3 py-1 border-primary/50 bg-primary/10">
        {formData.celebrationEmoji} {formData.celebrationName}
      </Badge>
    )}
    
    {/* Plan Badge */}
    {currentPlanInfo && !formData.celebrationName && (
      <Badge variant="outline" className="text-sm px-3 py-1 border-primary/50 bg-primary/10">
        {currentPlanInfo.icon} {currentPlanInfo.name}
      </Badge>
    )}
  </div>
</header>
```

### 6. Modal de Selecao de Tipo

Novo componente Dialog para escolher tipo de musica:

```tsx
<Dialog open={showCelebrationTypeModal} onOpenChange={setShowCelebrationTypeModal}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {selectedCelebration?.emoji} Musica de {selectedCelebration?.localizedName}
      </DialogTitle>
      <DialogDescription>
        Escolha o tipo de musica que voce quer criar
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-3">
      <Button 
        variant="outline" 
        className="w-full h-auto py-4 justify-start"
        onClick={() => handleCelebrationTypeSelect('vocal')}
      >
        <span className="text-2xl mr-3">🎤</span>
        <div className="text-left">
          <p className="font-semibold">Musica Cantada</p>
          <p className="text-sm text-muted-foreground">Com letra e vocal personalizados</p>
        </div>
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full h-auto py-4 justify-start"
        onClick={() => handleCelebrationTypeSelect('instrumental')}
      >
        <span className="text-2xl mr-3">🎹</span>
        <div className="text-left">
          <p className="font-semibold">Instrumental</p>
          <p className="text-sm text-muted-foreground">Trilha sem vocal</p>
        </div>
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full h-auto py-4 justify-start"
        onClick={() => handleCelebrationTypeSelect('custom_lyric')}
      >
        <span className="text-2xl mr-3">📝</span>
        <div className="text-left">
          <p className="font-semibold">Ja Tenho a Letra</p>
          <p className="text-sm text-muted-foreground">Traga sua propria composicao</p>
        </div>
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Briefing.tsx` | Adicionar estados, handlers, modal e badge de celebration |
| `public/locales/*/briefing.json` | Adicionar traducoes para modal e mensagens |

---

## Traducoes a Adicionar

```json
{
  "celebration": {
    // ... existentes
    "selectType": "Escolha o tipo de musica",
    "selectTypeDesc": "Que tipo de musica de {{name}} voce quer criar?",
    "vocalFor": "Musica Cantada de {{name}}",
    "instrumentalFor": "Instrumental de {{name}}",
    "customLyricFor": "Ja tenho letra para {{name}}",
    "intro": "Vamos criar sua musica de {{name}}! Ja selecionei as configuracoes ideais para essa data especial."
  }
}
```

---

## Resultado Esperado

1. Clique no banner abre modal de selecao de tipo
2. Ao selecionar tipo, vai direto para o chat pulando perguntas redundantes
3. Chat inicia com mensagem personalizada mencionando a celebracao
4. Badge visivel no header durante todo o fluxo
5. Campos pre-preenchidos (musicType, atmosphere, emotion)
6. Experiencia fluida e direcionada para a data comemorativa


# Plano: Correção do Bug de Celebração + Modo Criação Rápida

## Problema 1: Bug do Badge "Carnaval" Aparecendo Incorretamente

### Causa Raiz
Quando o usuário acessa `/briefing?type=vocal`, o código:
1. Restaura `formData` do localStorage (que pode conter `celebrationName: "Carnaval"` de sessões anteriores)
2. Atualiza apenas `isInstrumental` e `hasCustomLyric`, mas **NÃO limpa** os campos de celebração
3. O badge no header mostra `formData.celebrationName` (linha 2986-2989)

### Correção
No `useEffect` de inicialização (linhas 369-388), ao entrar com `?type=`, limpar também os campos de celebração:

```javascript
// ANTES
setFormData(prev => ({ ...prev, isInstrumental: false, hasCustomLyric: false }));

// DEPOIS  
setFormData(prev => ({ 
  ...prev, 
  isInstrumental: false, 
  hasCustomLyric: false,
  celebrationType: undefined,
  celebrationName: undefined,
  celebrationEmoji: undefined,
}));
```

---

## Problema 2: Implementar Modo de Criação Rápida

### Conceito
Adicionar uma interface simplificada inspirada no design da imagem de referência, onde o usuário preenche tudo em **uma única tela** com os campos essenciais:

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Prompt/História | Textarea | Sim |
| Instrumental | Toggle | Não |
| Gênero Musical | Cards visuais | Sim |
| Tipo de Voz | Cards circulares | Se vocal |

### Fluxo de Entrada

```text
[Tela de Seleção de Pacotes]
          ↓
[Modal: Escolha o Modo]
    ┌─────────────────────────────────────┐
    │  🚀 Criação Rápida                  │
    │  Preencha tudo em uma única tela    │
    │                                     │
    │  🎨 Criação Detalhada               │
    │  Chat personalizado com todas as    │
    │  opções de customização             │
    └─────────────────────────────────────┘
          ↓
[Rápida] → Tela única com campos essenciais
[Detalhada] → Chat-flow completo existente
```

### Layout da Criação Rápida

```text
┌────────────────────────────────────────────────────┐
│ ← Crie sua música                     🎵 Pacote 1  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Descreva sua música ou cole sua letra...     │ │
│  │                                              │ │
│  │                                              │ │
│  │                                    0/500    │ │
│  │ [🔄 Reiniciar]         [Instrumental 🎛️]   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Gênero Musical                            [📊]   │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │  Pop  │ │ Rock  │ │ Rap   │ │ R&B   │ →       │
│  └───────┘ └───────┘ └───────┘ └───────┘         │
│                                                    │
│  Tipo de Voz (se vocal)                          │
│    (○)      (○)      (○)                         │
│   Masc.   Femin.   Dueto                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │           ✨ Criar Música                    │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Estrutura Técnica

#### Novo Componente: `QuickCreation.tsx`

```typescript
interface QuickCreationData {
  prompt: string;           // História/letra
  isInstrumental: boolean;  // Toggle
  style: string;            // Gênero selecionado
  voiceType?: string;       // Tipo de voz (se vocal)
}
```

#### Estados a Adicionar no Briefing.tsx

```typescript
const [creationMode, setCreationMode] = useState<'quick' | 'detailed' | null>(null);
const [showModeSelector, setShowModeSelector] = useState(false);
```

#### Integração

1. Após selecionar o pacote, mostrar modal de escolha de modo
2. Se "Rápida" → `setCreationMode('quick')` → Renderizar `QuickCreation`
3. Se "Detalhada" → `setCreationMode('detailed')` → Chat-flow atual
4. Ao submeter criação rápida, converter para `BriefingFormData` e ir para confirmação

### Mapeamento: Quick → FormData

```javascript
const convertQuickToFormData = (quick: QuickCreationData): BriefingFormData => ({
  ...initialFormData,
  story: quick.prompt,
  isInstrumental: quick.isInstrumental,
  style: quick.style,
  voiceType: quick.voiceType || '',
  musicType: 'homenagem', // Default para criação rápida
  emotion: 'amor',        // Default para criação rápida
  rhythm: 'medio',        // Default
  atmosphere: 'alegre',   // Default
  autoGenerateName: true, // Sempre automático na rápida
});
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Corrigir limpeza de celebração + adicionar modo rápido |
| `src/components/briefing/QuickCreation.tsx` | **NOVO** - Componente da criação rápida |
| `src/components/briefing/ModeSelector.tsx` | **NOVO** - Modal de seleção de modo |
| `public/locales/*/briefing.json` | Traduções para criação rápida |
| `src/hooks/useBriefingTranslations.ts` | Adicionar textos da criação rápida |

---

## Sequência de Implementação

1. **Correção do Bug** (5 min)
   - Limpar campos de celebração ao entrar com `?type=`

2. **Componente ModeSelector** (15 min)
   - Modal com 2 opções: Rápida vs Detalhada
   - Design com ícones e descrições claras

3. **Componente QuickCreation** (30 min)
   - Textarea para prompt
   - Switch de instrumental
   - ImageCardGrid para gêneros
   - ImageCardGrid circular para voz
   - Botão de criar

4. **Integração no Briefing** (15 min)
   - Estado de modo
   - Renderização condicional
   - Conversão para FormData

5. **Traduções** (10 min)
   - Adicionar textos em 4 idiomas

---

## Benefícios

- ✅ Bug de celebração corrigido
- ✅ Usuários podem criar músicas em ~30 segundos
- ✅ Opção detalhada continua disponível para quem quer customização completa
- ✅ Melhor UX para casos de uso simples
- ✅ Menos atrito = mais conversões


# Plano: Corrigir Rota de Criação Rápida + Redesign da Interface

## Problema Identificado

Quando o usuário clica em "Criar Rápido" (que navega para `/briefing?type=vocal`), o código atual:

```javascript
// Linha 427-441 do Briefing.tsx
} else {
  // vocal - ir direto para musicType, pulando isInstrumental
  setFormData(prev => ({ ... }));
  setSelectedPlanId('single');
  setCurrentStep(1);
  addBotMessage(chatFlow[1]); // ❌ PROBLEMA: Inicia o chat ao invés do modo rápido!
}
```

**Deveria:** Setar `creationMode = 'quick'` para exibir a tela de criação rápida.

---

## Solução

### 1. Corrigir Inicialização por URL (Briefing.tsx)

Modificar o bloco `else` (linhas 427-441) para ir ao modo rápido:

```javascript
} else {
  // vocal - ir direto para criação rápida
  setFormData(prev => ({ 
    ...prev, 
    isInstrumental: false, 
    hasCustomLyric: false,
    celebrationType: undefined,
    celebrationName: undefined,
    celebrationEmoji: undefined,
  }));
  setSelectedPlanId('single');
  setCreationMode('quick'); // ✅ Ativar modo rápido
  // NÃO chamar addBotMessage - deixar QuickCreation renderizar
}
```

### 2. Redesign do QuickCreation.tsx (Baseado na Imagem de Referência)

**Layout Atualizado:**

```text
┌────────────────────────────────────────────────────┐
│  Crie música com IA              [créditos] [Pro]  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  │  Escreva seu prompt ou letra...             │ │
│  │                                              │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│  [🔄 Reiniciar]  0/350          Instrumental [○]  │
│                                                    │
│  Gêneros musicais                          [📊]   │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │  Pop  │ │ Rock  │ │ Rap   │ │ R&B   │ →       │
│  └───────┘ └───────┘ └───────┘ └───────┘         │
│                                                    │
│  [➕ Adicionar mais gênero                    0]  │
│                                                    │
│  Gênero vocal                                     │
│    (○)      (○)      (○)                         │
│   Masc.   Femin.   Dueto                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │           ✨ Criar Música                    │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│     Prefere criar com mais detalhes? →           │
└────────────────────────────────────────────────────┘
```

**Mudanças no Componente:**

| Elemento | Antes | Depois |
|----------|-------|--------|
| Header | "Criação Rápida" simples | "Crie música com IA" + badges de créditos |
| Textarea | Fundo padrão | Fundo escuro (bg-card/80), rounded-xl |
| Contador | 0/500 | 0/350 (mais conciso) |
| Botão Reset | Texto simples | Estilizado como chip |
| Gêneros | Sem opção "adicionar" | Adicionar campo "Adicionar mais gênero" |
| Seções | Sem separação | Título "Gêneros musicais" e "Gênero vocal" |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Corrigir inicialização por URL (linhas 427-441) |
| `src/components/briefing/QuickCreation.tsx` | Redesign completo do layout |
| `public/locales/*/briefing.json` | Novas traduções para labels |

---

## Detalhes Técnicos

### QuickCreation.tsx - Estrutura Atualizada

```typescript
export const QuickCreation = ({ ... }) => {
  const [prompt, setPrompt] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [style, setStyle] = useState("");
  const [additionalGenre, setAdditionalGenre] = useState(""); // Novo
  const [voiceType, setVoiceType] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header com título e badges */}
      <header className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Crie música com IA</h1>
          <div className="flex items-center gap-2">
            {/* Badge de créditos */}
            <Badge variant="outline">🎵 1</Badge>
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Textarea escuro */}
        <div className="bg-card/80 rounded-xl p-4">
          <Textarea
            className="bg-transparent border-none min-h-[100px] resize-none"
            placeholder="Escreva seu prompt ou letra..."
            maxLength={350}
          />
          <div className="flex items-center justify-between mt-2">
            <button className="flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="w-3 h-3" />
              Reiniciar
            </button>
            <span className="text-xs text-muted-foreground">{prompt.length}/350</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Instrumental</span>
              <Switch />
            </div>
          </div>
        </div>

        {/* Gêneros musicais */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Gêneros musicais</h3>
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          </div>
          <ImageCardGrid options={styleOptions} selectedId={style} onSelect={setStyle} />
        </section>

        {/* Adicionar mais gênero (input opcional) */}
        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="w-4 h-4" />
            Adicionar mais gênero
          </span>
          <span className="text-xs text-muted-foreground">0</span>
        </button>

        {/* Gênero vocal (se não instrumental) */}
        {!isInstrumental && (
          <section>
            <h3 className="text-sm font-medium mb-3">Gênero vocal</h3>
            <ImageCardGrid 
              options={voiceOptions} 
              selectedId={voiceType} 
              onSelect={setVoiceType}
              variant="circle"
            />
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-3">
        <Button className="w-full" variant="hero" size="lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Criar Música
        </Button>
        <button className="w-full text-center text-sm text-muted-foreground">
          Prefere criar com mais detalhes? →
        </button>
      </div>
    </div>
  );
};
```

---

## Traduções Necessárias

```json
{
  "quickCreation": {
    "pageTitle": "Crie música com IA",
    "promptPlaceholder": "Escreva seu prompt ou letra...",
    "reset": "Reiniciar",
    "instrumental": "Instrumental",
    "genreTitle": "Gêneros musicais",
    "addGenre": "Adicionar mais gênero",
    "voiceTitle": "Gênero vocal",
    "createButton": "Criar Música",
    "switchToDetailed": "Prefere criar com mais detalhes?"
  }
}
```

---

## Resultado Esperado

1. **Clique em "Criar Rápido"** → Navega para `/briefing?type=vocal`
2. **Briefing.tsx detecta** `type=vocal` → Seta `creationMode = 'quick'`
3. **QuickCreation renderiza** com o novo layout idêntico à referência
4. **Usuário preenche** → Prompt + Gênero + Voz (se vocal)
5. **Clique em "Criar Música"** → Converte para FormData e vai para confirmação
6. **Ou clique em "Prefere criar com mais detalhes?"** → Muda para chat detalhado

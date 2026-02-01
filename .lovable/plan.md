
# Plano: Corrigir Tela Preta na Criação Rápida

## Problema Identificado

No `handleQuickCreationSubmit`, o estado `creationMode` é setado para `null` **antes** de:
1. Verificar se o usuário tem WhatsApp
2. Chamar `finishBriefingWithData` que seta `isCreatingOrder(true)`

Como o modal de WhatsApp e o loading overlay estão renderizados **dentro** do bloco `creationMode === 'quick'`, quando `creationMode` vira `null`, tudo desaparece e a tela fica preta.

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Briefing.tsx` | Adiar `setCreationMode(null)` para o momento correto |

## Solução

Mover `setCreationMode(null)` para ser chamado **somente dentro** de `finishBriefingWithData`, garantindo que o loading overlay seja mostrado no momento certo.

### Alteração em handleQuickCreationSubmit (linhas 2493-2496)

**ANTES:**
```typescript
setFormData(newFormData);
setIsQuickMode(true);
setCreationMode(null);  // ← BUG: remove a UI antes de mostrar loading/modal
setQuickModeFormData(newFormData);
```

**DEPOIS:**
```typescript
setFormData(newFormData);
setIsQuickMode(true);
// NÃO setar creationMode aqui - será setado em finishBriefingWithData
setQuickModeFormData(newFormData);
```

### Alteração em finishBriefingWithData (linha 2523-2525)

**ANTES:**
```typescript
const finishBriefingWithData = async (data: BriefingFormData) => {
  setIsCreatingOrder(true);
  clearSavedBriefing();
```

**DEPOIS:**
```typescript
const finishBriefingWithData = async (data: BriefingFormData) => {
  setIsCreatingOrder(true);
  setCreationMode(null); // ← Agora sim, quando loading já está ativo
  clearSavedBriefing();
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuário clica "Criar Música" (creationMode = 'quick')        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. handleQuickCreationSubmit                                    │
│    - setIsQuickMode(true)                                       │
│    - NÃO altera creationMode (UI permanece visível)             │
│    - Verifica WhatsApp                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ Tem WhatsApp?            │    │ Sem WhatsApp?            │
│ → finishBriefingWithData │    │ → showWhatsAppModal      │
│   - isCreatingOrder=true │    │   (modal DENTRO do       │
│   - creationMode=null    │    │   creationMode='quick')  │
│   - Loading overlay      │    │   Modal é visível! ✓     │
└──────────────────────────┘    └──────────────────────────┘
```

## Resumo

| Linha | Ação | Descrição |
|-------|------|-----------|
| 2495 | REMOVER | `setCreationMode(null)` |
| 2524 | ADICIONAR | `setCreationMode(null)` após `setIsCreatingOrder(true)` |

## Benefícios

1. **Modal de WhatsApp visível** - UI permanece enquanto modal é exibido
2. **Loading overlay funciona** - Aparece dentro do Quick Creation
3. **Transição suave** - UI só desaparece quando loading está ativo
4. **Sem tela preta** - Sempre há algo renderizado

## Testes Necessários

1. Acessar `/briefing?type=vocal` e preencher o formulário de criação rápida
2. Clicar em "Criar Música"
3. Verificar que:
   - Se não tem WhatsApp: modal aparece corretamente
   - Se tem WhatsApp: loading overlay aparece e prossegue
4. Verificar que não há mais tela preta em nenhum cenário


# Plano: Corrigir Fluxo de Eventos/Celebrações

## Problema Identificado
Quando o usuário clica no banner de celebração na homepage (ex: Carnaval), o sistema navega para `/briefing?celebration=...&celebrationName=...&celebrationEmoji=...`, mas a lógica de inicialização do Briefing não detecta esses parâmetros e exibe a tela de seleção de pacotes em vez de ir direto para o modal de tipo de música da celebração.

## Solução

### Alteração Principal
**Arquivo:** `src/pages/Briefing.tsx`

Modificar o `useEffect` de inicialização (linhas ~342-407) para detectar parâmetros de celebração e pular a seleção de pacotes:

```text
ANTES:
  1. Verifica 'type' → Pula seleção de plano
  2. Verifica 'planId' → Usa plano definido
  3. Se nenhum → Mostra seleção de pacotes ❌

DEPOIS:
  1. Verifica 'type' → Pula seleção de plano
  2. Verifica 'celebration' → Abre modal de tipo direto ✅
  3. Verifica 'planId' → Usa plano definido  
  4. Se nenhum → Mostra seleção de pacotes
```

### Fluxo Atualizado

```text
[Homepage] 
    ↓ Clique no banner "Criar música de Carnaval"
    ↓
[/briefing?celebration=xxx&celebrationName=Carnaval&celebrationEmoji=🎭]
    ↓
[Detectar parâmetros de celebração]
    ↓
[Abrir Modal: Vocal | Instrumental | Letra Própria]
    ↓ Seleção do tipo
[Pré-preencher dados da celebração]
    ↓
[Iniciar chat no step correto (10, 2, ou 22)]
```

### Implementação Detalhada

1. **Buscar celebração pelo ID** (já existente na base):
   - Usar o ID da URL para buscar dados completos da celebração
   - Preencher `selectedCelebration` com dados do banco

2. **Mostrar modal de tipo diretamente**:
   - Definir `showCelebrationTypeModal = true`
   - Não mostrar `showPlanSelection`
   - O modal já existe e funciona (`handleCelebrationTypeSelect`)

3. **Manter dados da URL para contexto**:
   - O `celebrationName` e `celebrationEmoji` da URL podem ser usados como fallback

### Código a Modificar

```javascript
// Dentro do useEffect de inicialização (~linha 342)

// NOVO: Verificar se tem celebração na URL
const celebrationFromUrl = urlParams.get('celebration');
const celebrationNameFromUrl = urlParams.get('celebrationName');
const celebrationEmojiFromUrl = urlParams.get('celebrationEmoji');

if (celebrationFromUrl) {
  // Criar objeto de celebração a partir dos params da URL
  const urlCelebration = {
    id: celebrationFromUrl,
    localizedName: celebrationNameFromUrl || 'Celebração',
    emoji: decodeURIComponent(celebrationEmojiFromUrl || '🎉'),
    // ... outros campos com defaults seguros
  };
  
  setSelectedCelebration(urlCelebration);
  setShowCelebrationTypeModal(true);
  setShowPlanSelection(false);
  return;
}
```

## Sobre a Tela de Seleção de Pacotes

A tela de seleção de pacotes (`showPlanSelection`) **ainda é necessária** para:
- Usuários que acessam `/briefing` diretamente (sem params)
- Usuários que clicam em "Nova Música" no dashboard
- Links de marketing sem contexto específico

Porém, ela é **pulada automaticamente** quando:
- Tem `type` na URL (vocal/instrumental/custom_lyric)
- Tem `planId` na URL  
- Tem `celebration` na URL (após esta correção)

## Resultado Esperado

| Ação | Antes | Depois |
|------|-------|--------|
| Clicar banner Carnaval | Mostra seleção de pacotes | Abre modal tipo direto |
| Selecionar "Vocal" no modal | - | Inicia chat com tema Carnaval |
| Badge no header | Mostra plano | Mostra "🎭 Carnaval" |

## Arquivos a Modificar
- `src/pages/Briefing.tsx` - useEffect de inicialização (1 arquivo, ~20 linhas)


# Plano: Migrar Geração de Letras para GPT

✅ **IMPLEMENTADO**

---

# Plano: Modo Simples Automático para Letras

✅ **IMPLEMENTADO** (2026-02-05)

## Objetivo
Ajustar o sistema para que pedidos simples gerem letras simples, bonitas e coerentes, sem exigir que o usuário saiba escrever prompts elaborados.

## Problema Identificado
- A IA gerava letras longas, poéticas demais e desconexas para pedidos simples
- Usuários leigos enviavam textos curtos como "música de parabéns para minha mãe"
- Sistema produzia letras exageradas com metáforas e histórias inventadas

## Solução Implementada

### Modo Simples Automático (invisível ao usuário)
- **Ativação**: Quando o texto do usuário < 240 caracteres
- **Critério**: Volume/detalhe do texto (NÃO gênero musical ou voz)

### Comportamento do Modo Simples
1. Linguagem clara, direta e emocional
2. Evita metáforas abstratas e simbolismos complexos
3. Não inventa histórias paralelas ou cenários irrelevantes
4. Foco total no tema principal solicitado
5. Estrutura simplificada: [Intro] + [Verse 1] + [Chorus] + [Outro]

### Prioridade dos Modos
1. Somente Monólogo (spoken word motivacional)
2. **Modo Simples** (pedidos curtos < 240 chars)
3. Preview (música de ~1 minuto)
4. Completo (briefing detalhado)

## Arquivos Modificados
- `supabase/functions/generate-lyrics/index.ts`
  - Adicionada detecção de `isSimpleMode`
  - Criado `simpleModePrompt` com regras anti-poesia
  - Criado `userPrompt` simplificado para modo simples

---

# Plano: Correção CORS e UX de Geração (2026-02-05)

✅ **IMPLEMENTADO**

## Problemas Corrigidos

### 1. Erro de CORS em Edge Functions
- **Problema**: Headers CORS incompletos bloqueavam requisições do SDK Supabase
- **Solução**: Adicionados headers faltantes em 3 edge functions
- **Arquivos**: `check-credits`, `validate-voucher`, `notify-admin-order`

### 2. Feedback Visual na Geração de Letras
- **Problema**: Usuário não tinha feedback de progresso durante geração (até 2 min)
- **Solução**: Adicionada barra de progresso animada + mensagens de status
- **Arquivo**: `src/pages/CreateSong.tsx`

## Detalhes Técnicos

### Headers CORS Atualizados
```
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, 
  x-supabase-client-platform, x-supabase-client-platform-version, 
  x-supabase-client-runtime, x-supabase-client-runtime-version
```

### Componente GeneratingProgressBar
- Barra de progresso de 0% a 95% em ~60 segundos
- 4 mensagens de status rotativas a cada 12 segundos
- Aviso de tempo estimado (até 2 minutos)

---

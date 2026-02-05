
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
- **Ativação**: Quando o texto do usuário < 120 caracteres
- **Critério**: Volume/detalhe do texto (NÃO gênero musical ou voz)

### Comportamento do Modo Simples
1. Linguagem clara, direta e emocional
2. Evita metáforas abstratas e simbolismos complexos
3. Não inventa histórias paralelas ou cenários irrelevantes
4. Foco total no tema principal solicitado
5. Estrutura simplificada: [Intro] + [Verse 1] + [Chorus] + [Outro]

### Prioridade dos Modos
1. Somente Monólogo (spoken word motivacional)
2. **Modo Simples** (pedidos curtos < 120 chars)
3. Preview (música de ~1 minuto)
4. Completo (briefing detalhado)

## Arquivos Modificados
- `supabase/functions/generate-lyrics/index.ts`
  - Adicionada detecção de `isSimpleMode`
  - Criado `simpleModePrompt` com regras anti-poesia
  - Criado `userPrompt` simplificado para modo simples

---

## Objetivo
Melhorar a qualidade das letras geradas trocando o modelo Gemini por GPT e refinando o prompt para evitar clichês e usar mais o contexto específico da história.

## Problema Identificado
As letras atuais estão:
- Muito genéricas e clichês ("razão do meu ser", "luz da minha vida", "estrela guia")
- Sem contexto específico da história fornecida
- Exageradas emocionalmente

## Mudanças Técnicas

### 1. Trocar modelo no generate-lyrics
**Arquivo:** `supabase/functions/generate-lyrics/index.ts`

- Linha 626: Mudar de `google/gemini-3-flash-preview` para `openai/gpt-5`
- O GPT-5 tem melhor capacidade de seguir instruções complexas e manter contexto

### 2. Refinar o Prompt de Sistema
Adicionar instruções específicas para:
- EVITAR clichês musicais genéricos
- USAR detalhes específicos da história (nomes, momentos, características)
- Manter tom natural e conversacional
- Criar letras que pareçam escritas especificamente para aquela pessoa/ocasião

### 3. Exemplo de Melhoria no Prompt
```
EVITE OBRIGATORIAMENTE:
- Clichês como: "luz da minha vida", "razão do meu ser", "estrela guia", "amor eterno"
- Frases genéricas que servem para qualquer pessoa
- Tom excessivamente dramático ou exagerado

PRIORIZE:
- Detalhes específicos mencionados na história (nome, idade, hobbies, momentos marcantes)
- Tom conversacional e natural
- Rimas criativas, não óbvias
- Referências concretas às memórias/características da pessoa homenageada
```

## Resultado Esperado
Letras mais personalizadas como:
- "Mãe, lembra daquele bolo que você faz no domingo?"
- "Seus 60 anos chegaram com aquele sorriso de sempre"

Em vez de:
- "Feliz aniversário, razão do meu ser"
- "Você é a luz que me guia"

## Implementação
1. ✅ Atualizar modelo para `openai/gpt-5`
2. ✅ Adicionar seção anti-clichê no prompt
3. ✅ Aumentar ênfase no uso do contexto específico
4. Testar com o mesmo briefing de aniversário para comparar resultados

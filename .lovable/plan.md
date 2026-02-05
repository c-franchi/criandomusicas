
# Plano: Migrar Geração de Letras para GPT

✅ **IMPLEMENTADO**

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

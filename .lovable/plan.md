

## Plano: Criar prompt exclusivo para Chamada/Propaganda corporativa

### Problema

Quando o usuario escolhe "Chamada/Propaganda" no briefing corporativo, o sistema define `monologuePosition: 'full'`. Na funcao `generate-lyrics`, a condicao `monologuePosition === 'full'` ativa o prompt de **spoken word motivacional** (com vocabulario de disciplina, superacao, mentor/treinador). Resultado: uma propaganda de padaria vira um discurso motivacional.

### Causa Raiz

A flag `isSomenteMonologo` nao distingue entre:
- **Monologo motivacional** (`motivationalNarrative === 'somente_monologo'`)
- **Chamada/propaganda corporativa** (`corporateFormat === 'monologo'`)

Ambos setam `monologuePosition: 'full'` e caem no mesmo prompt.

### Solucao

Criar uma condicao separada para detectar chamada corporativa e usar um prompt especifico para propaganda/anuncio.

#### Mudancas em `supabase/functions/generate-lyrics/index.ts`

1. **Nova deteccao**: Adicionar flag `isChamadaCorporativa` baseada em `corporateFormat === 'monologo'` (campo ja enviado pelo briefing)

2. **Ajustar prioridade**: A chamada corporativa deve ser verificada ANTES do monologo motivacional:

```text
if isChamadaCorporativa -> prompt de propaganda
else if isSomenteMonologo -> prompt motivacional (existente)
else if isSimpleMode -> prompt simples (existente)
else -> prompt padrao (existente)
```

3. **Novo system prompt para chamada corporativa**: Tom de locutor de radio/carro de som, direto, comercial. Estrutura obrigatoria:

```text
[Intro]
[monologue]
(texto completo da propaganda em um unico bloco grande)

[End]
```

Regras do prompt:
- 100% falado, NENHUM trecho cantado
- Um unico bloco `[monologue]` grande (nao dividir em varios blocos)
- Tom de locutor comercial, nao motivacional
- Reproduzir fielmente o texto/contexto que o usuario forneceu
- Adicionar apenas conectores naturais e enfase comercial
- NAO inventar historias, emocoes ou mensagens motivacionais
- Manter curto e direto como propaganda de carro de som
- Incluir informacoes de contato se fornecidas

4. **Novo user prompt para chamada corporativa**: Enviar o script do usuario como base principal, com instrucao clara de que e uma propaganda comercial.

### Detalhes Tecnicos

**Arquivo modificado:**
- `supabase/functions/generate-lyrics/index.ts`
  - Extrair `corporateFormat` do briefing (ja vem do frontend, so nao e utilizado)
  - Criar flag `isChamadaCorporativa = corporateFormat === 'monologo'`
  - Criar `chamadaCorporativaPrompt` (system) e bloco de user prompt dedicado
  - Ajustar a condicao no `userPrompt` (linha ~770) para priorizar chamada corporativa
  - Ajustar a condicao no system message (linha ~859) para usar o prompt correto

**Nenhuma mudanca no frontend** - o briefing ja envia `corporateFormat: 'monologo'` corretamente.

**Nenhuma mudanca no banco de dados.**

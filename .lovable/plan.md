
# Plano: Navegação para Dashboard e Opção de Propaganda/Jingle para Música Corporativa

## Visão Geral

Este plano implementa duas funcionalidades solicitadas:

1. **Navegação pós-aprovação de letra** → Ir para o Dashboard em vez do Briefing
2. **Opção de Jingle/Propaganda** → Novo tipo de música para corporativa e cantada que inclui monólogo com informações de contato (telefone, endereço, etc.)

---

## 1. Navegação Após Aprovação da Letra

### Problema Atual
Na tela `complete` do `CreateSong.tsx` (linhas 1058-1067), há um botão "Voltar ao Painel" que já navega para `/dashboard`. Porém, não há redirecionamento automático após a aprovação.

### Solução
O comportamento atual já está correto - o usuário vê a tela de sucesso e tem o botão para ir ao Dashboard. Se o desejo é um redirecionamento automático, podemos adicionar isso.

### Mudanças Técnicas

| Arquivo | Mudança |
|---------|---------|
| `src/pages/CreateSong.tsx` | Adicionar redirecionamento automático para `/dashboard` após 3 segundos na tela `complete`, com opção de ir imediatamente |

---

## 2. Opção de Jingle/Propaganda para Música Corporativa

### Conceito
Quando o usuário escolhe **Música Cantada** e seleciona o tipo **Corporativa**, será perguntado se deseja criar um **Jingle/Propaganda** - aquele estilo de áudio promocional que inclui:
- Telefone da empresa
- Endereço
- Slogans
- Chamadas para ação

Essas músicas terão **monólogo obrigatório** para falar as informações de contato com clareza.

### Fluxo Proposto

```text
Usuário escolhe "Música Cantada"
        ↓
Usuário escolhe "Corporativa"
        ↓
  [NOVA PERGUNTA]
  "Qual formato corporativo você deseja?"
    - 🎵 Música institucional (trilha, hino da empresa)
    - 📢 Jingle/Propaganda (para marketing, com telefone/endereço)
        ↓
  Se escolher "Jingle/Propaganda":
    → hasMonologue = true
    → monologuePosition = 'intro' ou 'outro'
    → Perguntas adicionais sobre telefone/endereço
        ↓
  Continua fluxo normal
```

### Mudanças Técnicas

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useBriefingTranslations.ts` | Adicionar opções de `corporateFormat` (institucional vs jingle) |
| `src/pages/Briefing.tsx` | Adicionar novo step para perguntar formato corporativo após musicType = 'corporativa' |
| `src/pages/Briefing.tsx` | Adicionar step para coletar informações de contato (telefone, endereço, redes sociais) |
| `src/pages/Briefing.tsx` | Configurar automaticamente `hasMonologue = true` para jingles |
| `public/locales/pt-BR/briefing.json` | Adicionar traduções para o novo fluxo |
| `public/locales/en/briefing.json` | Adicionar traduções em inglês |
| `public/locales/es/briefing.json` | Adicionar traduções em espanhol |
| `public/locales/it/briefing.json` | Adicionar traduções em italiano |
| `supabase/functions/generate-lyrics/index.ts` | Ajustar prompt para incluir informações de contato no monólogo |

### Novos Campos do Formulário

```typescript
interface BriefingFormData {
  // ... campos existentes
  corporateFormat: 'institucional' | 'jingle' | '';
  contactInfo: string;  // Telefone, endereço, redes sociais
  callToAction: string; // "Ligue agora!", "Visite nossa loja!"
}
```

### Prompt Ajustado para Jingles

Quando `corporateFormat === 'jingle'`, o prompt de geração de letra incluirá:

```text
REGRAS ESPECIAIS PARA JINGLE/PROPAGANDA:
1. INCLUA OBRIGATORIAMENTE a tag [monologue] no início ou final
2. O monólogo DEVE conter as informações de contato: ${contactInfo}
3. Inclua uma chamada para ação clara: ${callToAction}
4. O refrão deve ser MUITO simples e fácil de memorizar
5. Use frases curtas e diretas para máximo impacto publicitário
6. O monólogo deve soar como um locutor de rádio/TV
```

### Exemplo de Saída para Jingle

```text
Pizzaria do João

[Intro]
Hmm, que fome, que vontade
De uma pizza de verdade!

[Chorus]
Pizzaria do João, sabor que encanta o coração
Massa fresquinha, queijo derretendo
Cada mordida, você vai querer mais!

[Verse 1]
Calabresa, marguerita, quatro queijos também
Frango catupiry, portuguesa, tem de tudo aqui pra você!

[monologue]
"Ligue agora mesmo: (11) 99999-9999! Pizzaria do João, Rua das Flores, 123, Centro. 
Entrega grátis para toda a cidade! Siga no Instagram @pizzariadojoao!"

[Outro]
Pizzaria do João... sabor que encanta o coração!
```

---

## Resumo das Alterações

| # | Arquivo | Tipo | Descrição |
|---|---------|------|-----------|
| 1 | `src/pages/CreateSong.tsx` | Edição | Adicionar redirect automático para dashboard na tela complete |
| 2 | `src/hooks/useBriefingTranslations.ts` | Edição | Adicionar opções de formato corporativo |
| 3 | `src/pages/Briefing.tsx` | Edição | Adicionar steps para formato corporativo e informações de contato |
| 4 | `public/locales/pt-BR/briefing.json` | Edição | Traduções do novo fluxo |
| 5 | `public/locales/en/briefing.json` | Edição | Traduções em inglês |
| 6 | `public/locales/es/briefing.json` | Edição | Traduções em espanhol |
| 7 | `public/locales/it/briefing.json` | Edição | Traduções em italiano |
| 8 | `supabase/functions/generate-lyrics/index.ts` | Edição | Ajustar prompt para jingles |

---

## Benefícios

- **UX Melhorada**: Navegação direta para o dashboard após aprovação
- **Novo Nicho de Mercado**: Jingles para empresas locais (pizzarias, lojas, serviços)
- **Diferenciação**: Poucos concorrentes oferecem geração de jingles com IA
- **Valor Agregado**: Empresas pagam bem por jingles personalizados


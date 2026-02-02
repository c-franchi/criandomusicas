
# Plano: Implementacoes Faltantes do Sistema de Preview

## Visao Geral

Completar o sistema de preview com informacoes na homepage, bloqueio de download, e melhorias de conversao.

## Mudancas a Implementar

### 1. Hero - Destaque do Credito Gratuito

**Arquivo:** `src/components/Hero.tsx`

Adicionar badge/destaque para usuarios nao logados sobre o credito preview gratuito:

```text
┌─────────────────────────────────────────┐
│  🎁 Novo! Teste gratis antes de comprar │
│  Crie uma previa de 40s da sua musica   │
└─────────────────────────────────────────┘
```

**Mudancas:**
- Novo badge animado abaixo do badge principal
- Mostrar apenas para usuarios NAO logados
- Link para /briefing com destaque visual

### 2. ProcessSteps - Secao de Preview Gratuito

**Arquivo:** `src/components/ProcessSteps.tsx`

Adicionar card informativo sobre o preview gratuito entre os passos e a secao de pacotes:

```text
┌────────────────────────────────────────────────────┐
│  🎁 NOVO: Preview Gratuito                         │
│                                                    │
│  Crie sua conta e teste o sistema de graca!       │
│  Voce recebe 1 credito para gerar uma previa      │
│  de ate 40 segundos da sua musica.                │
│                                                    │
│  ✓ Sem compromisso                                │
│  ✓ Conheca o estilo antes de comprar              │
│  ✓ Cadastro simples e rapido                      │
│                                                    │
│  [Comecar Gratis →]                               │
└────────────────────────────────────────────────────┘
```

### 3. OrderDetails - Bloqueio de Download para Preview

**Arquivo:** `src/pages/OrderDetails.tsx`

**Mudancas necessarias:**
1. Buscar campo `is_preview` e `plan_id` da order
2. Verificar se e preview: `order.is_preview || order.plan_id === 'preview_test'`
3. Ocultar/desabilitar botao de download para previews
4. Mostrar mensagem explicativa e CTA para comprar

```text
┌────────────────────────────────────────────────────┐
│  🎵 Preview de Teste                              │
│                                                    │
│  Esta e uma previa de 40 segundos.                │
│  Para baixar a musica completa, adquira creditos. │
│                                                    │
│  [🔊 Ouvir]  [❌ Download bloqueado]             │
│                                                    │
│  [💳 Comprar Creditos]                            │
└────────────────────────────────────────────────────┘
```

### 4. Dashboard OrderCard - Indicador Visual de Preview

**Arquivo:** `src/components/dashboard/OrderCard.tsx`

Ja implementado parcialmente. Verificar se esta funcionando corretamente com o campo `plan_id`.

### 5. Traducoes i18n

**Arquivos:** `public/locales/*/home.json`

Adicionar novas chaves para o preview gratuito:

```json
{
  "hero": {
    "previewBadge": "🎁 Novo! Teste gratis antes de comprar",
    "previewSubtext": "Crie uma previa de 40s da sua musica"
  },
  "process": {
    "preview": {
      "title": "Preview Gratuito",
      "description": "Crie sua conta e teste o sistema de graca! Voce recebe 1 credito para gerar uma previa de ate 40 segundos da sua musica.",
      "benefit1": "Sem compromisso",
      "benefit2": "Conheca o estilo antes de comprar", 
      "benefit3": "Cadastro simples e rapido",
      "cta": "Comecar Gratis"
    }
  }
}
```

**Arquivos:** `public/locales/*/dashboard.json`

```json
{
  "preview": {
    "badge": "Preview",
    "downloadBlocked": "Download bloqueado",
    "downloadBlockedDesc": "Esta e uma previa de teste. Adquira creditos para baixar a musica completa.",
    "buyCredits": "Comprar Creditos",
    "notice": "Esta e uma previa de 40 segundos. Para a versao completa, adquira creditos."
  }
}
```

### 6. Auth - Mensagem pos-cadastro

**Arquivo:** `src/pages/Auth.tsx`

Atualizar mensagem de sucesso no cadastro para mencionar o credito preview:

```typescript
toast({
  title: t('success.signup'),
  description: t('success.signupWithPreview'), // "Conta criada! Voce ganhou 1 credito preview gratuito."
});
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/Hero.tsx` | Badge de preview gratuito |
| `src/components/ProcessSteps.tsx` | Card de preview info |
| `src/pages/OrderDetails.tsx` | Bloqueio de download |
| `src/pages/Auth.tsx` | Mensagem pos-cadastro |
| `public/locales/pt-BR/home.json` | Textos preview |
| `public/locales/en/home.json` | Textos preview (EN) |
| `public/locales/es/home.json` | Textos preview (ES) |
| `public/locales/it/home.json` | Textos preview (IT) |
| `public/locales/pt-BR/dashboard.json` | Textos download bloqueado |
| `public/locales/en/dashboard.json` | Textos download bloqueado (EN) |
| `public/locales/es/dashboard.json` | Textos download bloqueado (ES) |
| `public/locales/it/dashboard.json` | Textos download bloqueado (IT) |
| `public/locales/pt-BR/auth.json` | Mensagem cadastro |
| `public/locales/en/auth.json` | Mensagem cadastro (EN) |
| `public/locales/es/auth.json` | Mensagem cadastro (ES) |
| `public/locales/it/auth.json` | Mensagem cadastro (IT) |

## Interface do OrderData

Atualizar a interface em `OrderDetails.tsx`:

```typescript
interface OrderData {
  // ... campos existentes
  is_preview: boolean | null;
  plan_id: string | null;
}
```

## Logica de Verificacao de Preview

```typescript
// Funcao utilitaria para verificar se ordem e preview
const isPreviewOrder = (order: OrderData): boolean => {
  return order.is_preview === true || order.plan_id === 'preview_test';
};
```

## Preview Visual - Hero

```text
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│     [🎵 Musicas feitas sob medida para voce]                 │
│                                                               │
│   Conte sua historia. A gente transforma em musica.          │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ 🎁 TESTE GRATIS! Crie uma previa de 40s sem pagar  │    │
│   └─────────────────────────────────────────────────────┘    │
│                                                               │
│   [Criar Minha Musica →]    [Ver Exemplos 🎧]                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Preview Visual - OrderDetails (Preview bloqueado)

```text
┌────────────────────────────────────────────────────┐
│  🎵 Sua Musica (Preview)                          │
│  ─────────────────────────────────────────────────│
│                                                    │
│  [Cover]   Titulo da Musica                       │
│            Rock • Preview de Teste                │
│                                                    │
│  [▶️ Ouvir]  [🔒 Download indisponivel]           │
│                                                    │
│  ┌──────────────────────────────────────────────┐│
│  │ ⚠️ Esta e uma previa de 40 segundos.        ││
│  │ Para baixar a musica completa com todos os  ││
│  │ versos e qualidade final, adquira creditos. ││
│  │                                              ││
│  │ [💳 Comprar Creditos]  [🎵 Criar Completa]  ││
│  └──────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

## Beneficios Esperados

1. **Conversao**: Usuarios veem o valor antes de pagar
2. **Confianca**: Demonstra qualidade do produto
3. **Engajamento**: Reduz atrito inicial
4. **Clareza**: Limitacoes bem comunicadas evitam frustracao

## Ordem de Implementacao

1. Traducoes i18n (base para todos os textos)
2. Hero.tsx (destaque principal)
3. ProcessSteps.tsx (info detalhada)
4. OrderDetails.tsx (bloqueio de download)
5. Auth.tsx (mensagem pos-cadastro)

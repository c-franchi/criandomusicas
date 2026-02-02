
# Correção: Erro de Sintaxe JSON nas Traduções

## Problema Identificado

O arquivo `public/locales/pt-BR/home.json` contém um erro de sintaxe JSON que impede o carregamento de todas as traduções em português brasileiro.

## Causa

Falta uma **vírgula** na linha 19, após o fechamento do objeto `stats`:

```text
Linha 19: }       ← Falta vírgula aqui
Linha 20: "previewBadge": "🎁 Novo!..."
```

## Correção Necessária

Adicionar a vírgula faltante na linha 19:

```json
"stats": {
  "songs": "Músicas Criadas",
  "time": "Tempo Médio",
  "rating": "Avaliação"
},                       // ← Adicionar vírgula
"previewBadge": "🎁 Novo! Teste grátis antes de comprar",
```

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `public/locales/pt-BR/home.json` | Adicionar vírgula na linha 19 |

## Impacto da Correção

Após a correção, todas as traduções em português serão carregadas corretamente e o site exibirá os textos traduzidos em vez das chaves i18n.

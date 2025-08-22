# 🚀 Deploy Guide - Story to Song

## Configuração de Secrets e Deploy das Edge Functions

### 1. Autenticação e Configuração Inicial

```bash
# Fazer login no Supabase
supabase login

# Conectar ao projeto (substitua pelo seu PROJECT_REF)
supabase link --project-ref rsqgdfrjnuydcxzuucsz
```

### 2. Configurar Secrets das Edge Functions

⚠️ **IMPORTANTE**: As Edge Functions leem as secrets via `Deno.env.get()`, não do front-end.

```bash
# Configurar todas as secrets necessárias
supabase secrets set \
  OPENAI_API_KEY="sk-proj-YOUR_OPENAI_API_KEY_HERE" \
  OPENAI_MODEL="gpt-4o-mini" \
  SUPABASE_URL="https://rsqgdfrjnuydcxzuucsz.supabase.co" \
  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcWdkZnJqbnV5ZGN4enV1Y3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4Mzg1MzksImV4cCI6MjA3MTQxNDUzOX0.TcGS0JfJXCwZDWQGsSAu2EWVxvWJRI5OynRhvYsxqpM" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"
```

### 3. Deploy das Edge Functions

```bash
# Deploy de todas as funções
supabase functions deploy generate-lyrics
supabase functions deploy approve-lyric  
supabase functions deploy create-order
supabase functions deploy reprocess-paid-orders

# Ou deploy de uma função específica
supabase functions deploy generate-lyrics --no-verify-jwt
```

### 4. Testar as Funções

```bash
# Teste básico da função generate-lyrics (sem JWT para teste)
supabase functions invoke generate-lyrics --no-verify-jwt --body '{
  "orderId": "test-123"
}'

# Teste com JWT (usuário autenticado)
supabase functions invoke generate-lyrics --body '{
  "orderId": "86b1eff8-411c-4f39-a478-e4e6c0a576c3"
}'
```

### 5. Verificar Logs

```bash
# Ver logs em tempo real
supabase functions logs generate-lyrics --follow

# Ver logs específicos
supabase functions logs generate-lyrics --limit 50
```

## ✅ Checklist de Validação

- [ ] `OPENAI_API_KEY` configurada (deve começar com `sk-proj-` ou `sk-`)
- [ ] Todas as secrets configuradas sem erro
- [ ] Deploy das funções bem-sucedido
- [ ] Teste retorna `"ok": true` com letras geradas
- [ ] Logs mostram "OpenAI API Key status: FOUND"
- [ ] UI do front-end exibe as letras corretamente
- [ ] Função de aprovação funciona
- [ ] Nenhuma secret exposta no bundle do front-end

## 🔧 Resolução de Problemas

### Erro: "OpenAI API key not configured"
```bash
# Verificar se a secret foi configurada
supabase secrets list

# Reconfigurar se necessário  
supabase secrets set OPENAI_API_KEY="sua-chave-aqui"
```

### Erro: "Missing configuration"
```bash
# Verificar todas as secrets necessárias
supabase secrets set SUPABASE_URL="https://rsqgdfrjnuydcxzuucsz.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

### Erro: "Request timeout"
```bash
# A função tem timeout de 30s, se necessário aumentar:
# Ajuste o timeout no arquivo da função ou otimize o prompt
```

## 📁 Estrutura das Funções

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── openai-helper.ts     # Helper centralizado para OpenAI
│   ├── generate-lyrics/
│   │   └── index.ts             # Geração de letras
│   ├── approve-lyric/
│   │   └── index.ts             # Aprovação de letras
│   ├── create-order/
│   │   └── index.ts             # Criação de pedidos
│   └── reprocess-paid-orders/
│       └── index.ts             # Reprocessamento
└── config.toml                  # Configuração das funções
```

## 🔐 Segurança

- ✅ Secrets não expostas no front-end
- ✅ JWT verificação habilitada para funções sensíveis  
- ✅ RLS (Row Level Security) ativo nas tabelas
- ✅ Service Role Key usado apenas quando necessário
- ✅ Logs não expõem dados sensíveis

## 🚀 Deploy Automático

As funções são deployadas automaticamente quando você faz push para o repositório conectado ao Supabase.
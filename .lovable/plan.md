

## Plano: Corrigir Notificações Push e In-App

### Problemas Identificados

1. **NotificationCenter filtra apenas status `MUSIC_READY`**, mas quando as duas versoes sao enviadas o pedido vai direto para `COMPLETED`. Resultado: a notificacao "Musica pronta!" nunca aparece no sino.

2. **Push notifications nao estao sendo entregues**: os logs mostram status "sent" no banco, mas a funcao `send-push-notification` nao tem logs de execucao, indicando que a criptografia Web Push customizada pode estar falhando silenciosamente.

3. **Nenhum push e enviado quando apenas 1 versao e carregada** - o usuario so recebe quando ambas ficam prontas.

---

### Correcoess

#### 1. Corrigir NotificationCenter para incluir pedidos COMPLETED

Alterar a query para buscar pedidos com status `MUSIC_READY` **OU** `COMPLETED` que tenham `music_ready_at` nos ultimos 7 dias:

```
.in('status', ['MUSIC_READY', 'COMPLETED'])
```

Isso garante que o sino mostre a notificacao de musica pronta independente do status final.

#### 2. Substituir criptografia Web Push customizada pelo `web-push`

A funcao `send-push-notification` usa uma implementacao customizada de criptografia AES-128-GCM + VAPID que provavelmente tem bugs. Substituir pela biblioteca `web-push` (mesma usada no `send-review-reminder`) que ja funciona:

- Importar `web-push` via esm.sh
- Usar `webPush.setVapidDetails()` e `webPush.sendNotification()`
- Remover todo o codigo de criptografia manual (~250 linhas)
- Manter o mesmo fluxo de logging e tratamento de erros

#### 3. Adicionar push para primeira versao carregada

Quando apenas 1 versao e carregada (antes de ambas estarem prontas), enviar um push informando que a primeira versao ja esta disponivel:

```
"Uma versao da sua musica ja esta disponivel! Estamos finalizando a segunda."
```

#### 4. Adicionar funcao de teste de push

Criar um botao no painel admin que envia um push de teste para o admin verificar se as notificacoes estao funcionando.

---

### Detalhes Tecnicos

**Arquivos modificados:**
- `supabase/functions/send-push-notification/index.ts` - Reescrever usando `web-push` library
- `src/components/NotificationCenter.tsx` - Incluir status `COMPLETED` na query de musicas prontas
- `src/pages/AdminDashboard.tsx` - Adicionar push na primeira versao + botao de teste push

**Impacto:** Nenhuma mudanca no banco de dados. Apenas correcoess de logica no frontend e reescrita da funcao de push.

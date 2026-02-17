

## Plano: Corrigir Push Notifications para funcionar com tela apagada

### Problema Raiz Identificado

O problema principal e que existem **DOIS service workers em conflito**:

1. **VitePWA** (vite-plugin-pwa) gera automaticamente um service worker Workbox que e registrado pelo navegador
2. **`public/sw.js`** contem os handlers de push (`push` event, `notificationclick`) mas **NAO e o service worker ativo** - ele nunca e importado pelo SW gerado pelo VitePWA

Resultado: quando o FCM entrega o push ao navegador, o service worker ativo (Workbox) **nao tem nenhum listener de push**, entao a notificacao e descartada silenciosamente. Por isso o "Testar Push" mostra status 201 (entregue ao FCM) mas nada aparece na tela.

### Solucao

Injetar os handlers de push dentro do service worker gerado pelo VitePWA usando a opcao `importScripts`.

#### Passo 1: Renomear `public/sw.js` para `public/sw-push.js`

Renomear o arquivo para evitar conflito de nomes com o SW gerado automaticamente pelo VitePWA.

#### Passo 2: Atualizar `vite.config.ts`

Adicionar `importScripts: ['/sw-push.js']` na configuracao workbox do VitePWA. Isso faz o SW gerado carregar os handlers de push:

```typescript
workbox: {
  importScripts: ['/sw-push.js'],
  navigateFallbackDenylist: [/^\/~oauth/],
  // ... resto da config existente
}
```

#### Passo 3: Limpar `public/sw-push.js`

Remover os listeners de `install` e `activate` do arquivo (que conflitam com o Workbox) e manter apenas:
- `push` event listener
- `notificationclick` event listener

#### Passo 4: Limpar subscricoes duplicadas

O banco de dados mostra o mesmo endpoint FCM registrado para **5 usuarios diferentes** - isso indica que o mesmo dispositivo esta criando subscricoes para cada login sem limpar as anteriores. Adicionar logica para desativar subscricoes antigas do mesmo endpoint ao criar uma nova.

### Detalhes Tecnicos

**Arquivos modificados:**
- `public/sw.js` → renomear para `public/sw-push.js` (remover install/activate)
- `vite.config.ts` - adicionar `importScripts` e `navigateFallbackDenylist`
- `src/hooks/usePushNotifications.tsx` - limpar subscricoes duplicadas no subscribe

**Por que isso resolve:**
- O Workbox SW sera o unico registrado (sem conflito)
- `importScripts` carrega os handlers de push DENTRO do SW ativo
- Quando o FCM entrega o push, o listener `push` estara presente no SW ativo
- O `showNotification()` sera chamado corretamente, exibindo a notificacao mesmo com tela apagada

**Impacto:** Nenhuma mudanca no banco de dados. Apenas configuracao de build e ajuste de arquivos estaticos.


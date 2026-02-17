// ===============================
// Service Worker - Push TEST MODE
// ===============================

const SW_VERSION = "2.5.1-TEST";

console.log("[SW] Arquivo carregado | versão:", SW_VERSION);

// ===============================
// PUSH EVENT
// ===============================
self.addEventListener("push", function (event) {
  console.log("[SW] PUSH RECEBIDO:", event);

  let data = {
    title: "Criando Músicas",
    body: "Push recebido (sem payload)",
    icon: "/favicon.png",
    badge: "/favicon.png",
    url: "/",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      console.log("[SW] Payload JSON:", parsed);

      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        icon: parsed.icon || data.icon,
        badge: parsed.badge || data.badge,
        url: parsed.url || "/",
      };
    } catch (e) {
      const text = event.data.text();
      console.log("[SW] Payload TEXTO:", text);

      data.body = text;
    }
  } else {
    console.warn("[SW] Push sem event.data");
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [100, 50, 100],
      tag: "criando-musicas-push-test",
      renotify: true,
      data: { url: data.url },
    }),
  );
});

// ===============================
// CLICK NA NOTIFICAÇÃO
// ===============================
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});

// ===============================
// INSTALL
// ===============================
self.addEventListener("install", function (event) {
  console.log("[SW] Installing...");
  self.skipWaiting();
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener("activate", function (event) {
  console.log("[SW] Activating...");
  event.waitUntil(clients.claim());
});

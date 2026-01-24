// Service Worker for Push Notifications
// Version: 2.4.0 - Audio sample auto-description + video delete fix
const SW_VERSION = '2.4.0';

self.addEventListener('push', function(event) {
  console.log('[SW v' + SW_VERSION + '] Push received');
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Criando Músicas',
      body: event.data.text(),
      icon: '/favicon.png',
      badge: '/favicon.png'
    };
  }

  const options = {
    body: data.body || 'Nova notificação',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      order_id: data.data?.order_id
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/favicon.png'
      }
    ],
    tag: 'criando-musicas-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Criando Músicas', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Placeholder for syncing any pending actions when back online
  console.log('Syncing notifications...');
}

// Force update on new version
self.addEventListener('install', function(event) {
  console.log('[SW v' + SW_VERSION + '] Installing...');
  // Skip waiting immediately to activate new version
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW v' + SW_VERSION + '] Activating...');
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      clients.claim(),
      // Clear ALL old caches to force fresh content
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('[SW v' + SW_VERSION + '] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Notify all clients to reload
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        clientList.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
        });
      })
    ])
  );
});

self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
  console.log('[Service Worker] Activate');
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});

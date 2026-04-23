const CACHE_NAME = 'chronos-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        );
      })
    ])
  );
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

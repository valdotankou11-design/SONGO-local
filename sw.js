/* ══════════════════════════════════════
   SONGO PWA — Service Worker
   Cache-first strategy for offline play
   ══════════════════════════════════════ */

const CACHE_NAME = 'songo-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap'
];

// ── Installation : mise en cache des ressources ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(
        // Les Google Fonts peuvent échouer en offline, on les ignore si ça rate
        ASSETS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Impossible de mettre en cache :', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyage des anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : cache-first, réseau en fallback ──
self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Ne mettre en cache que les réponses valides
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fallback HTML si tout échoue
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

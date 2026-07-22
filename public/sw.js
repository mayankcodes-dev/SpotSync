// SpotSync Service Worker v2.0.0
const STATIC_CACHE  = 'spotsync-static-v2';
const DYNAMIC_CACHE = 'spotsync-dynamic-v2';

// Assets to pre-cache on SW install
const STATIC_ASSETS = [
  '/',
  '/spots',
  '/stylesheets/app.css',
  '/stylesheets/stars.css',
  '/javascripts/validateForms.js',
  '/javascripts/clusterMap.js',
  '/javascripts/showPageMap.js',
  '/javascripts/pwa.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Cache miss:', url, err))
        )
      )
    )
  );
  self.skipWaiting(); // Activate immediately
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2...');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== DYNAMIC_CACHE)
          .map((n) => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET over http(s)
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Never intercept auth/form routes
  if (['/login', '/register', '/logout'].includes(url.pathname)) return;

  const isStatic =
    url.pathname.startsWith('/stylesheets/') ||
    url.pathname.startsWith('/javascripts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isStatic) {
    // Cache-First: serve from cache, fall back to network and update cache
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(STATIC_CACHE).then((c) => c.put(request, resp.clone()));
          }
          return resp;
        });
      })
    );
  } else if (isHTML) {
    // Network-First: always try network, cache result, fallback to cached
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, resp.clone()));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'SpotSync', body: 'New spot added nearby!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
    })
  );
});

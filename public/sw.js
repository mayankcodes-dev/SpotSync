// SpotSync Service Worker v1.0.0
const CACHE_NAME = 'spotsync-v1';
const STATIC_CACHE = 'spotsync-static-v1';
const DYNAMIC_CACHE = 'spotsync-dynamic-v1';

// Assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/campgrounds',
  '/stylesheets/app.css',
  '/stylesheets/stars.css',
  '/javascripts/validateForms.js',
  '/javascripts/clusterMap.js',
  '/javascripts/showPageMap.js',
  '/javascripts/pwa.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
];

// ─── Install Event ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing SpotSync Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // Use addAll with individual error handling to avoid total failure
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`[SW] Failed to cache ${url}:`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activate Event ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SpotSync Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// ─── Fetch Event ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE — let these go to server)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Skip API and form submission paths
  const skipPaths = ['/login', '/register', '/logout'];
  if (skipPaths.some((p) => url.pathname === p)) return;

  // Strategy: Cache-First for static assets, Network-First for HTML pages
  if (
    url.pathname.startsWith('/stylesheets/') ||
    url.pathname.startsWith('/javascripts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('bootstrapcdn.com')
  ) {
    // Cache-First
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        });
      })
    );
  } else if (request.headers.get('accept')?.includes('text/html')) {
    // Network-First for HTML (always fresh from server, fallback to cache)
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Offline fallback
            return caches.match('/');
          });
        })
    );
  }
});

// ─── Push Notifications (placeholder) ───────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'SpotSync', body: 'New campground added!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
    })
  );
});

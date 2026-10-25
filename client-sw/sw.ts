/**
 * client-sw/sw.ts — SpotSync Service Worker v2.0.0
 * Compiled to: public/sw.js  (via: npm run build:sw)
 */

const STATIC_CACHE = 'spotsync-static-v2';
const DYNAMIC_CACHE = 'spotsync-dynamic-v2';

const STATIC_ASSETS: string[] = [
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

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err: Error) => console.warn('[SW] Cache miss:', url, err)),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== DYNAMIC_CACHE)
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (['/login', '/register', '/logout'].includes(url.pathname)) return;

  const isStatic =
    url.pathname.startsWith('/stylesheets/') ||
    url.pathname.startsWith('/javascripts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  const isHTML = (request.headers.get('accept') ?? '').includes('text/html');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(STATIC_CACHE).then((c) => c.put(request, resp.clone()));
          }
          return resp;
        });
      }),
    );
  } else if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, resp.clone()));
          }
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const root = await caches.match('/');
          return root ?? new Response('Offline', { status: 503 });
        }),
    );
  }
});

self.addEventListener('push', (event: PushEvent) => {
  interface PushData { title: string; body: string; }
  const data: PushData = (event.data?.json() as PushData | null) ?? {
    title: 'SpotSync',
    body: 'New spot added nearby!',
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
    }),
  );
});

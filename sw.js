/* ═══════════════════════════════════════════════════
   WhatsApp Shop BF — Service Worker
   Stratégie : Cache-first pour assets, Network-first
   pour Firebase/API, offline fallback sur index.html
═══════════════════════════════════════════════════ */

const CACHE = 'shopbf-v1';

/* Assets à précacher au install */
const PRECACHE = [
  '/',
  '/index.html',
];

/* Domaines à NE JAMAIS mettre en cache (Firebase, WA…) */
const BYPASS = [
  'firebaseio.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'googleapis.com',
  'wa.me',
  'api.whatsapp.com',
  'anthropic.com',
];

/* ── INSTALL : précacher le shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE : purger les vieux caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH : stratégie selon la ressource ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  /* 1. Ignorer non-GET et requêtes externes sensibles */
  if (request.method !== 'GET') return;
  if (BYPASS.some(d => url.hostname.includes(d))) return;
  if (url.protocol === 'chrome-extension:') return;

  /* 2. Navigation (HTML) → Network-first, fallback cache */
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  /* 3. Tout le reste → Cache-first, update en arrière-plan */
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

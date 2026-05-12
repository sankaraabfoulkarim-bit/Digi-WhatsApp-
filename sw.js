const CACHE = 'wshop-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({error:'offline'}), {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});

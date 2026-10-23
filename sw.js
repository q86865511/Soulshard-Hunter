// Service Worker (round16/7.4): offline support for the DEPLOYED game.
//
// Dev safety: the local dev workflow relies on a NO-CACHE static server (tools/serve.mjs) so
// edited ES modules are never stale. index.html therefore registers this SW ONLY in production
// (non-localhost). The strategy below is also staleness-aware so a production deploy is never
// served stale code:
//   - code (navigation / .js / .mjs / .css / .json / .html) -> NETWORK-FIRST (fresh every load;
//     cache is only an offline fallback). This matches the repo's "no stale modules" philosophy.
//   - heavy static assets (audio / images / fonts) -> CACHE-FIRST (fast, offline-capable).
// Bump CACHE to force-evict everything after a deploy if ever needed.
const CACHE = 'soulshard-v2.2';
const BUILD = 'r33-v2.2';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;     // only same-origin
  if (url.pathname.startsWith('/api')) return;          // API + cloud always hit the network

  const isCode = req.mode === 'navigate' || /\.(?:js|mjs|css|json|html)$/.test(url.pathname);
  if (isCode) {
    // R33: bypass both the browser HTTP cache and older CDN objects (4h max-age).
    // Cache under the original URL so offline fallback keeps stable module keys.
    const fresh = new URL(req.url);
    fresh.searchParams.set('__build', BUILD);
    e.respondWith(
      fetch(fresh.href, { cache: 'no-store', credentials: req.credentials })
        .then((res) => { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html'))),
    );
  } else {
    // cache-first for heavy static assets (mp3 soundtrack, images, fonts)
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); return res; })),
    );
  }
});

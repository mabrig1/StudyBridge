// Only the app shell is cached. Student notes, AI answers, API responses, and
// other pages sharing this origin must never be written to the offline cache.
const CACHE_PREFIX = 'studybridge-static-';
const CACHE = `${CACHE_PREFIX}v2`;
const APP_ROOT = new URL('./', self.registration.scope);
const INDEX = new URL('index.html', APP_ROOT);
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];
const SHELL_URLS = new Set(SHELL.map(path => new URL(path, APP_ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_ROOT.href)) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith(new URL('api/', APP_ROOT).pathname)) return;

  if (request.mode === 'navigate') {
    // Do not intercept or cache unrelated HTML (including potentially private pages).
    if (url.pathname !== APP_ROOT.pathname && url.pathname !== INDEX.pathname) return;
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(INDEX.href)) || Response.error()));
    return;
  }

  // Restrict the cache to explicitly versioned public assets. Other resources
  // go straight to the network and remain outside service-worker storage.
  if (SHELL_URLS.has(url.href)) {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
  }
});

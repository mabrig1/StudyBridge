const CACHE = "studybridge-static-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.url.includes("/api/") || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(response => {
      if (response.ok) { const cloned = response.clone(); caches.open(CACHE).then(cache => cache.put("./index.html", cloned)); }
      return response;
    }).catch(async () => (await caches.match(req)) || caches.match("./index.html")));
  } else {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});

const CACHE = "elbisne-v1";
const STATIC_ASSETS = ["/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  event.waitUntil(clients.claim());
});

const networkFirst = (request, fallback) =>
  fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || fallback)
    );

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigation: network-first, fallback to cache, then root
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, caches.match("/")));
    return;
  }

  // JS chunks: network-first to prevent stale chunk errors
  if (url.pathname.startsWith("/_next/static/chunks/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (images, CSS, fonts, etc.): cache-first with network update
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.destination === "image") return caches.match("/images/placeholder.svg");
          return new Response("Offline", { status: 503 });
        });
      return cached || fetchPromise;
    })
  );
});

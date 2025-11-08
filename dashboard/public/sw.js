const CACHE = "yrd-v1";
const ASSETS = [ "/", "/index.html", "/manifest.json" ];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.origin === location.origin) {
    e.respondWith(caches.match(request).then(r => r || fetch(request)));
    return;
  }
  if (request.method === "GET") {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const network = fetch(request).then(resp => {
          if (resp && resp.ok) cache.put(request, resp.clone());
          return resp;
        }).catch(() => null);
        const cached = await caches.match(request);
        return cached || network || new Response("", { status: 504 });
      })
    );
  }
});

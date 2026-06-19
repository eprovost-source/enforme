/* Service worker — cache app shell + images d'exercices (offline) */
const CACHE = "enforme-v1";
const SHELL = [
  "./index.html", "./styles.css", "./app.js", "./data.js",
  "./manifest.webmanifest", "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Images d'exercices (CDN) : cache-first, garde hors-ligne après 1re visite
  if (url.hostname.includes("jsdelivr.net")) {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => hit ||
        fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; })
          .catch(() => hit)))
    );
    return;
  }
  // App shell : network-first avec repli cache (toujours à jour quand en ligne)
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
  }
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("./index.html");
  }));
});

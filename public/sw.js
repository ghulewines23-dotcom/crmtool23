/* Serene CRM service worker
 * - Push notifications (show + click-through + open app)
 * - In-app chime broadcast so open pages ring & refresh the bell
 * - Instant takeover of new deployments so updates appear on mobile
 */
const CACHE = "serene-crm-v3";
const CORE = ["/", "/icons/icon-192x192.png", "/icons/icon-512x512.png", "/icons/icon-maskable-512x512.png"];
const PRECACHE_PATHS = ["./", "./index.html", "./manifest.webmanifest"].filter((p) => !CORE.includes(p));

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...CORE, ...PRECACHE_PATHS]))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      // Tell every open tab that a new version took over so it can reload.
      .then(() =>
        self.clients
          .matchAll({ type: "window", includeUncontrolled: true })
          .then((clients) => clients.forEach((client) => client.postMessage({ type: "APP_UPDATED" })))
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ── Push notifications ──────────────────────────────────────────────── */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = {};
  }

  const title = data.title || "Serene CRM";
  const options = {
    body: data.body || "You have an update in Serene CRM.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-maskable-512x512.png",
    vibrate: data.vibrate || [180, 90, 180],
    silent: false,
    renotify: true,
    tag: data.tag || "serene-reminder",
    data: { url: data.url || "/", type: data.type || "general" },
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        // Let open pages play an in-app chime + refresh the notification bell.
        clients.forEach((client) =>
          client.postMessage({ type: "PUSH_RECEIVED", title, body: data.body || "", url: data.url || "/" })
        );
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            if (new URL(client.url).origin === self.location.origin) {
              if (client.navigate && client.url !== self.location.origin + url) {
                return client.navigate(url).then(() => client.focus());
              }
              return client.focus();
            }
          } catch (err) {
            // ignore malformed client URLs
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

/* ── Fetch: network-first with offline fallback ───────────────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: try the network first so freshly deployed content
  // shows up immediately. Fall back to cache only when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Hashed build assets + icons: cache-first, revalidate in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const update = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || update;
    })
  );
});
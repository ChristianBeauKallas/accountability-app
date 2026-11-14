// Retired service worker. The app no longer uses a service worker; this
// replaces the old PWA cache so existing installs stop serving stale content.
// On activation it deletes all caches, unregisters itself, and reloads any
// open tabs so they pick up the live app.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}
      try {
        await self.registration.unregister();
      } catch (e) {}
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch (e) {}
    })(),
  );
});

// Never serve from cache while this is still active — always hit the network.
self.addEventListener("fetch", () => {});

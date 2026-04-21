// Self-destruct service worker.
// This app used to register as a PWA. It no longer is — it's a plain web
// page. Any browser that previously registered the old sw.js will fetch this
// new one, install it, and on activation it clears every cache this site
// owned and unregisters itself. After one reload the user is back on a plain
// web page with no service worker in the way.
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
        } catch {}
        try {
            await self.registration.unregister();
        } catch {}
    })());
});

// Passthrough fetch — never intercept, never serve cached content.
self.addEventListener('fetch', () => {});

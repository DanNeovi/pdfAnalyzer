// Self-destruct service worker.
// This app used to register as a PWA (the old SW was cache-first and ended
// up serving a stale app.js that broke Load PDF). It is no longer a PWA.
// This worker:
//   1. Takes over immediately (skipWaiting + clients.claim) so it replaces
//      the old cache-first worker on the SAME reload the user does.
//   2. Deletes every cache this site owned.
//   3. Forces every controlled tab to reload via network so the user ends
//      up on the live HTML/JS, not the stale copy.
//   4. Unregisters itself. After that, there is no SW — it's a plain page.
self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
        } catch {}
        try { await self.clients.claim(); } catch {}
        try {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(c => { try { c.navigate(c.url); } catch {} });
        } catch {}
        try { await self.registration.unregister(); } catch {}
    })());
});

// Network-only passthrough. Never serve cached content.
self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 504 })));
});

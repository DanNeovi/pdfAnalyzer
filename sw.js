// DraftAnnotator Service Worker — caches CDN libs for offline use.
// v12: drop the Tailwind CDN preload — it 404s when blocked by ad-blockers
// and its CORS policy rejects cross-origin preloads from GitHub Pages,
// triggering "Failed to execute 'addAll' on 'Cache'" errors on every install.
// Tailwind is now loaded inline by the HTML and works fine without SW caching.
const CACHE_NAME = 'draftannotator-v14';
const APP_SHELL = [
    './',
    './pdf-annotator.html',
    './app.js',
    './manifest.json'
];
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

// Install: pre-cache the app shell, then attempt each CDN asset individually.
// Using addAll() aborts the whole install if ANY asset fails — that's why the
// browser was showing "Request failed" and never activating the SW.
// Individual fetch().catch() makes each asset opt-in; one failure doesn't
// kill the entire cache.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // App shell must all succeed, these are same-origin and reliable.
            await cache.addAll(APP_SHELL);
            // CDN resources: best-effort. Skip silently on failure so the
            // SW still installs and handles same-origin requests.
            await Promise.all(
                CDN_ASSETS.map(async url => {
                    try {
                        const resp = await fetch(url, { mode: 'no-cors' });
                        // Opaque responses are fine to cache even if we can't read them.
                        await cache.put(url, resp);
                    } catch {
                        // Ad-blocker, offline, or CORS — ignore.
                    }
                }),
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: cache-first for known assets, network-first for everything else
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // For CDN assets and app shell: serve from cache, fall back to network
    const isCached = CDN_ASSETS.includes(url) ||
        event.request.destination === 'document' ||
        url.endsWith('pdf-annotator.html') ||
        url.endsWith('app.js');

    if (isCached) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                // Return cached version immediately
                if (cached) {
                    // Update cache in background (stale-while-revalidate)
                    event.waitUntil(
                        fetch(event.request.clone()).then(resp => {
                            if (resp.ok || resp.type === 'opaque') {
                                return caches.open(CACHE_NAME).then(c => c.put(event.request, resp));
                            }
                        }).catch(() => {})
                    );
                    return cached;
                }
                // Not cached yet — fetch and cache
                return fetch(event.request).then(resp => {
                    const clone = resp.clone();
                    event.waitUntil(
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
                    );
                    return resp;
                });
            }).catch(() => {
                // Total offline fallback for navigation
                if (event.request.destination === 'document') {
                    return caches.match('./pdf-annotator.html');
                }
            })
        );
        return;
    }

    // All other requests (user PDFs, etc): network only, no caching
});

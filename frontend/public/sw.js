// Minimal Service Worker for PWA Criteria
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('gatepass-store').then((cache) => cache.addAll([
            '/',
            '/index.html',
        ])),
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request)),
    );
});

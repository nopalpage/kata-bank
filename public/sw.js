const CACHE_NAME = 'lexica-cache-v1'
const URLS_TO_CACHE = [
    '/',
    '/auth',
    '/favicon.ico',
]

// Install event: cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Intentionally ignore failures for external/missing assets
            return cache.addAll(URLS_TO_CACHE).catch(err => console.warn('PWA Cache install skipped some assets', err))
        })
    )
    self.skipWaiting()
})

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
    self.clients.claim()
})

// Fetch event: Network-first for APIs and HTML, Cache-first for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Bypass API calls (termasuk Supabase) and POST requests
    if (request.method !== 'GET' || url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
        return
    }

    // Handle static assets (CSS, JS, Fonts, Images) -> Cache First, then Network
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2|woff|ttf|ico)$/)) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, fetchRes.clone())
                        return fetchRes
                    })
                })
            })
        )
        return
    }

    // Handle HTML rendering -> Network First, then Cache fallback
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    )
})

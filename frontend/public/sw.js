const CACHE_NAME = 'urban-harvest-v6';
const API_CACHE_NAME = 'urban-harvest-api-v6';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network FIRST, then cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests - Network first, NO cache fallback for fresh data
  if (url.pathname.includes('/api/events')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('Returning cached API response');
              return cachedResponse;
            }
            return new Response(JSON.stringify({ success: false, data: [], error: 'Offline' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
  }
  // HTML navigation
  else if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
  // Static assets - Cache first
  else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
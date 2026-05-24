const CACHE_NAME = 'urban-harvest-v1';
const API_CACHE_NAME = 'urban-harvest-api-v1';
const urlsToCache = ['/', '/index.html', '/offline.html'];

// Cache API responses
self.addEventListener('fetch', (event) => {
  // Cache API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => {
          return cache.match(event.request);
        });
      })
    );
  } else {
    // Cache static assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
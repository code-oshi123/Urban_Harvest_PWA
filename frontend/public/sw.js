const CACHE_NAME = 'urban-harvest-v8';
const API_CACHE_NAME = 'urban-harvest-api-v8';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico'
];

// Install event - Pre-cache essential offline files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Pre-caching assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Failed to pre-cache assets:', err))
  );
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

// Fetch event - Network FIRST, then cache for API, Cache FIRST for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests - Network first, cache fallback
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

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  let data = { title: '🌱 Urban Harvest Hub', body: 'New update available!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = { title: '🌱 Urban Harvest Hub', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/android-chrome-192x192.png',
    badge: data.badge || '/icons/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();
  
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Look for an existing open window/tab of the app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
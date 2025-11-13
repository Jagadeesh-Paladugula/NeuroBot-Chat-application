/**
 * Service Worker for PWA support
 * Provides offline functionality and caching
 * 
 * Note: This is a basic service worker. For production, consider using
 * workbox or a similar library for more advanced features.
 */

// Service Worker must be in root directory for scope
// This file should be moved to public/sw.js during build or served from root
const CACHE_NAME = 'neurobot-chat-v1';
const STATIC_CACHE_NAME = 'neurobot-static-v1';
const DYNAMIC_CACHE_NAME = 'neurobot-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(cacheName) {
            return (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME
            );
          })
          .map(function(cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests (they should always go to network)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/graphql')) {
    return;
  }

  // Skip Socket.io requests
  if (url.pathname.startsWith('/socket.io')) {
    return;
  }

  // Cache strategy: Cache First for static assets, Network First for HTML
  if (request.method === 'GET') {
    if (request.destination === 'document') {
      // Network First for HTML
      event.respondWith(
        fetch(request)
          .then(function(response) {
            if (response.ok) {
              var responseClone = response.clone();
              caches.open(DYNAMIC_CACHE_NAME).then(function(cache) {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(function() {
            return caches.match(request).then(function(cachedResponse) {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to index.html for SPA routing
              return caches.match('/index.html');
            });
          })
      );
    } else {
      // Cache First for static assets
      event.respondWith(
        caches.match(request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(function(response) {
            if (response.ok) {
              var responseClone = response.clone();
              caches.open(STATIC_CACHE_NAME).then(function(cache) {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
      );
    }
  }
});

// Message event - handle messages from the app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push event - handle push notifications (if implemented)
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'NeuroBot Chat';
  var options = {
    body: data.body || 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'message',
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data ? event.notification.data.url || '/' : '/')
  );
});


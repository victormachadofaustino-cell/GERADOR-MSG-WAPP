// service-worker.js

var CACHE_STATIC_NAME = 'agenda-wapp-static-v1.9';
var CACHE_DYNAMIC_NAME = 'agenda-wapp-dynamic-v1.9';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/src/app.js',
  '/src/services/firebase.js',
  '/src/services/helpers.js',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Instalando v1.9...');
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function(cache) {
        return cache.addAll(STATIC_FILES).catch(function(err) {
          console.error('[Service Worker] Falha ao cachear arquivos:', err);
        });
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Ativando v1.9...');
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
    .then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);
  var request = event.request;

  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }

  if (STATIC_FILES.indexOf(requestUrl.pathname) !== -1) {
    event.respondWith(
      caches.match(request).then(function(response) {
        return response || fetch(request);
      })
    );
    return;
  }

  if (requestUrl.host.indexOf('googleapis.com') !== -1 ||
      requestUrl.host.indexOf('firebaseapp.com') !== -1 ||
      requestUrl.host.indexOf('gstatic.com') !== -1) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          return caches.open(CACHE_DYNAMIC_NAME).then(function(cache) {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      })
      .catch(function() {
        return caches.match(request).then(function(response) {
          return response || new Response(null, {
            status: 503,
            statusText: 'Service Unavailable (Offline)'
          });
        });
      })
  );
});
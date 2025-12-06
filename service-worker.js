// service-worker.js
// Service Worker para PWA - Gerador de Agenda Wapp

const CACHE_STATIC_NAME = 'agenda-wapp-static-v1.8';
const CACHE_DYNAMIC_NAME = 'agenda-wapp-dynamic-v1.8';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/src/main.js',
  '/src/services/firebase-api.js',
  '/src/services/helpers.js',
  '/src/modules/dom-elements.js',
  '/src/modules/events.js',
  '/src/modules/generator.js',
  '/src/modules/settings.js',
  '/src/modules/templates.js',
  '/manifest.json'
];

// 1. INSTALAÇÃO
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Instalando v1.8...');
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

// 2. ATIVAÇÃO
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Ativando v1.8...');
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

// 3. FETCH
self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);
  var request = event.request;

  // Ignora requisições não HTTP(s)
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }

  // Cache-First para arquivos estáticos
  if (STATIC_FILES.indexOf(requestUrl.pathname) !== -1) {
    event.respondWith(
      caches.match(request).then(function(response) {
        return response || fetch(request);
      })
    );
    return;
  }

  // Network-Only para Firebase
  if (requestUrl.host.indexOf('googleapis.com') !== -1 ||
      requestUrl.host.indexOf('firebaseapp.com') !== -1 ||
      requestUrl.host.indexOf('gstatic.com') !== -1) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-First com Cache Fallback
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
// service-worker.js
// Baseado na Workbox e estratégias de Service Worker do Firebase

const CACHE_STATIC_NAME = 'agenda-wapp-static-v1.3'; // <<-- Versão Atualizada
const CACHE_DYNAMIC_NAME = 'agenda-wapp-dynamic-v1.3'; // <<-- Versão Atualizada
const CACHE_FIRESTORE_DATA = 'agenda-wapp-firestore-data';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/src/main.js', // O novo ponto de entrada JS
  '/src/services/firebase-api.js',
  '/src/services/helpers.js',
  '/src/modules/dom-elements.js',
  '/src/modules/events.js',
  '/src/modules/generator.js',
  '/src/modules/settings.js',
  '/src/modules/templates.js',
  '/manifest.json',
  // Ícones (Certifique-se de que existem na pasta icons/)
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Instalação: Salva todos os arquivos estáticos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando e armazenando estáticos...');
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(cache => {
        return cache.addAll(STATIC_FILES).catch(err => {
            console.error('[Service Worker] Falha ao armazenar alguns arquivos:', err);
        });
      })
  );
});

// 2. Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando e limpando caches antigos...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME && key !== CACHE_FIRESTORE_DATA) {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Garante que a Service Worker assuma o controle imediatamente
  return self.clients.claim();
});


// 3. Estratégia de Cache
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // A) Cache-First para arquivos estáticos (app shell)
  if (STATIC_FILES.includes(requestUrl.pathname)) {
    event.respondWith(caches.match(event.request));
    return;
  }
  
  // B) Network-Only para requisições de autenticação e functions
  if (requestUrl.host.includes('googleapis.com') || 
      requestUrl.host.includes('firebaseapp.com') && !event.request.url.includes('firestore')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // C) Estratégia Stale-While-Revalidate para dados dinâmicos (Firestore/APIs)
  event.respondWith(
    caches.match(event.request).then(response => {
      // Se houver cache, retorna, mas busca a versão mais nova em segundo plano.
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Atualiza o cache dinâmico com a nova resposta
        return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(err => {
          // Se a rede falhar, o SDK do Firestore lida com a falta de dados.
          // Aqui, apenas registramos o erro de rede.
          console.log('[Service Worker] Falha na rede.');
          throw err; // Rejeita para que a aplicação saiba que falhou.
      });
      
      // Retorna a resposta do cache ou a promessa de rede
      return response || fetchPromise;
    })
  );
});
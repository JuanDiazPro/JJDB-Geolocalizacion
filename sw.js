/* =========================================================================
   sw.js — Service Worker de GeoConsciente
   Tema 6.3 · PWA · Juan Jose Diaz Barroso
   Precachea el App Shell (incluye ./geo-helper.js) y sirve offline.
   ========================================================================= */

var CACHE_VERSION = 'geoconsciente-v2';
var APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './geo-helper.js',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png'
];

/* Instalación: guarda el App Shell completo, geo-helper.js incluido. */
self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/* Activación: elimina versiones anteriores del caché. */
self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches
      .keys()
      .then(function (claves) {
        return Promise.all(
          claves.map(function (clave) {
            if (clave !== CACHE_VERSION) {
              return caches.delete(clave);
            }
            return Promise.resolve(false);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* Estrategia:
   - Navegación: red primero, con respaldo en index.html cacheado.
   - Recursos: caché primero, y se actualiza en segundo plano. */
self.addEventListener('fetch', function (evento) {
  var peticion = evento.request;

  if (peticion.method !== 'GET') {
    return;
  }

  var url;
  try {
    url = new URL(peticion.url);
  } catch (error) {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then(function (respuesta) {
          var copia = respuesta.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(peticion, copia);
          });
          return respuesta;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then(function (enCache) {
      var actualizacion = fetch(peticion)
        .then(function (respuesta) {
          if (respuesta && respuesta.ok) {
            var copia = respuesta.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(peticion, copia);
            });
          }
          return respuesta;
        })
        .catch(function () {
          return enCache;
        });

      return enCache || actualizacion;
    })
  );
});

/* =========================================================
   Service Worker · DJ WILMER
   - El shell se cachea para arranque offline
   - API de metadatos y audio: siempre por red
   ========================================================= */
var CACHE = 'dj-wilmer-zeno-v1';
var SHELL = [
  './',
  './index.html',
  './css/styles.css?v=1',
  './js/config.js?v=1',
  './js/store.js?v=1',
  './js/theme.js?v=1',
  './js/api.js?v=1',
  './js/player.js?v=1',
  './js/ui.js?v=1',
  './js/app.js?v=1',
  './assets/img/bg-girl.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(
        SHELL.map(function (url) {
          return c.add(new Request(url, { cache: 'reload' })).catch(function () { });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/** Audio en vivo y metadatos: siempre por red, nunca cacheados. */
function isLive(url) {
  var p = url.pathname;
  return p.indexOf('/api.zeno.fm') > -1 || p.indexOf('/stream.zeno.fm') > -1;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  /* 1) Audio y metadatos: nunca se cachean */
  if (isLive(url) || url.pathname.indexOf('/api.') > -1 || url.hostname.indexOf('zeno.fm') > -1) {
    return;
  }

  /* 2) Navegacion: red primero, respaldo offline */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  /* 3) Recursos del mismo origen: cache primero con revalidacion */
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  /* 4) Externos (logo ibb, fuentes): directo a red */
});
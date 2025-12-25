const SW_VERSION = 'v1.3.10';
const CACHE = 'EduMúsic-' + SW_VERSION;
const META_CACHE = 'EduMúsic-meta';
const SCOPE_URL = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : (SCOPE_URL.pathname + '/');
let IS_FRESH_VERSION = false; // Se pone a true cuando cambia la versión
const CRITICAL_SCRIPTS = new Set([
  'js/score-service.js',
  'js/score-service.js?v=2',
]);

const ASSETS = [
  './',
  'index.html',
  'offline.html',
  'css/style.css',
  'css/piano.css',
  'css/rhythm-dictation.css',
  'css/melody-dictation.css',
  'css/melo-rhythm-dictation.css',
  'css/pitch-direction.css',
  'css/pitch-height.css',
  'css/duration-choice.css',
  'css/word-guess.css',
  'css/quiz.css',
  'css/piano-hero.css',
  'js/app.js',
  'js/audio-settings.js',
  'js/index-tags.js',
  'js/i18n/index.js',
  'js/i18n/gamehub.js',
  'js/i18n/memory.js',
  'js/i18n/hud.js',
  'js/i18n/game.js',
  'js/i18n/compas.js',
  'js/i18n/melody.js',
  'js/i18n/rhythm.js',
  'js/i18n/rhythm-dictation.js',
  'js/i18n/clef.js',
  'js/i18n/recursos.js',
  'js/i18n/offline.js',
  'js/i18n/piano.js',
  'js/i18n/melody-dictation.js',
  'js/i18n/melo-rhythm-dictation.js',
  'js/i18n/pitch-direction.js',
  'js/i18n/pitch-height.js',
  'js/i18n/duration-choice.js',
  'js/i18n/word-guess.js',
  'js/i18n/quiz.js',
  'js/i18n/rankings.js',
  'js/i18n/piano-hero.js',
  'manifest.json',
  'html/game.html',
  'html/solmi.html',
  'html/solmila.html',
  'html/solmilado.html',
  'html/solmiladore.html',
  'html/solmiladorefa.html',
  'html/todas.html',
  'html/memory.html',
  'html/compas.html',
  'html/melody.html',
  'html/rhythm.html',
  'html/rhythm-dictation.html',
  'html/melody-dictation.html',
  'html/melo-rhythm-dictation.html',
  'html/pitch-direction.html',
  'html/pitch-height.html',
  'html/duration-choice.html',
  'html/clave-sol.html',
  'html/piano.html',
  'html/piano-hero.html',
  'html/recursos.html',
  'html/palabras-musicales.html',
  'html/quiz.html',
  'html/rankings.html',
  'js/game.js',
  'js/memory.js',
  'js/compas.js',
  'js/melody.js',
  'js/rhythm.js',
  'js/rhythm-dictation.js',
  'js/melody-dictation.js',
  'js/melo-rhythm-dictation.js',
  'js/score-service.js',
  'js/pitch-direction.js',
  'js/pitch-height.js',
  'js/duration-choice.js',
  'js/clave_sol.js',
  'js/piano.js',
  'js/quiz.js',
  'js/word-guess.js',
  'js/piano-hero.js',
  'js/game-over-overlay.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/audio/piano.ogg',
  'assets/audio/violin.ogg',
  'assets/audio/trompeta.ogg',
  'assets/audio/flute.ogg',
  'assets/audio/guitar.ogg',
  'assets/audio/bongos.ogg',
  'assets/audio/error.mp3',
  'assets/audio/winner.mp3',
  'assets/audio/caja.mp3',
  'assets/piano/key01.ogg',
  'assets/piano/key02.ogg',
  'assets/piano/key03.ogg',
  'assets/piano/key04.ogg',
  'assets/piano/key05.ogg',
  'assets/piano/key06.ogg',
  'assets/piano/key07.ogg',
  'assets/piano/key08.ogg',
  'assets/piano/key09.ogg',
  'assets/piano/key10.ogg',
  'assets/piano/key11.ogg',
  'assets/piano/key12.ogg',
  'assets/piano/key13.ogg',
  'assets/piano/key14.ogg',
  'assets/piano/key15.ogg',
  'assets/piano/key16.ogg',
  'assets/piano/key17.ogg',
  'assets/piano/key18.ogg',
  'assets/piano/key19.ogg',
  'assets/piano/key20.ogg',
  'assets/piano/key21.ogg',
  'assets/piano/key22.ogg',
  'assets/piano/key23.ogg',
  'assets/piano/key24.ogg'
];

function toScopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}
const SCOPED_ASSETS = ASSETS.map(toScopeUrl);
const OFFLINE_URL = toScopeUrl('offline.html');

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise && networkPromise.catch(() => {});
    return cached;
  }

  const fromNetwork = await networkPromise;
  if (fromNetwork) return fromNetwork;

  const fallback = await cache.match(request);
  if (fallback) return fallback;

  return Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache de forma explícita en el subdirectorio del SW (p. ej. /EduMusic/)
      return cache.addAll(SCOPED_ASSETS);
    })
  );
  // Activate new SW immediately
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const pathname = url.pathname || '';

  // Allow cross-origin requests (Firebase, CDNs, etc.) to bypass the SW
  if (url.origin !== self.location.origin) {
    return;
  }

  // Deja pasar peticiones no-GET (POST/PUT/etc.) sin intervención del SW
  if (request.method !== 'GET') {
    return;
  }

  // Serve a favicon even if /favicon.ico isn't present on disk
  if (url.pathname.endsWith('/favicon.ico')) {
    const iconUrl = toScopeUrl('assets/icon-192.png');
    event.respondWith(
      caches.match(iconUrl).then(resp => resp || fetch(iconUrl))
    );
    return;
  }

  // HTML: estrategia depende de si hay versión nueva
  const isDocument = request.mode === 'navigate'
    || request.destination === 'document'
    || ((request.headers.get('accept') || '').includes('text/html'));
  if (isDocument) {
    event.respondWith((async () => {
      if (IS_FRESH_VERSION) {
        // Network-first cuando hay nueva versión para evitar páginas obsoletas
        try {
          const resp = await fetch(request);
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return resp;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || fetch(request);
        }
      }
      try {
        return await staleWhileRevalidate(request);
      } catch {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      }
    })());
    return;
  }

  // JS: estrategia depende de si hay versión nueva
  const isScript = request.destination === 'script'
    || url.pathname.endsWith('.js')
    || url.pathname.includes('/js/');
  if (isScript) {
    let relativePath = url.pathname.startsWith(SCOPE_PATH)
      ? url.pathname.slice(SCOPE_PATH.length)
      : url.pathname;
    relativePath = relativePath.replace(/^\/+/, '');
    const isCriticalScript = CRITICAL_SCRIPTS.has(relativePath);
    event.respondWith((async () => {
      if (IS_FRESH_VERSION || isCriticalScript) {
        // Network-first para evitar JS obsoleto tras actualizar
        try {
          const resp = await networkFirst(request);
          return resp;
        } catch {
          const cached = await caches.match(request);
          return cached || fetch(request);
        }
      }
      return staleWhileRevalidate(request);
    })());
    return;
  }

  // Cache-first for other assets
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});

// Clean up old caches when activating new service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Detectar si la versión ha cambiado usando un meta-cache persistente
      try {
        const meta = await caches.open(META_CACHE);
        const versionKeyUrl = toScopeUrl('__sw_version__');
        const versionKey = new Request(versionKeyUrl);
        const prevResp = await meta.match(versionKey);
        const prev = prevResp ? await prevResp.text() : null;
        if (prev !== SW_VERSION) {
          IS_FRESH_VERSION = true;
          await meta.put(versionKey, new Response(SW_VERSION));
        }
      } catch (_) {
        // Si algo falla, asumimos comportamiento por defecto (no fresh)
        IS_FRESH_VERSION = false;
      }

      // Limpiar cachés antiguas pero conservar la meta
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k !== CACHE && k !== META_CACHE)
          .map(k => caches.delete(k))
      );
      // Empezar a controlar clientes sin recarga
      await self.clients.claim();
    })()
  );
});

// Respond to version queries from clients
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'GET_VERSION') {
    const payload = { type: 'VERSION', version: SW_VERSION, cache: CACHE };
    try {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage(payload);
      } else if (event.source && event.source.postMessage) {
        event.source.postMessage(payload);
      }
    } catch (e) { /* no-op */ }
    return;
  }

  if (data && data.type === 'SKIP_WAITING') {
    // Allow clients to request immediate activation
    try {
      self.skipWaiting();
    } catch (e) { /* ignore */ }
    return;
  }
});

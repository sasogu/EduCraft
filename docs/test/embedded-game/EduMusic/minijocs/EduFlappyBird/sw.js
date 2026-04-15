const CACHE_NAME = 'eduflappy-v0.4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './manifest.json',
  './assets/images/bird.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/images/splash.png',
  './assets/images/scoreboard.png',
  './assets/images/replay.png',
  './assets/images/medal_bronze.png',
  './assets/images/medal_silver.png',
  './assets/images/medal_gold.png',
  './assets/images/medal_platinum.png',
  './assets/images/font_small_0.png',
  './assets/images/font_small_1.png',
  './assets/images/font_small_2.png',
  './assets/images/font_small_3.png',
  './assets/images/font_small_4.png',
  './assets/images/font_small_5.png',
  './assets/images/font_small_6.png',
  './assets/images/font_small_7.png',
  './assets/images/font_small_8.png',
  './assets/images/font_small_9.png',
  './assets/audio/wing.ogg',
  './assets/audio/point.ogg',
  './assets/audio/hit.ogg',
  './assets/audio/die.ogg',
  './assets/audio/swooshing.ogg',
  './assets/piano/key09.ogg',
  './assets/piano/key10.ogg',
  './assets/piano/key11.ogg',
  './assets/piano/key12.ogg',
  './assets/piano/key13.ogg',
  './assets/piano/key14.ogg',
  './assets/piano/key15.ogg',
  './assets/piano/key16.ogg',
  './assets/piano/key17.ogg',
  './assets/piano/key18.ogg',
  './assets/piano/key19.ogg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request)
    )
  );
});

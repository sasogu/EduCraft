var SW_VERSION = '0.3.2';
var CACHE_NAME = 'EduBeatrix-v' + SW_VERSION;
var ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icon.svg',
  'logo.jpg',
  'scripts/phaser.min.js',
  'scripts/graphics.js',
  'scripts/beat.js',
  'scripts/indicator.js',
  'scripts/drum.js',
  'scripts/levels/0.js',
  'scripts/levels/1.js',
  'scripts/levels/2.js',
  'scripts/levels/3.js',
  'scripts/main.js',
  'scripts/preload.js',
  'scripts/boot.js',
  'images/bad.png',
  'images/BD.png',
  'images/beat.png',
  'images/bg.png',
  'images/BHI.png',
  'images/black2.png',
  'images/black.png',
  'images/BLO.png',
  'images/BME.png',
  'images/CLA.png',
  'images/COW.png',
  'images/good.png',
  'images/GUI.png',
  'images/HH.png',
  'images/HO.png',
  'images/indicator.png',
  'images/ME.png',
  'images/RIM.png',
  'images/SD.png',
  'images/TAM.png',
  'audio/yeah.mp3',
  'audio/mmhmm.mp3',
  'audio/rollover.wav',
  'audio/move.mp3',
  'audio/place.mp3',
  'audio/78-BD1.mp3',
  'audio/78-BD2.mp3',
  'audio/78-BD3.mp3',
  'audio/78-BHI1.mp3',
  'audio/78-BHI3.mp3',
  'audio/78-BLO1.mp3',
  'audio/78-BLO3.mp3',
  'audio/78-BME1.mp3',
  'audio/78-BME2.mp3',
  'audio/78-BME3.mp3',
  'audio/78-CLA1.mp3',
  'audio/78-CLA2.mp3',
  'audio/78-COW1.mp3',
  'audio/78-COW2.mp3',
  'audio/78-GUI1.mp3',
  'audio/78-GUI2.mp3',
  'audio/78-GUI3.mp3',
  'audio/78-GUI4.mp3',
  'audio/78-GUI5.mp3',
  'audio/78-GUI6.mp3',
  'audio/78-HH1.mp3',
  'audio/78-HH2.mp3',
  'audio/78-HH3.mp3',
  'audio/78-HH4.mp3',
  'audio/78-HO1.mp3',
  'audio/78-HO2.mp3',
  'audio/78-HO3.mp3',
  'audio/78-HO4.mp3',
  'audio/78-ME1.mp3',
  'audio/78-ME2.mp3',
  'audio/78-ME3.mp3',
  'audio/78-ME4.mp3',
  'audio/78-RIM2.mp3',
  'audio/78-RIM3.mp3',
  'audio/78-SD1.mp3',
  'audio/78-SD2.mp3',
  'audio/78-SD3.mp3',
  'audio/78-SD4.mp3',
  'audio/78-TAM1.mp3',
  'audio/78-TAM2.mp3',
  'audio/78-TAM3.mp3'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );

  // Activa la nueva versión lo antes posible.
  if (self.skipWaiting) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      ).then(function() {
        if (self.clients && self.clients.claim) {
          return self.clients.claim();
        }
        return null;
      });
    })
  );
});

self.addEventListener('message', function(event) {
  var data = event.data || {};
  if (data && data.type === 'GET_VERSION') {
    if (event.source && event.source.postMessage) {
      event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION, cacheName: CACHE_NAME });
    }
  } else if (data && data.type === 'SKIP_WAITING') {
    if (self.skipWaiting) {
      self.skipWaiting();
    }
  }
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

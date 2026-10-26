/* 仙台旅途 App 的離線快取（範圍：仙台/ 整個資料夾）
 * 頁面與資料：先連網拿最新版，沒網路才用手機裡存的版本。
 * 地圖元件與圖示：先用存好的。地圖底圖：看過的區域會暫存。
 * 改了 app 的檔案清單時，把 VERSION 加 1。
 */
var VERSION = 'sendai-app-v1';
var TILE_CACHE = 'sendai-tiles-v1';
var PRECACHE = [
  './',
  './index.html',
  './仙台家庭旅遊企劃書_行程規劃.html',
  './仙台家庭旅遊企劃書_待決定事項.html',
  './仙台家庭旅遊企劃書_訂購成果.html',
  './app/',
  './app/index.html',
  './app/app.css',
  './app/app.js',
  './app/trip.js',
  './app/manifest.webmanifest',
  './app/icon-192.png',
  './app/icon-512.png',
  './app/apple-touch-icon.png',
  './app/vendor/leaflet/leaflet.js',
  './app/vendor/leaflet/leaflet.css'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== TILE_CACHE && k.indexOf('sendai-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./app/index.html'); });
  });
}
function cacheFirst(req, name) {
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(name).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'tile.openstreetmap.org') { e.respondWith(cacheFirst(req, TILE_CACHE)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/vendor/') >= 0 || /\.png$/.test(url.pathname)) { e.respondWith(cacheFirst(req, VERSION)); return; }
  e.respondWith(networkFirst(req));
});

/* 金山旅途 App 的離線快取（範圍：金山/ 整個資料夾）
 * 頁面與資料：先連網拿最新版，沒網路才用手機裡存的版本。圖示：先用存好的。
 * 改了檔案清單時，把 VERSION 加 1。
 */
var VERSION = 'jinshan-app-v1';
var PRECACHE = ['./', './index.html', './app.html', './trip.js', './common.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k.indexOf('jinshan-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\.png$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./app.html'); });
  }));
});

/* 仙台旅途 App：畫面邏輯。行程內容都在 trip.js，這裡不放資料。 */
(function () {
  'use strict';
  var T = window.TRIP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- 時間（以日本時間為準；台灣段落的項目用台灣時間比） ---------- */
  var params = new URLSearchParams(location.search);
  function clock(tz) {
    // 測試或預覽用：?date=2026-10-31&time=10:05（日本時間）
    if (params.get('date')) {
      var hm = (params.get('time') || '09:00').split(':');
      var m = (+hm[0]) * 60 + (+hm[1]);
      if (tz === 'Asia/Taipei') m -= 60;
      return { date: params.get('date'), min: m };
    }
    var parts = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { date: parts.year + '-' + parts.month + '-' + parts.day, min: (+parts.hour % 24) * 60 + (+parts.minute) };
  }
  function itemMin(it) { var m = /(\d{1,2}):(\d{2})/.exec(it.t); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function dayIndexOf(date) { for (var i = 0; i < T.days.length; i++) if (T.days[i].d === date) return i; return -1; }
  function md(d) { var p = d.split('-'); return (+p[1]) + '/' + (+p[2]); }

  /* ---------- 連結 ---------- */
  function navUrl(key) { var p = T.places[key]; return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(p.q || p.n); }
  function telUrl(t) { return 'tel:' + t.replace(/[^\d+#]/g, '').replace('#', '%23'); }

  /* ---------- 時間軸 ---------- */
  var OPEN = {}; // 使用者點開／收起的項目，每分鐘重畫時保留
  function timeline(di, live) {
    var day = T.days[di], cur = -1, next = -1;
    if (live) {
      day.items.forEach(function (it, i) {
        var m = itemMin(it); if (m == null) return;
        var now = clock(it.tz === 'TW' ? 'Asia/Taipei' : T.tz).min;
        if (m <= now) cur = i; else if (next < 0) next = i;
      });
    }
    var h = '<ol class="tl">', seenP = {};
    day.items.forEach(function (it, i) {
      var cls = ['it'];
      if (it.tag === 'key') cls.push('key');
      if (it.tag === 'opt') cls.push('opt');
      if (live && cur >= 0 && i < cur && itemMin(it) != null) cls.push('past');
      if (live && (i === next || (next < 0 && i === cur))) cls.push('next');
      var tag = it.tag === 'key' ? '<span class="tg key">重點</span>' : it.tag === 'opt' ? '<span class="tg opt">有餘力</span>' : it.tag === 'warn' ? '<span class="tg warn">待確認</span>' : '';
      var acts = '';
      if (it.p && !seenP[it.p]) {
        seenP[it.p] = 1;
        acts += '<a class="act" href="' + navUrl(it.p) + '" target="_blank" rel="noopener">📍 導航</a>';
        acts += '<button type="button" class="act alt" data-map="' + di + ':' + it.p + '">🗺 地圖</button>';
      }
      (it.tel || []).forEach(function (t) { acts += '<a class="act alt" href="' + telUrl(t) + '">📞 ' + esc(t) + '</a>'; });
      var lbl = live && i === next ? '<span class="nextlbl">接下來</span><br>' : live && next < 0 && i === cur ? '<span class="nextlbl">現在</span><br>' : '';
      var det = (it.note ? '<p class="nt">' + esc(it.note) + '</p>' : '') + (acts ? '<div class="acts">' + acts + '</div>' : '');
      var isNext = live && (i === next || (next < 0 && i === cur));
      var opened = OPEN[di + ':' + i] != null ? OPEN[di + ':' + i] : isNext;
      var bxc = det ? 'bx tap' + (opened ? ' open' : '') : 'bx';
      h += '<li class="' + cls.join(' ') + '"><div class="tm">' + esc(it.t) + (it.tz === 'TW' ? '<small>台灣時間</small>' : '') + '</div><div class="' + bxc + '"' + (det ? ' role="button" tabindex="0" data-k="' + di + ':' + i + '" aria-expanded="' + (opened ? 'true' : 'false') + '"' : '') + '>' + lbl +
        '<div class="tt">' + tag + esc(it.title) + '</div>' + (det ? '<div class="det">' + det + '</div>' : '') + '</div></li>';
    });
    h += '</ol>';
    var f = '<div class="foot">';
    if (day.spend) f += '<p>💴 當日預估支出：' + esc(day.spend) + '</p>';
    (day.tips || []).forEach(function (t) { f += '<p>🔁 ' + esc(t) + '</p>'; });
    if (day.rain) f += '<p>☔ 雨天備案：' + esc(day.rain) + '</p>';
    f += '</div><a class="more" href="' + T.plan + '#' + day.anchor + '">看這一天的完整說明（① 行程規劃）→</a>';
    return h + f;
  }
  function dayHead(di) {
    var d = T.days[di];
    return '<p class="lead">' + esc(d.lead) + '</p>' + (d.warn ? '<div class="alert">⚠️ ' + esc(d.warn) + '</div>' : '');
  }
  function chips(sel, onId) {
    var today = dayIndexOf(clock(T.tz).date);
    return T.days.map(function (d, i) {
      return '<button type="button" class="chip' + (i === sel ? ' on' : '') + (i === today ? ' today' : '') + '" data-' + onId + '="' + i + '"><b>Day ' + (i + 1) + '（' + d.w + '）</b><span>' + md(d.d) + '</span></button>';
    }).join('');
  }

  /* ---------- 今天 ---------- */
  var PREP = [
    '護照效期 6 個月以上（三人）',
    '台灣駕照正本＋日文譯本（譯本已辦好，兩份都要帶）',
    '長榮線上報到 10/28 起開放',
    '另帶一張不同組織的信用卡（JCB／Master）',
    '¥100 硬幣至少 8 枚（動物園餵食），現金約 ¥60,000',
    '可攜式椅帶（兩間飯店與多數餐廳的兒童椅都沒有安全帶）',
    '尿布防臭袋（消毒盒 10/30 在阿卡將本舖買）',
    '列印現場速查卡（Drive「仙台」資料夾的 PDF）',
    'Google 地圖先下載仙台市區與秋保的離線地圖'
  ];
  /* ---------- 打包清單 ---------- */
  function packState() { try { return JSON.parse(store.get('sendai-pack') || '{}') || {}; } catch (e) { return {}; } }
  function packHtml() {
    if (!T.pack) return '';
    var st = packState(), all = 0, done = 0, h = '';
    T.pack.forEach(function (g) {
      var gd = 0, li = '';
      g.items.forEach(function (it) {
        var id = g.k + ':' + it[0], on = !!st[id]; all++; if (on) { done++; gd++; }
        li += '<li><label class="pk' + (on ? ' on' : '') + '"><input type="checkbox" data-pk="' + esc(id) + '"' + (on ? ' checked' : '') + '><span><b>' + esc(it[0]) + '</b>' + (it[1] ? '<small>' + esc(it[1]) + '</small>' : '') + '</span></label></li>';
      });
      var full = gd === g.items.length;
      h += '<details class="pkg"' + (st['_open:' + g.k] ? ' open' : '') + ' data-g="' + g.k + '"><summary><span><b>' + esc(g.t) + '</b><small>' + esc(g.s) + '</small></span><em class="' + (full ? 'ok' : '') + '">' + gd + '／' + g.items.length + '</em></summary><ul>' + li + '</ul></details>';
    });
    return '<div class="h2">打包清單　' + done + '／' + all + '</div><div class="pbar"><i style="width:' + (all ? Math.round(done / all * 100) : 0) + '%"></i></div>' + h +
      '<p class="foot">勾選只存在這支手機上。<button type="button" class="lnk" data-pkreset>全部清除</button></p>';
  }
  function rerender() { if (current === 'today') renderToday(); else if (current === 'info') renderInfo(); }
  document.addEventListener('change', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-pk'); if (!id) return;
    var st = packState(); if (e.target.checked) st[id] = 1; else delete st[id];
    store.set('sendai-pack', JSON.stringify(st)); var y = window.scrollY; rerender(); window.scrollTo(0, y);
  });
  document.addEventListener('toggle', function (e) {
    var g = e.target.getAttribute && e.target.getAttribute('data-g'); if (!g) return;
    var st = packState(); if (e.target.open) st['_open:' + g] = 1; else delete st['_open:' + g];
    store.set('sendai-pack', JSON.stringify(st));
  }, true);

  function renderToday() {
    var now = clock(T.tz), di = dayIndexOf(now.date), first = T.days[0].d, last = T.days[T.days.length - 1].d, h = '';
    if (di >= 0) {
      var d = T.days[di];
      h += '<div class="hero"><p class="k">DAY ' + (di + 1) + '　' + md(d.d) + '（' + d.w + '）</p><h1>' + esc(d.title) + '</h1><span class="badge">今天・日本時間 ' + String(Math.floor(now.min / 60)).padStart(2, '0') + ':' + String(now.min % 60).padStart(2, '0') + '</span></div>';
      h += dayHead(di) + '<div class="h2">今天的行程</div>' + timeline(di, true);
    } else if (now.date < first) {
      var days = Math.round((Date.parse(first) - Date.parse(now.date)) / 864e5);
      h += '<div class="hero"><p class="k">仙台 2026 秋</p><div class="big">還有 ' + days + ' 天</div><p>' + esc(T.sub) + '<br>BR118 桃園 10:15 → 仙台 14:25</p></div>';
      h += '<div class="h2">出發前確認</div><div class="card"><ul class="checks">' + PREP.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
      h += packHtml();
      h += '<div class="h2">第一天預覽</div>' + dayHead(0) + timeline(0, false);
    } else {
      h += '<div class="hero"><p class="k">仙台 2026 秋</p><h1>旅程結束，歡迎回家</h1><p>' + esc(T.sub) + '</p></div><a class="more" href="../index.html">回仙台企劃書 →</a>';
    }
    $('#v-today').innerHTML = h;
  }

  /* ---------- 行程 ---------- */
  var planDay = 0;
  function renderPlan() {
    var d = T.days[planDay], live = d.d === clock(T.tz).date;
    $('#v-plan').innerHTML = '<div class="chips">' + chips(planDay, 'pday') + '</div>' +
      '<div class="hero"><p class="k">DAY ' + (planDay + 1) + '　' + md(d.d) + '（' + d.w + '）</p><h1>' + esc(d.title) + '</h1></div>' +
      dayHead(planDay) + '<div class="h2">逐時行程</div>' + timeline(planDay, live);
  }

  /* ---------- 地圖 ---------- */
  var map = null, layer = null, markers = {}, mapDay = 0, mapMode = store.get('sendai-mapmode') || 'g', gKey = null;
  function gUrl(key) { var p = T.places[key]; return 'https://www.google.com/maps?q=' + encodeURIComponent(p.q || p.n) + '&hl=zh-TW&z=16&output=embed'; }
  function setG(key) {
    if (!key) return; gKey = key;
    var fr = $('#gframe'), u = gUrl(key); if (fr.getAttribute('src') !== u) fr.setAttribute('src', u);
    Array.prototype.forEach.call(document.querySelectorAll('#mapList li'), function (li) { li.classList.toggle('cur', li.getAttribute('data-pick') === key); });
  }
  function dayStops(di) {
    var seen = {}, out = [];
    T.days[di].items.forEach(function (it) {
      if (!it.p || seen[it.p]) return;
      seen[it.p] = 1;
      out.push({ key: it.p, t: it.t, title: it.title, opt: it.tag === 'opt' });
    });
    return out;
  }
  function renderMap(focusKey) {
    $('#mapChips').innerHTML = chips(mapDay, 'mday');
    var stops = dayStops(mapDay), list = '', n = 0;
    stops.forEach(function (s) {
      var p = T.places[s.key]; if (p.ll || mapMode === 'g') n++;
      list += '<li data-pick="' + s.key + '"><span class="n' + (s.opt ? ' o' : '') + '">' + (mapMode === 'g' || p.ll ? n || '·' : '–') + '</span><div class="x"><b>' + esc(p.n) + '</b><span>' + esc(s.t) + '　' + esc(s.title) + (mapMode === 'r' && !p.ll ? '（路線圖沒有座標，請用導航）' : '') + '</span></div><a class="act" href="' + navUrl(s.key) + '" target="_blank" rel="noopener">導航</a></li>';
    });
    $('#mapList').innerHTML = list;
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mapMode); });
    $('#gmap').hidden = mapMode !== 'g'; $('#map').hidden = mapMode !== 'r';
    $('#mapNote').textContent = mapMode === 'g' ? '點下面的地點，上方就換成那個地點的 Google 地圖；要走路線請按「導航」。需要網路。' : '當天所有停留點的順序與路線。需要網路，看過的區域會暫存。';
    if (mapMode === 'g') {
      var keys = stops.map(function (x) { return x.key; });
      setG(focusKey && keys.indexOf(focusKey) >= 0 ? focusKey : (gKey && keys.indexOf(gKey) >= 0 ? gKey : keys[0]));
      return;
    }
    if (!window.L) { $('#map').innerHTML = '<p style="padding:16px">地圖元件載入失敗，請用下方的導航按鈕。</p>'; return; }
    if (!map) {
      map = L.map('map', { zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    }
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map); markers = {};
    var pts = []; n = 0;
    stops.forEach(function (s) {
      var p = T.places[s.key]; if (!p.ll) return; n++;
      var icon = L.divIcon({ className: '', html: '<div class="pin' + (s.opt ? ' o' : '') + '"><span>' + n + '</span></div>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });
      var m = L.marker(p.ll, { icon: icon, title: p.n }).bindPopup('<b>' + esc(p.n) + '</b><br>' + esc(s.t) + '　' + esc(s.title) + '<br><a href="' + navUrl(s.key) + '" target="_blank" rel="noopener">📍 Google 地圖導航</a>');
      m.addTo(layer); markers[s.key] = m; pts.push(p.ll);
    });
    if (pts.length > 1) L.polyline(pts, { color: '#9c3f2b', weight: 2.5, opacity: .55, dashArray: '6 7' }).addTo(layer);
    setTimeout(function () {
      map.invalidateSize();
      if (focusKey && markers[focusKey]) { map.setView(markers[focusKey].getLatLng(), 15); markers[focusKey].openPopup(); }
      else if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
      else if (pts.length === 1) map.setView(pts[0], 14);
    }, 60);
  }

  /* ---------- 速查 ---------- */
  function addrCard(o) {
    return '<div class="card"><div class="row"><h3>' + esc(o.n) + '</h3><span class="s">' + esc(o.k) + (o.t ? '　' + esc(o.t) : '') + '</span></div>' +
      '<p class="m">' + esc(o.addr) + '</p>' + (o.pay ? '<p class="m">💴 ' + esc(o.pay) + '</p>' : '') + (o.kids ? '<p class="m">👶 ' + esc(o.kids) + '</p>' : '') +
      '<div class="acts"><button type="button" class="act" data-show="' + esc(o.ja + '\n' + o.addr) + '" data-sub="' + esc(o.n) + '">🚕 給司機看</button>' +
      '<a class="act alt" href="' + telUrl(o.tel) + '">📞 ' + esc(o.tel) + '</a><a class="act alt" href="' + navUrl(o.p) + '" target="_blank" rel="noopener">📍 導航</a></div></div>';
  }
  function renderInfo() {
    var h = '<div class="h2">航班</div>';
    T.flights.forEach(function (f) { h += '<div class="card"><div class="row"><h3>' + esc(f.k) + '　' + esc(f.no) + '</h3><span class="s">' + esc(f.d) + '</span></div><p class="m">' + esc(f.r) + '</p><p class="s">' + esc(f.n) + '</p></div>'; });
    h += '<p class="foot">報到時要出示購票的那張信用卡。訂位代號、票號見私人記錄。</p>';
    h += '<div class="h2">住宿</div>' + T.stays.map(addrCard).join('');
    h += '<div class="h2">租車</div>' + T.car.map(addrCard).join('') + '<p class="foot">' + esc(T.carNote) + '</p>';
    h += '<div class="h2">現場要付的錢</div><div class="card"><p class="m">' + esc(T.cash) + '</p></div>';
    h += '<div class="h2">日文小抄（點一下放大給店員看）</div>';
    T.phrases.forEach(function (p) { h += '<button type="button" class="ph" data-show="' + esc(p[0]) + '" data-sub="' + esc(p[1]) + '"><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></button>'; });
    h += '<div class="h2">緊急電話</div>';
    T.sos.forEach(function (s) {
      h += '<div class="card"><div class="row"><h3>' + esc(s.n) + '</h3></div><p class="s">' + esc(s.note) + '</p><div class="acts"><a class="act" href="' + telUrl(s.tel) + '">📞 ' + esc(s.tel) + '</a>' + (s.p ? '<a class="act alt" href="' + navUrl(s.p) + '" target="_blank" rel="noopener">📍 導航</a>' : '') + '</div></div>';
    });
    h += '<p class="foot">' + esc(T.sosNote) + '</p>';
    h += packHtml();
    h += '<div class="h2">完整資料</div><div class="card"><p class="m"><a href="../index.html">仙台企劃書首頁</a>｜<a href="' + T.plan + '">① 行程規劃</a>｜<a href="../仙台家庭旅遊企劃書_待決定事項.html">② 待辦清單</a>｜<a href="../仙台家庭旅遊企劃書_訂購成果.html">③ 訂單</a></p><p class="m"><a href="' + T.drive + '" target="_blank" rel="noopener">📁 私人文件（訂位代號、保單號）</a></p><p class="s">資料版本 ' + esc(T.version) + '（' + esc(T.updated) + '），和企劃書同步。</p></div>';
    $('#v-info').innerHTML = h;
  }

  /* ---------- 分頁切換 ---------- */
  var current = 'today';
  function show(v, opt) {
    current = v;
    ['today', 'plan', 'map', 'info'].forEach(function (k) { $('#v-' + k).hidden = k !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); });
    if (v === 'today') renderToday();
    if (v === 'plan') renderPlan();
    if (v === 'map') renderMap(opt && opt.focus);
    if (v === 'info') renderInfo();
    var hash = '#' + v + (v === 'plan' ? '/' + (planDay + 1) : v === 'map' ? '/' + (mapDay + 1) : '');
    if (location.hash !== hash) history.replaceState(null, '', hash);
    if (!opt || !opt.keepScroll) window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    var sg = e.target.closest('.seg button');
    if (sg) { mapMode = sg.getAttribute('data-mode'); store.set('sendai-mapmode', mapMode); renderMap(gKey); return; }
    var pk = e.target.closest('#mapList li[data-pick]');
    if (pk && !e.target.closest('a')) { if (mapMode === 'g') { setG(pk.getAttribute('data-pick')); window.scrollTo({ top: 0, behavior: 'smooth' }); } else if (markers[pk.getAttribute('data-pick')]) { var mk = markers[pk.getAttribute('data-pick')]; map.setView(mk.getLatLng(), 15); mk.openPopup(); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    var rs = e.target.closest('[data-pkreset]');
    if (rs) { if (rs.getAttribute('data-arm')) { store.set('sendai-pack', '{}'); rerender(); } else { rs.setAttribute('data-arm', '1'); rs.textContent = '再按一次確定清除'; } return; }
    var b = e.target.closest('[data-v],[data-pday],[data-mday],[data-map],[data-show],.sheet-x,.sheet');
    if (!b) {
      var t = e.target.closest('.bx.tap');
      if (t && !e.target.closest('a,button')) { var o = t.classList.toggle('open'); t.setAttribute('aria-expanded', o ? 'true' : 'false'); OPEN[t.getAttribute('data-k')] = o; }
      return;
    }
    if (b.hasAttribute('data-v')) show(b.getAttribute('data-v'));
    else if (b.hasAttribute('data-pday')) { planDay = +b.getAttribute('data-pday'); show('plan'); }
    else if (b.hasAttribute('data-mday')) { mapDay = +b.getAttribute('data-mday'); show('map', { keepScroll: true }); }
    else if (b.hasAttribute('data-map')) { var a = b.getAttribute('data-map').split(':'); mapDay = +a[0]; show('map', { focus: a[1] }); }
    else if (b.hasAttribute('data-show')) openSheet(b.getAttribute('data-show'), b.getAttribute('data-sub'));
    else if (b.classList.contains('sheet-x') || e.target === b) $('#sheet').hidden = true;
  });
  function openSheet(ja, sub) {
    $('.sheet-c').innerHTML = '<p class="show-sub">' + esc(sub) + '</p><div class="show-ja">' + esc(ja).replace(/\n/g, '<br>') + '</div>';
    $('#sheet').hidden = false;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $('#sheet').hidden = true;
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('tap')) { e.preventDefault(); e.target.click(); }
  });

  /* ---------- 啟動 ---------- */
  (function init() {
    var today = dayIndexOf(clock(T.tz).date);
    planDay = mapDay = today >= 0 ? today : 0;
    var m = /^#(today|plan|map|info)(?:\/(\d))?/.exec(location.hash);
    if (m && m[2] && +m[2] >= 1 && +m[2] <= T.days.length) { if (m[1] === 'plan') planDay = +m[2] - 1; if (m[1] === 'map') mapDay = +m[2] - 1; }
    show(m ? m[1] : 'today');
    // 每分鐘更新「接下來」
    setInterval(function () { if (current === 'today') renderToday(); else if (current === 'plan' && T.days[planDay].d === clock(T.tz).date) renderPlan(); }, 60000);
  })();

  /* ---------- 離線提示 ---------- */
  function net() { $('#offline').hidden = navigator.onLine !== false; }
  window.addEventListener('online', net); window.addEventListener('offline', net); net();

  /* ---------- 加到主畫面 ---------- */
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null;
  function hint(text, btn) {
    if (standalone || store.get('sendai-install-x')) return;
    $('.install-t').textContent = text; $('#installBtn').hidden = !btn; $('#install').hidden = false;
  }
  if (ios) hint('在 Safari 點下方「分享」→「加入主畫面」，之後像 App 一樣一點就開，沒網路也能看。');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; hint('加到主畫面，之後像 App 一樣一點就開，沒網路也能看。', true); });
  function closeHint() { $('#install').hidden = true; store.set('sendai-install-x', '1'); }
  $('#installBtn').addEventListener('click', function () { if (deferred) { deferred.prompt(); deferred = null; } closeHint(); });
  $('#installX').addEventListener('click', closeHint);

  /* ---------- 離線快取 ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {});
  }
})();

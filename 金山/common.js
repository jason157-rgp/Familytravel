/* 金山小旅行：企劃書與 App 共用的小工具（不放行程資料，資料在 trip.js） */
(function () {
  'use strict';
  var T = window.TRIP;
  var K = window.KIT = {};

  K.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  K.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  };

  /* 現在時間（台灣）；?date=2026-12-23&time=15:20 可預覽任一時刻 */
  var params = new URLSearchParams(location.search);
  K.preview = !!params.get('date');
  K.now = function () {
    if (params.get('date')) {
      var hm = (params.get('time') || '09:00').split(':');
      return { date: params.get('date'), min: (+hm[0]) * 60 + (+hm[1]) };
    }
    var p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: T.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + (+p.minute) };
  };
  K.min = function (t) { var m = /(\d{1,2}):(\d{2})/.exec(t); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  K.hm = function (m) { m = ((m % 1440) + 1440) % 1440; return (m / 60 | 0) + ':' + ('0' + m % 60).slice(-2); };
  K.daysTo = function (date) {
    var n = K.now(), a = Date.UTC.apply(null, n.date.split('-').map(function (x, i) { return i === 1 ? x - 1 : +x; })),
      b = Date.UTC.apply(null, date.split('-').map(function (x, i) { return i === 1 ? x - 1 : +x; }));
    return Math.round((b - a) / 864e5);
  };

  K.navUrl = function (key) { var p = T.places[key]; return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(p.q || p.n); };
  K.mapUrl = function (key) { var p = T.places[key]; return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.q || p.n); };
  K.telUrl = function (t) { return 'tel:' + t.replace(/[^\d+]/g, ''); };

  /* 天氣：Open-Meteo，結果暫存在手機 3 小時；預報只到 16 天內 */
  var WMO = { 0: '☀️ 晴', 1: '🌤 晴時多雲', 2: '⛅ 多雲', 3: '☁️ 陰', 45: '🌫 霧', 48: '🌫 霧', 51: '🌦 毛毛雨', 53: '🌦 毛毛雨', 55: '🌦 毛毛雨', 61: '🌧 小雨', 63: '🌧 雨', 65: '🌧 大雨', 80: '🌦 陣雨', 81: '🌧 陣雨', 82: '⛈ 大陣雨', 95: '⛈ 雷雨', 96: '⛈ 雷雨', 99: '⛈ 雷雨' };
  K.weather = function (day, cb) {
    var loc = T.wx[day.wx], ahead = K.daysTo(day.d);
    if (ahead > 15) { cb({ note: '出發前兩週才有預報（' + loc.n + '）' }); return; }
    if (ahead < 0) { cb(null); return; }
    var key = 'jinshan-wx-' + day.d + '-' + day.wx, hit = K.store.json(key, null);
    if (hit && Date.now() - hit.at < 3 * 3600e3) { cb(hit); return; }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FTaipei&start_date=' + day.d + '&end_date=' + day.d;
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var d = j.daily; if (!d || !d.time || !d.time.length) throw 0;
      var o = { at: Date.now(), loc: loc.n, w: WMO[d.weather_code[0]] || '天氣代碼 ' + d.weather_code[0], hi: Math.round(d.temperature_2m_max[0]), lo: Math.round(d.temperature_2m_min[0]), pop: d.precipitation_probability_max[0], wind: Math.round(d.wind_speed_10m_max[0]) };
      K.store.set(key, JSON.stringify(o)); cb(o);
    }).catch(function () { cb(hit || { note: '天氣暫時抓不到（' + loc.n + '），晚點再看' }); });
  };
  K.wxText = function (o) {
    if (!o) return '';
    if (o.note) return o.note;
    var t = new Date(o.at);
    return o.loc + '　' + o.w + '　' + o.lo + '–' + o.hi + '°C' + (o.pop != null ? '　降雨 ' + o.pop + '%' : '') + (o.wind ? '　風 ' + o.wind + ' km/h' : '') +
      '<small>Open-Meteo・' + (t.getMonth() + 1) + '/' + t.getDate() + ' ' + K.hm(t.getHours() * 60 + t.getMinutes()) + ' 更新</small>';
  };

  /* 短欄位的名稱與順序（App 與企劃書共用） */
  K.FIELDS = [['go', '怎麼去'], ['pay', '付款'], ['kid', '小魚乾'], ['book', '預約']];
})();

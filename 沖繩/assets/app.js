/* 沖繩家庭旅遊企劃書 — 共用行為腳本 v2.0
   1) 表格自動加 data-label，手機上轉成卡片
   2) 標題自動編 id，供錨點連結使用
   3) 自動生成本頁目錄
   4) 導覽列標示目前頁
   5) 折疊區塊：手機收合、桌機展開
   6) 回頂端按鈕
   本檔案不改變任何內容，只處理呈現方式。 */
(function () {
  'use strict';

  /* ---- 1. 表格 ---- */
  Array.prototype.forEach.call(document.querySelectorAll('table'), function (t) {
    if (!t.parentNode.classList || !t.parentNode.classList.contains('tw')) {
      var w = document.createElement('div');
      w.className = 'tw';
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    }
    var head = t.querySelector('thead tr');
    if (head) {
      var labels = Array.prototype.map.call(head.children, function (th) {
        return th.textContent.replace(/\s+/g, ' ').trim();
      });
      t.classList.add('cardify');
      Array.prototype.forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
        var i = 0;
        Array.prototype.forEach.call(tr.children, function (td) {
          if (!td.hasAttribute('data-label') && labels[i]) td.setAttribute('data-label', labels[i]);
          i += (parseInt(td.getAttribute('colspan'), 10) || 1);
        });
      });
    } else {
      t.parentNode.classList.add('scrollx');
    }
  });

  /* ---- 2. 標題 id ---- */
  var n = 0;
  Array.prototype.forEach.call(document.querySelectorAll('.wrap h2, .wrap h3'), function (h) {
    if (!h.id) h.id = 'sec' + (++n);
  });

  /* ---- 3. 目錄 ---- */
  var host = document.querySelector('[data-toc]');
  if (host) {
    var ol = document.createElement('ol');
    Array.prototype.forEach.call(document.querySelectorAll('.wrap h2'), function (h) {
      var c = h.cloneNode(true);
      var num = c.querySelector('.n');
      if (num) num.parentNode.removeChild(num);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = c.textContent.replace(/\s+/g, ' ').trim();
      li.appendChild(a);
      ol.appendChild(li);
    });
    if (ol.children.length) host.appendChild(ol);
    else host.style.display = 'none';
  }

  /* ---- 4. 導覽列目前頁 ---- */
  var here = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
    var t = decodeURIComponent((a.getAttribute('href') || '').split('#')[0]);
    if (t && t === here) a.classList.add('on');
  });

  /* ---- 5. 折疊區塊 ---- */
  var wide = window.matchMedia('(min-width:1024px)');
  function sync(e) {
    if (!e.matches) return;
    Array.prototype.forEach.call(document.querySelectorAll('details[data-auto]'), function (d) {
      d.open = true;
    });
  }
  sync(wide);
  if (wide.addEventListener) wide.addEventListener('change', sync);

  /* ---- 6. 回頂端 ---- */
  var up = document.createElement('a');
  up.className = 'up';
  up.href = '#top';
  up.setAttribute('aria-label', '回到頁面頂端');
  up.textContent = '↑';
  up.style.display = 'none';
  document.body.appendChild(up);
  function onScroll() {
    up.style.display = (window.pageYOffset > 500) ? 'flex' : 'none';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

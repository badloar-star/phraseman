/* Телефон на сайте = вёрстка утверждённой Главной (владелец 22.10). Экран эталона 390×844 масштабируется под
   ширину экрана телефона сайта. зачем: CSS пока не умеет делить длину на длину, поэтому коэффициент считает этот скрипт.
   Без скрипта стоит запасной коэффициент для телефона шириной 360 (экран 340). */
(function () {
  'use strict';
  var LOG = '[APP-HOME]';
  function fit(screen) {
    var w = screen.clientWidth;
    if (!w) return;
    screen.style.setProperty('--pm-k', String(w / 390));
  }
  function init() {
    var screens = document.querySelectorAll('.pm-app-screen');
    if (!screens.length) { console.warn(LOG, 'no phone on page'); return; }
    [].forEach.call(screens, function (s) {
      fit(s);
      if ('ResizeObserver' in window) new ResizeObserver(function () { fit(s); }).observe(s);
      else window.addEventListener('resize', function () { fit(s); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Макет телефона: настоящая Главная со сценой, 3 снимка по кругу (владелец 22.10).
   зачем: мягкая смена сцен без тяжёлой анимации — только прозрачность. Листает, лишь когда телефон
   на экране и вкладка видна; при «уменьшить движение» — стоит на первой сцене. Тема — по data-mode сайта. */
(function () {
  'use strict';
  var LOG = '[PHONE-SCENES]';
  var STEP_MS = 4500;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mode() { return document.documentElement.getAttribute('data-mode') === 'light' ? 'light' : 'dark'; }
  function start(screen) {
    var visible = false;
    function shots() { return [].slice.call(screen.querySelectorAll('.shot[data-mode-only="' + mode() + '"]')); }
    function step() {
      if (!visible || document.hidden) return;
      var list = shots(); if (list.length < 2) return;
      var i = list.findIndex(function (el) { return el.classList.contains('on'); });
      var next = list[(i + 1) % list.length];
      if (!next.complete) { next.loading = 'eager'; return; } // следующая ещё грузится — подождём следующего шага
      list.forEach(function (el) { el.classList.toggle('on', el === next); });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) shots().forEach(function (el) { el.loading = 'eager'; }); // догрузить остальные сцены этой темы
      }, { rootMargin: '200px' }).observe(screen);
    } else { visible = true; }
    if (!reduce) setInterval(step, STEP_MS);
  }
  function init() {
    var screens = document.querySelectorAll('[data-scene-cycle]');
    if (!screens.length) { console.warn(LOG, 'no phone on page'); return; }
    [].forEach.call(screens, start);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

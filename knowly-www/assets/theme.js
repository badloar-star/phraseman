/* Переключатель светлой/тёмной темы knowlyapps.com.
   Подключать БЕЗ defer в <head> (до отрисовки), чтобы не мигал не тот фон:
     <link rel="stylesheet" href="/assets/theme.css?v=1" />
     <script src="/assets/theme.js?v=1"></script>
   Дефолт — тёмная (фирменная). Выбор хранится в localStorage('pm_theme'). */
(function () {
  'use strict';

  var KEY = 'pm_theme';

  function saved() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (_) { return null; }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  apply(saved() || 'dark');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function updateButton(btn) {
    var light = currentTheme() === 'light';
    btn.textContent = light ? '🌙' : '☀️';
    btn.setAttribute('aria-label', light ? 'Включить тёмную тему' : 'Включить светлую тему');
    btn.title = light ? 'Тёмная тема' : 'Светлая тема';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var host = document.querySelector('.topbar');
    if (!host) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    updateButton(btn);
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (_) { /* noop */ }
      updateButton(btn);
    });
    var nav = host.querySelector('.nav');
    if (nav) nav.appendChild(btn);
    else host.appendChild(btn);
  });
})();

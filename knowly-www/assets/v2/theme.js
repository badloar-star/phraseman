/* PhraseMan 2.0 — тема сайта (владелец 2026-10-15: дизайн «вариант C — живые темы» на весь сайт).
   зачем: 11 тем приложения (Графит + 10 градиентных), тёмная/светлая, насыщенность — по формулам
   constants/liquidGlassGradientThemes.ts. Выбор живёт в localStorage и общий для всех страниц.
   Ничего не ломает: если скрипт не загрузился, base.css уже рисует тёмную «Аврору» по умолчанию. */
(function () {
  'use strict';
  var TAG = '[SITE-THEME]';
  var KEY = 'pm-site-theme-v1';
  // [имя, glowA, glowB, accent, onAccent]
  var THEMES = [
    ['Графит', null, null, '#F2F1F6', '#0B0C0E'],
    ['Аврора', '#38E0AA', '#7C5CFF', '#7EF0C8', '#04261D'],
    ['Ирис', '#788CFF', '#FF78C8', '#C7C9FF', '#1B1C4A'],
    ['Магма', '#FF5A28', '#FFAA3C', '#FFB27A', '#3A1204'],
    ['Полночь', '#286EFF', '#00D2FF', '#8CC4FF', '#06224D'],
    ['Шампань', '#F0BE78', '#E68296', '#F3D39A', '#3A2608'],
    ['Нефрит', '#14BEA0', '#1E78C8', '#7FE6D2', '#032A24'],
    ['Орхидея', '#D246FF', '#FF3C8C', '#EAA6FF', '#3A0A4A'],
    ['Лёд', '#96DCFF', '#78A0FF', '#BFE6FF', '#0A2A44'],
    ['Коралл', '#FF645A', '#FFA046', '#FFB0A0', '#4A0F0A'],
    ['Сирень', '#A78BFA', '#60A5FA', '#D4C8FF', '#24164A']
  ];
  var root = document.documentElement;
  var state = { mode: 'dark', theme: 1, k: 0.6 };

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.theme === 'number' && THEMES[saved.theme] && (saved.mode === 'dark' || saved.mode === 'light') && typeof saved.k === 'number') state = saved;
  } catch (e) { console.warn(TAG, 'тема из памяти не прочитана:', e && e.message); }

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + x.map(function (c, i) { return ('0' + Math.round(c + (y[i] - c) * t).toString(16)).slice(-2); }).join(''); }
  function lum(h) { return hex(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(a, b) { var l = [lum(a), lum(b)].sort(function (p, q) { return q - p; }); return (l[0] + 0.05) / (l[1] + 0.05); }
  // зачем: на светлой кнопка идёт от почти чёрной к пастели темы — текст по контрасту, как liquidGlassButtonInk
  function lightInk(cta, on) { if (contrast('#FFFFFF', cta) >= 4.5) return '#FFFFFF'; if (contrast(on, cta) >= 4.5) return on; return '#000000'; }

  function apply() {
    var t = THEMES[state.theme] || THEMES[1];
    var k = t[1] ? state.k : 0;
    root.setAttribute('data-mode', state.mode);
    root.style.setProperty('--g1', t[1] || '#000000');
    root.style.setProperty('--g2', t[2] || '#000000');
    root.style.setProperty('--acc', t[3]);
    root.style.setProperty('--on', t[4]);
    root.style.setProperty('--k', String(k));
    if (state.mode === 'light') root.style.setProperty('--cta-ink', lightInk(mix('#1C1C1F', t[3], k), t[4]));
    else root.style.removeProperty('--cta-ink');
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn(TAG, 'тема не сохранена:', e && e.message); } }
  apply(); // до первой отрисовки — без вспышки другой темы

  var ICON_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';

  function sync(pop) {
    if (!pop) return;
    [].forEach.call(pop.querySelectorAll('.v2-sw'), function (b, i) { b.setAttribute('aria-pressed', String(i === state.theme)); });
    [].forEach.call(pop.querySelectorAll('[data-v2-mode]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v2-mode') === state.mode)); });
    var s = pop.querySelector('input[type=range]'), v = pop.querySelector('.v2-kval');
    if (s) s.value = Math.round(state.k * 100);
    if (v) v.textContent = Math.round(state.k * 100) + '%';
  }

  function mount() {
    var actions = document.querySelector('.site-header .nav-actions');
    if (!actions) { console.log(TAG, 'на странице нет шапки сайта — кнопка темы не добавлена'); return; }
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'v2-theme-btn'; btn.setAttribute('aria-label', 'Тема сайта'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i aria-hidden="true"></i>';
    var lang = actions.querySelector('#site-language');
    actions.insertBefore(btn, lang ? lang.nextSibling : actions.firstChild);

    var pop = document.createElement('div');
    pop.className = 'v2-theme-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Тема сайта');
    pop.innerHTML = '<span class="v2-pop-label">Тема приложения</span><div class="v2-swatches" role="group" aria-label="Темы"></div>' +
      '<div class="v2-seg" role="group" aria-label="Оформление"><button type="button" data-v2-mode="dark">' + ICON_MOON + 'Тёмная</button><button type="button" data-v2-mode="light">' + ICON_SUN + 'Светлая</button></div>' +
      '<div class="v2-range"><label for="v2-k">Насыщенность</label><input id="v2-k" type="range" min="0" max="100" step="5"><b class="v2-kval"></b></div>';
    document.body.appendChild(pop);
    var sw = pop.querySelector('.v2-swatches');
    THEMES.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'v2-sw'; b.title = t[0]; b.setAttribute('aria-label', 'Тема ' + t[0]);
      b.style.background = t[1] ? 'linear-gradient(135deg,' + t[1] + ',' + t[2] + ')' : '#2A2A2C';
      b.addEventListener('click', function () { state.theme = i; apply(); sync(pop); save(); });
      sw.appendChild(b);
    });
    [].forEach.call(pop.querySelectorAll('[data-v2-mode]'), function (b) {
      b.addEventListener('click', function () { state.mode = b.getAttribute('data-v2-mode'); apply(); sync(pop); save(); });
    });
    pop.querySelector('input[type=range]').addEventListener('input', function (e) { state.k = Number(e.target.value) / 100; apply(); sync(pop); save(); });
    sync(pop);

    function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); var open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); } });

    // зачем: старая кнопка «Светлая / тёмная тема» в меню языка остаётся и переключает новую тему
    var legacy = document.getElementById('theme-toggle');
    if (legacy) legacy.addEventListener('click', function () { state.mode = state.mode === 'dark' ? 'light' : 'dark'; apply(); sync(pop); save(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.__pmSiteTheme = { state: state, apply: apply, themes: THEMES };
})();

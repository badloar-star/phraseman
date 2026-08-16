/* Phraseman — общий скрипт дизайн-системы сайта (редизайн 2026-08-16).
   Тема, переключатель языка, меню магазинов, мобильная навигация,
   появление секций при скролле, магнитная кнопка, FAQ-аккордеон.

   зачем: один файл на все страницы вместо пяти разных — правка поведения
   делается в одном месте, браузер кэширует его между переходами. */
(function () {
  'use strict';

  /* Помечаем, что JS жив: только тогда .reveal прячет контент.
     зачем: без JS (и в поисковом рендере) секции обязаны быть видимыми. */
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ Тема ============ */
  (function theme() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var wrap = btn.querySelector('.icon-wrap');

    function current() {
      var attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark' || attr === 'light') return attr;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function syncLabel() {
      var next = current() === 'light' ? 'тёмную' : 'светлую';
      btn.setAttribute('aria-label', 'Переключить на ' + next + ' тему');
      btn.setAttribute('aria-pressed', String(current() === 'dark'));
    }
    syncLabel();

    btn.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* приватный режим */ }
      syncLabel();
      if (wrap && !reduceMotion) {
        wrap.classList.remove('is-spinning');
        void wrap.offsetWidth; /* перезапуск анимации при быстрых кликах */
        wrap.classList.add('is-spinning');
        wrap.addEventListener('animationend', function () { wrap.classList.remove('is-spinning'); }, { once: true });
      }
    });
  })();

  /* ============ Язык ============ */
  /* Страница задаёт window.I18N = { ru: {}, en: {ключ: текст} } ДО этого файла.
     Русский словарь собирается из самой разметки, поэтому страницы отдают
     пустой ru: {} — возврат на русский всегда восстанавливает исходный текст.
     зачем: русский — язык по умолчанию (решение владельца), вся SEO-разметка
     на нём; английский накладывается поверх. */
  (function lang() {
    var buttons = document.querySelectorAll('[data-lang-btn]');
    if (!buttons.length) return;
    var toggle = document.querySelector('.lang-toggle');
    var LANG_KEY = 'knowly_site_locale_v1';

    var autoRu = {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      autoRu[el.getAttribute('data-i18n')] = el.innerHTML;
    });
    var autoRuPlaceholder = {};
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      autoRuPlaceholder[el.getAttribute('data-i18n-placeholder')] = el.getAttribute('placeholder');
    });

    window.I18N = window.I18N || {};
    window.I18N.ru = Object.assign({}, autoRu, window.I18N.ru || {});

    function apply(language, animate) {
      var dict = window.I18N[language];
      if (!dict) return;
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        var value = dict[key] !== undefined ? dict[key] : autoRu[key];
        if (value === undefined) return;
        el.innerHTML = value;
        if (animate && !reduceMotion) {
          el.classList.remove('i18n-anim');
          void el.offsetWidth;
          el.classList.add('i18n-anim');
        }
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-placeholder');
        var value = dict[key] !== undefined ? dict[key] : autoRuPlaceholder[key];
        if (value !== undefined) el.setAttribute('placeholder', value);
      });
      document.documentElement.setAttribute('lang', language);
      if (toggle) toggle.setAttribute('data-active', language);
      buttons.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-lang-btn') === language);
      });
      try { localStorage.setItem(LANG_KEY, language); } catch (e) { /* приватный режим */ }
      /* зачем: страницы (например, сертификат подарка) пересобирают свой текст
         под новый язык — им нужен сигнал, а не опрос localStorage в цикле */
      document.dispatchEvent(new CustomEvent('pm:lang', { detail: { lang: language } }));
    }

    /* зачем: тот же ключ, что у старой системы site-i18n.js — иначе язык
       «прыгает» при переходе между перенесёнными и ещё старыми страницами.
       Поддержан и ?lang=en в адресе: по нему приходят из рекламы. */
    var stored = 'ru';
    try {
      var fromQuery = new URLSearchParams(location.search).get('lang');
      stored = fromQuery || localStorage.getItem(LANG_KEY) || 'ru';
    } catch (e) { /* приватный режим */ }
    if (stored !== 'ru' && stored !== 'en') stored = 'ru';
    apply(stored, false);

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-lang-btn'), true); });
    });
  })();

  /* ============ Меню магазинов ============
     зачем: владелец 2026-08-16 — «при нажатии на скачать с телефона должно
     переводить сразу на стор, как было раньше». Возвращено поведение старого
     home.js: на телефоне и планшете кнопка ведёт прямо в нужный магазин,
     на компьютере — открывает меню выбора платформы.
     Кнопке заранее проставляется data-store, чтобы stats.js посчитал клик
     ДО перехода (его слушатель на фазе погружения, beacon переживает уход). */
  (function storeMenu() {
    var triggers = document.querySelectorAll('.js-store-toggle');
    if (!triggers.length) return;

    var ua = navigator.userAgent || '';
    var isIos = /iPhone|iPad|iPod/i.test(ua);
    var isAndroid = /Android/i.test(ua);
    var isNarrow = window.matchMedia('(max-width: 720px)').matches;
    var isTouch = window.matchMedia('(hover: none)').matches;
    var goStraightToStore = isIos || isAndroid || (isNarrow && isTouch);

    if (goStraightToStore) {
      var cfg = window.KNOWLY_SITE || {};
      var storeUrl = isIos
        ? (cfg.storeIos || 'https://apps.apple.com/app/id6764800879')
        : (cfg.storeAndroid || 'https://play.google.com/store/apps/details?id=app.phraseman');

      triggers.forEach(function (btn) {
        btn.setAttribute('data-store', isIos ? 'ios' : 'android');
        btn.setAttribute('aria-haspopup', 'false');
        btn.removeAttribute('aria-expanded');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          location.href = storeUrl;
        });
      });
      return; /* меню на телефоне не нужно — уходим сразу в магазин */
    }

    function closeAll(except) {
      document.querySelectorAll('.store-menu.is-open').forEach(function (menu) {
        if (menu === except) return;
        menu.classList.remove('is-open');
        var t = document.querySelector('[aria-controls="' + menu.id + '"]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }

    triggers.forEach(function (btn) {
      var menu = document.getElementById(btn.getAttribute('aria-controls'));
      if (!menu) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeAll(menu);
        var open = menu.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', function (e) {
      document.querySelectorAll('.store-menu.is-open').forEach(function (menu) {
        var trigger = document.querySelector('[aria-controls="' + menu.id + '"]');
        if (menu.contains(e.target) || (trigger && trigger.contains(e.target))) return;
        menu.classList.remove('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openMenu = document.querySelector('.store-menu.is-open');
      if (!openMenu) return;
      closeAll(null);
      /* зачем: фокус обязан вернуться на кнопку, иначе после Esc он теряется */
      var trigger = document.querySelector('[aria-controls="' + openMenu.id + '"]');
      if (trigger) trigger.focus();
    });
  })();

  /* ============ Мобильная навигация ============ */
  (function mobileNav() {
    var toggle = document.querySelector('.menu-toggle');
    var links = document.querySelector('.nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ============ Появление секций при скролле ============ */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    /* Страховка: если через 2.5с наблюдатель так и не сработал (фоновая
       вкладка, скриншотер, часть поисковых рендеров) — показываем блоки,
       которые СЕЙЧАС в зоне видимости. Остальные ждут прокрутки — иначе
       анимация появления при скролле не работала бы вовсе.
       зачем: владелец 2026-08-16 — «верни анимацию появления блоков при
       скролле вниз»: прежняя страховка раскрывала сразу всю страницу и
       съедала эффект. Контент важнее анимации, но только тот, что виден. */
    setTimeout(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.classList.add('is-in');
      });
    }, 2500);
  })();

  /* ============ Искры по клику (возвращено со старого сайта) ============
     зачем: владелец 2026-08-16 — «верни анимации кликов». Восемь штрихов
     разлетаются из точки нажатия и гаснут за полсекунды. Работает на всех
     главных кнопках сайта; при системной настройке «меньше движения» и на
     клавиатурных нажатиях (нет координат) эффект молчит. */
  (function sparks() {
    if (reduceMotion) return;
    if (typeof Element.prototype.animate !== 'function') return; /* старые браузеры */

    var COUNT = 8;
    var DISTANCE = 46;
    var DURATION = 520;

    function burst(event, btn) {
      if (!event.clientX && !event.clientY) return; /* нажали с клавиатуры */
      var rect = btn.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;

      for (var k = 0; k < COUNT; k++) {
        var spark = document.createElement('i');
        spark.className = 'spark';
        spark.setAttribute('aria-hidden', 'true');
        btn.appendChild(spark);

        var angle = (k / COUNT) * Math.PI * 2;
        var deg = (angle * 180) / Math.PI + 90;
        spark.animate(
          [
            { transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + deg + 'deg)', opacity: 1 },
            {
              transform: 'translate(' + (x + Math.cos(angle) * DISTANCE) + 'px,'
                + (y + Math.sin(angle) * DISTANCE) + 'px) rotate(' + deg + 'deg) scaleY(.3)',
              opacity: 0,
            },
          ],
          { duration: DURATION, easing: 'cubic-bezier(.23,1,.32,1)' },
        );
        /* Убираем узел, как только анимация доиграла — иначе кнопка
           обрастает мусором при частых нажатиях. */
        (function (el) {
          setTimeout(function () { el.remove(); }, DURATION + 20);
        })(spark);
      }
    }

    /* Делегирование: ловим клики по всем кнопкам разом, включая те, что
       появились позже (кнопки языка, элементы квиза).
       зачем: слушаем на ФАЗЕ ПОГРУЖЕНИЯ (true) — обработчик меню магазинов
       вызывает stopPropagation(), и на всплытии клик до документа уже не
       доходил, поэтому искры не появлялись. */
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var btn = e.target.closest('.btn-primary, .btn-gold, .js-store-toggle, .tg-btn, .btn-outline');
      if (!btn) return;
      burst(e, btn);
    }, true);
  })();

  /* ============ FAQ-аккордеон ============ */
  (function faq() {
    var questions = document.querySelectorAll('.faq-q');
    if (!questions.length) return;

    function openItem(item) {
      var answer = item.querySelector('.faq-a');
      item.classList.add('open');
      var q = item.querySelector('.faq-q');
      if (q) q.setAttribute('aria-expanded', 'true');
      if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
    }
    function closeItem(item) {
      var answer = item.querySelector('.faq-a');
      item.classList.remove('open');
      var q = item.querySelector('.faq-q');
      if (q) q.setAttribute('aria-expanded', 'false');
      if (answer) answer.style.maxHeight = null;
    }

    questions.forEach(function (q) {
      var item = q.parentElement;
      q.setAttribute('aria-expanded', String(item.classList.contains('open')));
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        item.parentElement.querySelectorAll('.faq-item.open').forEach(closeItem);
        if (!isOpen) openItem(item);
      });
    });

    function measureOpen() {
      document.querySelectorAll('.faq-item.open .faq-a').forEach(function (a) {
        a.style.maxHeight = a.scrollHeight + 'px';
      });
    }
    /* Меряем сразу и после загрузки шрифтов: высота ответа зависит от шрифта */
    measureOpen();
    window.addEventListener('load', measureOpen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureOpen);
    /* зачем: смена языка меняет длину ответа — открытый пункт надо перемерить */
    document.addEventListener('pm:lang', function () { requestAnimationFrame(measureOpen); });
  })();
})();

/* Живые данные главной страницы: выбор языка теста и счётчик пройденных.
   зачем: владелец 2026-08-16 — выбор языка должен переключаться ПРЯМО на
   главной (раньше каждая кнопка сразу уводила на страницу теста), а кнопка
   «Начать тест» — вести на страницу теста с УЖЕ выбранным языком, не
   запуская тест сразу. Счётчик показывает число выбранного языка.

   Число обязано быть настоящим (требование владельца), а не витринным.
   Оптимистичный порядок: сначала мгновенно рисуем кэш из прошлого визита,
   потом уточняем сетью. Экрана ожидания и прыжка «0 → N» не возникает. */
(function () {
  'use strict';

  var counter = document.getElementById('testCnt');
  var startBtn = document.getElementById('startTestBtn');
  var buttons = [].slice.call(document.querySelectorAll('[data-test-lang]'));

  var CACHE_KEY = 'english_test_completed_cache_by_language_v1';
  var CHOICE_KEY = 'pm_test_lang_choice_v1';
  var DEFAULT_LANG = 'en';

  /* Счёт по всем языкам: сначала из кэша, потом уточняется с сервера. */
  var counts = null;
  var current = DEFAULT_LANG;

  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (parsed && parsed.values && typeof parsed.values === 'object') return parsed.values;
    } catch (e) { /* кэш необязателен */ }
    return null;
  }

  function renderCount() {
    if (!counter) return;
    var value = counts ? counts[current] : undefined;
    /* Ноль — честный ответ, но «0+ / более 0 учеников» читается как поломка.
       зачем: пока язык никто не проходил, показываем прочерк вместо нуля —
       врать нельзя, но и пугать пустой цифрой не нужно. */
    if (!Number.isSafeInteger(value) || value <= 0) {
      counter.textContent = '—';
      return;
    }
    counter.textContent = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '+';
  }

  function selectLang(lang, remember) {
    current = lang;
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-test-lang') === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    /* Кнопка ведёт на страницу теста с предвыбранным языком — там человек
       ещё раз видит выбор и сам жмёт «начать». Тест не стартует сам.
       зачем: параметр называется именно `test` (см. resolveTestLanguage в
       english-level-test/i18n.js). С `lang` страница открывалась на
       английском независимо от выбора — проверено, это был живой баг. */
    if (startBtn) {
      startBtn.href = lang === DEFAULT_LANG
        ? '/english-level-test/'
        : '/english-level-test/?test=' + encodeURIComponent(lang);
    }
    renderCount();
    if (remember) {
      try { localStorage.setItem(CHOICE_KEY, lang); } catch (e) { /* приватный режим */ }
    }
  }

  /* Восстанавливаем прошлый выбор: человек вернулся — язык тот же. */
  var saved = DEFAULT_LANG;
  try {
    var stored = localStorage.getItem(CHOICE_KEY);
    if (stored && buttons.some(function (b) { return b.getAttribute('data-test-lang') === stored; })) saved = stored;
  } catch (e) { /* приватный режим */ }

  counts = readCache();
  selectLang(saved, false);

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      selectLang(b.getAttribute('data-test-lang'), true);
    });
  });

  if (!counter) return;

  fetch('/api/english-test', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data || !data.ok || !data.completedByLanguage) return;
      counts = data.completedByLanguage;
      renderCount();
      /* зачем: кладём в тот же кэш, что читает страница теста — следующий
         визит показывает свежее число мгновенно, без обращения к сети */
      try {
        var store = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
        store.values = Object.assign({}, store.values, data.completedByLanguage);
        store.fetchedAt = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(store));
      } catch (e) { /* приватный режим */ }
    })
    .catch(function () { /* кэшированное значение остаётся видимым */ });
})();

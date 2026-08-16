/* Живые данные главной страницы. Сейчас это счётчик пройденных тестов уровня.
   зачем: число обязано быть настоящим (требование владельца), а не витринным.
   Переносится один в один из прежнего home.js при редизайне 2026-08-16.

   Оптимистичный порядок: сначала мгновенно рисуем кэш из прошлого визита,
   потом уточняем сетью. Экрана ожидания и прыжка «0 → N» не возникает. */
(function () {
  'use strict';

  var el = document.getElementById('testCnt');
  if (!el) return;

  var CACHE_KEY = 'english_test_completed_cache_by_language_v1';

  function render(count) {
    /* Неразрывные пробелы в разрядах: «1 247+» не переносится по строке */
    el.textContent = Number.isSafeInteger(count) && count >= 0
      ? String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '+'
      : '—';
  }

  var cached = 0;
  try {
    var parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (parsed && parsed.values && Number.isSafeInteger(parsed.values.en)) cached = parsed.values.en;
  } catch (e) { /* кэш необязателен */ }
  if (cached > 0) render(cached);

  fetch('/api/english-test', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      var completed = data && data.ok && data.completedByLanguage && data.completedByLanguage.en;
      if (!Number.isSafeInteger(completed) || completed < 0) return;
      render(completed);
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

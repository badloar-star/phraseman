(function () {
  'use strict';

  window.renderProductSessions = function renderProductSessions(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var buckets = Array.isArray(data.buckets) ? data.buckets : [];
    var entries = Array.isArray(data.entryScreens) ? data.entryScreens : [];
    var lasts = Array.isArray(data.lastObservedScreens) ? data.lastObservedScreens : [];
    var hasSummary = ['started', 'observed', 'resumed', 'avgScreens'].some(function (key) {
      return L.finite(data[key]) != null;
    });
    if (!hasSummary && !buckets.length && !entries.length && !lasts.length) {
      return L.empty('Сессий за выбранный период пока нет.');
    }
    var summary = L.cards([
      { label: 'Сессии со стартом', value: L.number(data.started) },
      { label: 'Все наблюдаемые сессии', value: L.number(data.observed) },
      { label: 'Возвраты из фона', value: L.number(data.resumed) },
      { label: 'Экранов за сессию', value: L.number(data.avgScreens) },
      { label: 'Медиана длительности', value: L.duration(data.p50ObservedDurationMs) },
      { label: '90-й перцентиль', value: L.duration(data.p90ObservedDurationMs) },
    ]);
    var bucketTable = L.table([
      { key: 'id', label: 'Длительность', format: L.humanize },
      { key: 'count', label: 'Сессии', format: L.number },
    ], buckets, 'Распределение по длительности ещё не сформировано.');
    var entryTable = L.table([
      { key: 'screenId', label: 'Первый экран', format: L.humanize },
      { key: 'sessions', label: 'Сессии', format: L.number },
    ], entries.slice(0, 20), 'Начальные экраны пока не определены.');
    var lastTable = L.table([
      { key: 'screenId', label: 'Последний экран', format: L.humanize },
      { key: 'sessions', label: 'Сессии', format: L.number },
    ], lasts.slice(0, 20), 'Последние экраны пока не определены.');
    return summary
      + '<div class="pa-note">Сессии без стартового события: ' + L.number(data.withoutStartInWindow)
      + '. Они могли начаться до выбранного окна.</div>'
      + '<h4>Распределение по длительности</h4>' + bucketTable
      + '<h4>Точки входа</h4>' + entryTable
      + '<h4>Последний наблюдаемый экран</h4>' + lastTable;
  };
})();

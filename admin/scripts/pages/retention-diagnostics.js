(function () {
  'use strict';

  window.renderRetentionDiagnostics = function renderRetentionDiagnostics(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var activation = data.activation || {};
    var retention = data.trueRetention || {};
    var observed = data.observedReturn || {};
    var acquisition = data.acquisition || {};
    var channels = acquisition.firebaseFirstTouch && Array.isArray(acquisition.firebaseFirstTouch.channels)
      ? acquisition.firebaseFirstTouch.channels : [];
    var cohorts = Array.isArray(retention.cohorts) ? retention.cohorts : [];
    if (L.finite(activation.cohort_app_instances) == null && !channels.length && !cohorts.length) {
      return L.empty('Данных об активации и возвратах пока нет.');
    }
    var html = L.cards([
      { label: 'Новые наблюдаемые установки', value: L.number(activation.cohort_app_instances) },
      { label: 'Завершили онбординг', value: L.percent(activation.onboarding_rate) },
      { label: 'Начали обучение', value: L.percent(activation.learning_start_rate) },
      { label: 'Завершили обучение', value: L.percent(activation.learning_completion_rate) },
      { label: 'Вернулись за 72 часа', value: L.percent(activation.return_within_72h_rate) },
      { label: 'Точный D7', value: L.percent(retention.exact_d7_rate) },
      { label: 'Возврат D7 старого окна', value: L.percent(observed.d7_rate), note: 'Диагностический расчёт внутри выбранного окна.' },
    ]);
    html += '<h4>Каналы первого касания</h4>' + L.table([
      { key: 'channel', label: 'Канал', format: L.humanize },
      { key: 'consented_first_touch_app_instances', label: 'Установки с согласием', format: L.number },
    ], channels, 'Каналы пока не определены.');
    html += '<h4>Когорты удержания</h4>' + L.table([
      { key: 'cohort_date', label: 'Когорта' },
      { key: 'cohort_app_instances', label: 'Установки', format: L.number },
      { key: 'exact_d1_rate', label: 'D1 точный', format: L.percent },
      { key: 'rolling_d1_rate', label: 'D1 rolling', format: L.percent },
      { key: 'exact_d7_rate', label: 'D7 точный', format: L.percent },
      { key: 'rolling_d7_rate', label: 'D7 rolling', format: L.percent },
      { key: 'exact_d30_rate', label: 'D30 точный', format: L.percent },
    ], cohorts.slice(0, 40), 'Зрелых когорт пока нет.');
    return html;
  };

  window.renderExperimentsAndReliability = function renderExperimentsAndReliability(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var experiments = data.experiments || {};
    var reliability = data.reliability || {};
    var exposures = Array.isArray(experiments.exposures) ? experiments.exposures : [];
    var releases = Array.isArray(reliability.releaseAdoption) ? reliability.releaseAdoption : [];
    var failures = Array.isArray(reliability.operationFailures) ? reliability.operationFailures : [];
    return {
      experiments: exposures.length ? L.table([
        { key: 'experiment_id', label: 'Эксперимент', format: L.humanize },
        { key: 'variant_id', label: 'Вариант', format: L.humanize },
        { key: 'surface', label: 'Поверхность', format: L.humanize },
        { key: 'exposures', label: 'Показы', format: L.number },
        { key: 'consented_app_instances', label: 'Установки', format: L.number },
      ], exposures, 'Экспозиции экспериментов не найдены.')
        + '<div class="pa-note">Автоматический выбор победителя: '
        + (experiments.automaticWinnerSelection ? 'включён' : 'выключен до зрелости метрик') + '.</div>'
        : L.empty('Активных экспериментальных экспозиций нет.'),
      reliability: '<h4>Принятие версий</h4>' + L.table([
        { key: 'app_version', label: 'Версия' },
        { key: 'build_number', label: 'Сборка' },
        { key: 'platform', label: 'Платформа', format: L.humanize },
        { key: 'consented_app_instances', label: 'Установки', format: L.number },
        { key: 'consented_sessions', label: 'Сессии', format: L.number },
      ], releases.slice(0, 40), 'Нет данных по версиям.')
        + '<h4>Нормализованные сбои операций</h4>' + L.table([
          { key: 'feature', label: 'Функция', format: L.humanize },
          { key: 'operation', label: 'Операция', format: L.humanize },
          { key: 'failure_code', label: 'Код', format: L.humanize },
          { key: 'app_version', label: 'Версия' },
          { key: 'platform', label: 'Платформа', format: L.humanize },
          { key: 'failures', label: 'Сбои', format: L.number },
          { key: 'affected_consented_app_instances', label: 'Установки', format: L.number },
        ], failures.slice(0, 60), 'Сбоев операций не зафиксировано.')
        + '<div class="pa-note">Crash-free, ANR и нативный cold start показываются только после подключения агрегированных экспортов; отсутствие источника не считается нулём.</div>',
    };
  };
})();

(function learningDiagnosticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const number = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const percent = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? (Number(value) * 100).toFixed(1) + '%' : '–';
  const duration = (value) => {
    const parsed = Number(value);
    if (value == null || value === '' || !Number.isFinite(parsed)) return '–';
    return parsed < 60000 ? Math.round(parsed / 1000) + ' с' : (parsed / 60000).toFixed(1) + ' мин';
  };

  window.renderLearningDiagnostics = function renderLearningDiagnostics(data) {
    const root = document.getElementById('product-analytics-learning-dropoff');
    if (!root) return;
    const summary = data && typeof data === 'object' ? data : {};
    const checkpoints = Array.isArray(summary.checkpoints) ? summary.checkpoints : [];
    const ranked = [...checkpoints].sort((a, b) => Number(b.abandons || 0) - Number(a.abandons || 0) || Number(b.answer_error_rate || 0) - Number(a.answer_error_rate || 0));
    const rows = ranked.map((row) => {
      const phrase = Number.isFinite(Number(row.phrase_index)) ? Number(row.phrase_index) + 1 : '–';
      const total = Number.isFinite(Number(row.total_phrases)) ? Number(row.total_phrases) : '–';
      return '<tr>' + [number(row.lesson_id), phrase + ' / ' + total, number(row.answers), number(row.incorrect_answers), percent(row.answer_error_rate), number(row.abandons), number(row.app_instances)]
        .map((cell) => '<td>' + esc(cell) + '</td>').join('') + '</tr>';
    }).join('');

    root.innerHTML = '<div class="an2-grid" style="margin-bottom:12px">' +
      language.metricCard('Ответы в уроках', number(summary.answers), 'События ответов за выбранный период только у пользователей, разрешивших аналитику.') +
      language.metricCard('Доля ответов с детализацией', percent(summary.checkpoint_coverage_rate), 'Доля ответов, где известны номер текущей фразы и полное количество фраз в уроке.') +
      language.metricCard('Явные выходы из урока', number(summary.abandons), 'Выходы из незавершённого урока по явному действию; сворачивание приложения сюда не входит.') +
      language.metricCard('Доля выходов с детализацией', percent(summary.abandon_checkpoint_coverage_rate), 'Доля явных выходов, где известны номер фразы и размер урока.') +
      language.metricCard('Уникальные попытки урока', number(summary.distinct_started_attempts), 'Количество разных номеров попытки, полученных при запуске урока.') +
      language.metricCard('Доля данных с детализацией', percent(summary.lesson_attempt_id_coverage_rate), 'Доля событий урока, в которых есть номер конкретной попытки.') +
      language.metricCard('У половины до конца или выхода', duration(summary.p50_terminal_elapsed_ms), 'Половина попыток завершилась или закончилась явным выходом не позже этого времени.') +
      language.metricCard('У 90% до конца или выхода', duration(summary.p90_terminal_elapsed_ms), '90% попыток завершились или закончились явным выходом не позже этого времени.') +
      '</div>' +
      '<div style="margin-bottom:10px;color:#94a3b8;font-size:12px;line-height:1.5">Фразы отсортированы сначала по числу явных выходов, затем по доле ошибок. Установки приложения — это экземпляры Firebase, а не гарантированно уникальные люди. Высокое значение помогает найти место для проверки, но не доказывает, что именно эта фраза заставила пользователя уйти.</div>' +
      '<div style="overflow:auto">' + (rows ? '<table style="width:100%;border-collapse:collapse;min-width:820px;font-size:12px"><thead><tr>' + [
        ['Урок', 'Номер или внутреннее название урока.'], ['Фраза / всего', 'Позиция фразы и полное количество фраз в уроке.'],
        ['Ответы', 'Сколько ответов было дано на этой позиции.'], ['Ошибки', 'Сколько ответов на этой позиции были неверными.'],
        ['Доля ошибок', 'Какая доля ответов на этой позиции была неверной.'], ['Явные выходы', 'Сколько попыток явно прервались на этой позиции.'],
        ['Установки приложения', 'Сколько установок приложения дали события для этой позиции. Это не гарантированно уникальные люди.'],
      ].map(([label, tip]) => language.header(label, tip)).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="reports-empty">За выбранный период нет данных по позициям в уроках.</div>') + '</div>';
  };
})();

(function productSessionsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const num = (value, digits = 0) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU', { maximumFractionDigits: digits }) : '–';
  const duration = (value) => {
    const ms = Number(value);
    if (value == null || value === '' || !Number.isFinite(ms)) return '–';
    return ms < 60000 ? Math.round(ms / 1000) + ' с' : (ms / 60000).toFixed(1) + ' мин';
  };

  function rows(items, labelKey, labelKind, labelTip) {
    const body = Array.isArray(items) && items.length
      ? items.slice(0, 12).map((item) => '<tr><td style="padding:7px;border-bottom:1px solid #1f2937">' + esc(labelKind ? language.label(labelKind, item[labelKey]) : item[labelKey]) + '</td><td style="padding:7px;border-bottom:1px solid #1f2937;text-align:right">' + esc(num(item.sessions ?? item.count)) + '</td></tr>').join('')
      : '<tr><td colspan="2" class="reports-empty">Подходящих сессий нет.</td></tr>';
    return '<thead><tr>' + language.header(labelTip[0], labelTip[1]) + language.header('Сессии', 'Количество наблюдаемых сессий в этой группе.') + '</tr></thead><tbody>' + body + '</tbody>';
  }

  window.renderProductSessions = function renderProductSessions(sessions) {
    const host = document.getElementById('product-analytics-sessions');
    if (!host) return;
    host.innerHTML = '<h3 title="Сводка сессий использования приложения" tabindex="0" aria-label="Сессии использования приложения. Сводка наблюдаемых сессий">Сессии использования приложения</h3>' +
      '<div style="font-size:12px;color:#fbbf24;margin-bottom:10px">Последний экран — это последнее согласованное событие, которое мы получили. Он не доказывает закрытие или удаление приложения.</div>' +
      '<div class="an2-grid" style="margin-bottom:12px">' +
        language.metricCard('Сессии с началом', num(sessions.started), 'Сессии, для которых в выбранном периоде получено событие начала.') +
        language.metricCard('Все наблюдаемые сессии', num(sessions.observed), 'Все сессии, собранные у установок приложения с разрешённой аналитикой.') +
        language.metricCard('Начало было раньше периода', num(sessions.withoutStartInWindow), 'Сессии с событиями внутри периода, но без события начала внутри выбранного окна.') +
        language.metricCard('Возвраты в приложение', num(sessions.resumed), 'События возвращения приложения из фона в активное состояние.') +
        language.metricCard('Экранов за сессию', num(sessions.avgScreens, 1), 'Среднее количество открытых экранов в одной наблюдаемой сессии.') +
        language.metricCard('У половины / у 90%', duration(sessions.p50ObservedDurationMs) + ' / ' + duration(sessions.p90ObservedDurationMs), 'Наблюдаемая длительность: половина сессий короче первого значения, 90% — короче второго.') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">' +
        '<div><h4 title="Распределение сессий по наблюдаемой длительности" tabindex="0" aria-label="Длительность сессий. Распределение по наблюдаемой длительности">Длительность сессий</h4><table style="width:100%">' + rows(sessions.buckets, 'id', 'durationBucket', ['Диапазон', 'Диапазон наблюдаемой длительности сессии.']) + '</table></div>' +
        '<div><h4 title="Экраны, с которых начинались наблюдаемые сессии" tabindex="0" aria-label="Первый экран сессии. Экраны, с которых начинались наблюдаемые сессии">Первый экран сессии</h4><table style="width:100%">' + rows(sessions.entryScreens, 'screenId', 'screen', ['Экран', 'Первый полученный экран наблюдаемой сессии.']) + '</table></div>' +
        '<div><h4 title="Последнее полученное событие экрана, не доказательство выхода" tabindex="0" aria-label="Последний наблюдаемый экран. Не доказывает выход или удаление приложения">Последний наблюдаемый экран</h4><table style="width:100%">' + rows(sessions.lastObservedScreens, 'screenId', 'screen', ['Экран', 'Последний экран, событие которого мы получили в сессии.']) + '</table></div>' +
      '</div>' +
      '<div style="margin-top:10px;color:#94a3b8;font-size:12px">Установки приложения — это экземпляры Firebase, а не гарантированно уникальные люди.</div>';
  };
})();

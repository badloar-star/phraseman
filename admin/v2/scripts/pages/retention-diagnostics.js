(function retentionDiagnosticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const num = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const pct = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? (Number(value) * 100).toFixed(1) + '%' : '–';
  const card = (label, rate, returned, eligible, explanation) => language.metricCard(label, pct(rate), num(returned) + ' вернулись из ' + num(eligible) + ' установок приложения, для которых прошло достаточно времени. ' + explanation);

  window.renderRetentionDiagnostics = function renderRetentionDiagnostics(data) {
    const root = document.getElementById('product-analytics-retention');
    if (!root) return;
    const cohorts = Array.isArray(data?.cohorts) ? data.cohorts : [];
    const rows = cohorts.map((row) => '<tr>' + [row.cohort_date, num(row.observed_new_instances), num(row.returned_d1) + ' / ' + num(row.eligible_d1), pct(row.d1_rate), num(row.returned_d7) + ' / ' + num(row.eligible_d7), pct(row.d7_rate), num(row.returned_d28) + ' / ' + num(row.eligible_d28), pct(row.d28_rate)]
      .map((cell) => '<td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' + esc(cell) + '</td>').join('') + '</tr>').join('');
    root.innerHTML = '<div class="an2-grid" style="margin-bottom:12px">' +
      card('Возврат на следующий день', data?.d1_rate, data?.returned_d1, data?.eligible_d1, 'Проверяется активность на следующий календарный день.') +
      card('Возврат через 7 дней', data?.d7_rate, data?.returned_d7, data?.eligible_d7, 'Проверяется активность на седьмой день после первого наблюдения.') +
      card('Возврат через 28 дней', data?.d28_rate, data?.returned_d28, data?.eligible_d28, 'Проверяется активность на двадцать восьмой день после первого наблюдения.') + '</div>' +
      '<div style="margin-bottom:10px;color:#94a3b8;font-size:12px;line-height:1.55">Группа начинается с первой наблюдаемой сессии установки приложения с разрешённой аналитикой внутри выбранного периода. В расчёт каждого срока входят только группы, для которых уже прошёл 1, 7 или 28 дней. Это не доказывает установку или удаление приложения: более ранняя история могла остаться за границами периода.</div>' +
      '<div style="overflow:auto">' + (rows ? '<table style="width:100%;border-collapse:collapse;min-width:900px;font-size:12px"><thead><tr>' + [
        ['Дата первого наблюдения', 'Дата первой сессии установки приложения, видимой в выбранном окне.'], ['Новые наблюдаемые установки', 'Установки приложения, впервые замеченные в эту дату внутри выбранного окна.'],
        ['На следующий день: вернулись / можно оценить', 'Вернувшиеся установки и все установки, для которых уже прошёл следующий день.'], ['Доля на следующий день', 'Доля установок, вернувшихся на следующий день.'],
        ['Через 7 дней: вернулись / можно оценить', 'Вернувшиеся установки и все установки, для которых уже прошло семь дней.'], ['Доля через 7 дней', 'Доля установок, вернувшихся на седьмой день.'],
        ['Через 28 дней: вернулись / можно оценить', 'Вернувшиеся установки и все установки, для которых уже прошло 28 дней.'], ['Доля через 28 дней', 'Доля установок, вернувшихся на двадцать восьмой день.'],
      ].map(([label, tip]) => language.header(label, tip)).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="reports-empty">За выбранный период пока нет групп, для которых можно посчитать возврат.</div>') + '</div>';
  };
})();

(function retentionDiagnosticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const RETENTION_DAYS = [1, 7, 14, 30];
  const num = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const pct = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? (Number(value) * 100).toFixed(1) + '%' : '–';
  const card = (label, rate, returned, eligible, explanation) => language.metricCard(label, pct(rate), num(returned) + ' вернулись из ' + num(eligible) + ' экземпляров приложения, для которых прошло достаточно времени. ' + explanation);

  function renderEvidenceRetention(root, data, observedData, activationData, acquisitionData, qualityData) {
    const cohorts = Array.isArray(data?.cohorts) ? data.cohorts : [];
    const channels = Array.isArray(acquisitionData?.firebaseFirstTouch?.channels)
      ? acquisitionData.firebaseFirstTouch.channels : [];
    const activationCard = (label, count, rate, explanation) => language.metricCard(
      label,
      pct(rate),
      num(count) + ' из ' + num(activationData?.cohort_app_instances) + ' экземпляров приложения с разрешённой аналитикой. ' + explanation,
    );
    const retentionCard = (day) => language.metricCard(
      'D' + day + ': точно / после D' + day,
      pct(data?.['exact_d' + day + '_rate']) + ' / ' + pct(data?.['rolling_d' + day + '_rate']),
      num(data?.['eligible_d' + day]) + ' созревших экземпляров приложения. Первое число — активность точно в D' + day + ', второе — в D' + day + ' или позже до границы данных.',
    );
    const cohortRows = cohorts.map((row) => '<tr>' + [
      row.cohort_date,
      num(row.cohort_app_instances),
      ...RETENTION_DAYS.flatMap((day) => [
        num(row['exact_returned_d' + day]) + ' / ' + num(row['rolling_returned_d' + day]) + ' / ' + num(row['eligible_d' + day]),
        pct(row['exact_d' + day + '_rate']) + ' / ' + pct(row['rolling_d' + day + '_rate']),
      ]),
    ].map((cell) => '<td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' + esc(cell) + '</td>').join('') + '</tr>').join('');
    const channelRows = channels.map((row) => '<tr><td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' +
      esc(String(row.channel || 'direct_or_unknown')) + '</td><td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' +
      esc(num(row.consented_first_touch_app_instances)) + '</td></tr>').join('');
    const importsMissing = acquisitionData?.storeImports?.status === 'unavailable_not_configured'
      || acquisitionData?.adSpendImports?.status === 'unavailable_not_configured';
    const cohortHeaders = [
      ['Дата first touch', 'Дата Firebase first touch у экземпляра приложения с разрешённой аналитикой.'],
      ['Когорта', 'Число экземпляров приложения с разрешённой аналитикой.'],
      ...RETENTION_DAYS.flatMap((day) => [
        ['D' + day + ': точно / после / знаменатель', 'Возврат точно в день, в этот день или позже, и число созревших экземпляров приложения.'],
        ['D' + day + ': точно / после', 'Две разные доли; они не смешиваются.'],
      ]),
    ];

    root.innerHTML =
      '<div style="margin-bottom:10px;color:#cbd5e1;font-size:13px;line-height:1.55">Воронка считает этапы только в порядке: first touch → онбординг → старт урока → завершение → возврат. Это экземпляры приложения с разрешённой аналитикой: не уникальные люди и не подтверждённые магазином установки.</div>' +
      '<div class="an2-grid" style="margin-bottom:12px">' +
        activationCard('Завершили онбординг', activationData?.onboarding_completed, activationData?.onboarding_rate, 'Измеримый финал после согласия.') +
        activationCard('Начали обучение', activationData?.learning_started, activationData?.learning_start_rate, 'Старт урока после онбординга.') +
        activationCard('Завершили первый блок', activationData?.learning_completed, activationData?.learning_completion_rate, 'Завершение урока после его старта.') +
        activationCard('Вернулись за 24–72 часа', activationData?.returned_within_72h, activationData?.return_within_72h_rate, 'Новая сессия после первого учебного блока.') +
      '</div>' +
      '<div class="an2-grid" style="margin-bottom:12px">' + RETENTION_DAYS.map(retentionCard).join('') + '</div>' +
      '<div style="margin-bottom:10px;color:#94a3b8;font-size:12px;line-height:1.55">Покрытие валидным first touch: ' + pct(qualityData?.first_touch_coverage_rate) +
        ' (' + num(qualityData?.valid_first_touch_app_instances) + ' валидных экземпляров, ' + num(qualityData?.invalid_or_missing_first_touch_app_instances) + ' без надёжной даты). Несозревшие когорты не попадают в знаменатель.</div>' +
      '<div style="overflow:auto;margin-bottom:14px">' + (cohortRows ? '<table style="width:100%;border-collapse:collapse;min-width:1180px;font-size:12px"><thead><tr>' +
        cohortHeaders.map(([label, tip]) => language.header(label, tip)).join('') + '</tr></thead><tbody>' + cohortRows + '</tbody></table>' :
        '<div class="reports-empty">Нет созревших first-touch когорт для этого периода.</div>') + '</div>' +
      '<div style="margin-bottom:8px;color:#e5e7eb;font-weight:700">Каналы first touch</div>' +
      '<div style="overflow:auto;margin-bottom:10px">' + (channelRows ? '<table style="width:100%;border-collapse:collapse;min-width:420px;font-size:12px"><thead><tr>' +
        language.header('Канал', 'Нормализованная группа; сырые UTM-значения не показываются.') +
        language.header('Экземпляры приложения', 'First-touch экземпляры приложения с разрешённой аналитикой; это не число людей и не магазинные установки.') +
        '</tr></thead><tbody>' + channelRows + '</tbody></table>' : '<div class="reports-empty">Каналы first touch пока не наблюдаются.</div>') + '</div>' +
      (importsMissing ? '<div style="margin-bottom:12px;color:#fbbf24;font-size:12px;line-height:1.55">Импорты App Store, Google Play и рекламных расходов не настроены. Отсутствующие данные не считаются нулём.</div>' : '') +
      '<details style="border-top:1px solid #1f2937;padding-top:8px"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;color:#cbd5e1;font-weight:700">Диагностика: первая наблюдаемая сессия в окне</summary>' +
        '<div style="color:#94a3b8;font-size:12px;line-height:1.55;margin:8px 0">Старая метрика начинает когорту с первой наблюдаемой сессии внутри выбранного окна. Она не доказывает установку или удаление приложения и сохранена для сравнения.</div>' +
        '<div class="an2-grid">' +
          card('Следующий день', observedData?.d1_rate, observedData?.returned_d1, observedData?.eligible_d1, '') +
          card('7-й день', observedData?.d7_rate, observedData?.returned_d7, observedData?.eligible_d7, '') +
          card('28-й день', observedData?.d28_rate, observedData?.returned_d28, observedData?.eligible_d28, '') +
        '</div></details>';
  }

  window.renderRetentionDiagnostics = function renderRetentionDiagnostics(data, observedData, activationData, acquisitionData, qualityData) {
    const root = document.getElementById('product-analytics-retention');
    if (!root) return;
    if (arguments.length > 1) {
      renderEvidenceRetention(root, data || {}, observedData || {}, activationData || {}, acquisitionData || {}, qualityData || {});
      return;
    }
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

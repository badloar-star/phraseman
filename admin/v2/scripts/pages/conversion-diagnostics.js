(function conversionDiagnosticsAdminV2() {
  'use strict';

  const language = window.AdminAnalyticsLanguage;
  const esc = language.esc;
  const num = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU') : '–';
  const pct = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? (Number(value) * 100).toFixed(1) + '%' : '–';
  const duration = (value) => {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '–';
    return Number(value) < 60000 ? Math.round(Number(value) / 1000) + ' с' : (Number(value) / 60000).toFixed(1) + ' мин';
  };
  const td = (value) => '<td style="padding:9px;border-bottom:1px solid #1f2937;color:#e5e7eb">' + esc(value) + '</td>';
  const headers = (items) => items.map(([label, tip]) => language.header(label, tip)).join('');

  window.renderConversionDiagnostics = function renderConversionDiagnostics(data) {
    const root = document.getElementById('product-analytics-conversion');
    if (!root) return;
    const contexts = Array.isArray(data?.contexts) ? data.contexts : [];
    const failures = Array.isArray(data?.failureReasons) ? data.failureReasons : [];
    const inventoryReadiness = Array.isArray(data?.inventoryReadiness) ? data.inventoryReadiness : [];
    const inventoryRows = inventoryReadiness.map((row) => '<tr>' + [language.label('context', row.context), language.label('source', row.source), pct(row.inventory_resolution_coverage_rate), num(row.inventory_resolved_impressions), num(row.inventory_ready_impressions), num(row.inventory_partial_core_impressions), num(row.inventory_no_core_packages_impressions), num(row.inventory_load_failed_impressions), num(row.default_cta_blocked_impressions), num(row.selected_plan_missing_impressions), num(row.lifetime_expected_missing_impressions), duration(row.p50_inventory_resolution_ms), duration(row.p90_inventory_resolution_ms)].map(td).join('') + '</tr>').join('');
    const rows = contexts.map((row) => '<tr>' + [language.label('context', row.context), language.label('source', row.source), num(row.distinct_paywall_impressions), pct(row.paywall_impression_id_coverage_rate), duration(row.p50_time_to_cta_ms), duration(row.p90_time_to_cta_ms), duration(row.p50_time_to_result_ms), duration(row.p90_time_to_result_ms), num(row.views), num(row.plan_selects), num(row.cta_clicks), num(row.store_starts), num(row.purchases), num(row.trials_started), num(row.purchase_failures), num(row.purchase_cancellations), pct(row.impression_cta_rate), pct(row.impression_store_start_rate), pct(row.impression_purchase_per_store_start_rate), num(row.closes), num(row.continue_free), num(row.legacy_views), num(row.legacy_purchases), num(row.app_instances)].map(td).join('') + '</tr>').join('');

    const inventoryHeaders = [
      ['Место показа', 'Сценарий приложения, в котором появился экран оплаты.'], ['Источник показа', 'Действие или экран, приведшие к показу оплаты.'],
      ['Доля данных с детализацией', 'Доля показов, для которых получен результат загрузки тарифов.'], ['Проверено', 'Показы с полученным результатом проверки тарифов.'],
      ['Все основные тарифы доступны', 'Показы, где были доступны месячный и годовой тарифы.'], ['Доступен только один тариф', 'Показы, где был доступен только месячный или только годовой тариф.'],
      ['Основных тарифов нет', 'Загрузка завершилась, но месячный и годовой тарифы не найдены.'], ['Загрузка не удалась', 'Первый запрос и автоматическая повторная попытка не дали тарифы.'],
      ['Возможна блокировка главной кнопки', 'Показы, где загрузка не удалась или отсутствовал годовой тариф по умолчанию. Это не число нажатий.'], ['Выбранный тариф отсутствует', 'Показы, где ранее выбранного тарифа не было в загруженном наборе.'],
      ['Пожизненный тариф ожидался, но отсутствовал', 'Показы, где пожизненный тариф был включён настройкой, но магазин его не вернул.'], ['У половины загрузка заняла', 'Половина проверок тарифов завершилась не позже этого времени.'],
      ['У 90% загрузка заняла', '90% проверок тарифов завершились не позже этого времени.'],
    ];
    const funnelHeaders = [
      ['Место показа', 'Сценарий приложения, в котором появился экран оплаты.'], ['Источник показа', 'Действие или экран, приведшие к показу оплаты.'],
      ['Показы экрана оплаты', 'Количество разных показов, определённых по номеру показа.'], ['Доля данных с детализацией', 'Доля событий, содержащих номер конкретного показа экрана оплаты.'],
      ['У половины до главной кнопки', 'Половина нажатий главной кнопки произошла не позже этого времени после показа.'], ['У 90% до главной кнопки', '90% нажатий главной кнопки произошли не позже этого времени после показа.'],
      ['У половины до результата', 'Половина результатов покупки пришла не позже этого времени после показа.'], ['У 90% до результата', '90% результатов покупки пришли не позже этого времени после показа.'],
      ['Все события показа', 'Все события открытия оплаты, включая старые без номера показа.'], ['Выборы тарифа', 'Сколько раз пользователи выбирали тариф.'],
      ['Нажатия главной кнопки', 'Сколько раз нажали основную кнопку продолжения или покупки.'], ['Открытия окна магазина', 'Сколько раз приложение начало системный процесс покупки.'],
      ['Успешные покупки в приложении', 'Клиентские сигналы успешной покупки. Серверная истина находится в разделе RevenueCat.'], ['Начали пробный период', 'Клиентские сигналы начала пробного периода.'],
      ['Ошибки покупки', 'Неуспешные результаты покупки, кроме отмены пользователем.'], ['Отменили покупку', 'Пользователь закрыл или отменил системный процесс покупки.'],
      ['Показы с нажатием главной кнопки', 'Доля показов, в которых нажали главную кнопку.'], ['После кнопки открыли магазин', 'Доля показов с нажатием, после которых открылось окно магазина.'],
      ['После магазина купили', 'Доля показов с открытием магазина, завершившихся клиентским сигналом покупки.'], ['Закрыли экран оплаты', 'Сколько раз экран оплаты закрыли.'],
      ['Продолжили бесплатно', 'Сколько раз выбрали продолжение без покупки.'], ['Старые показы без детализации', 'Исторические показы, которые нельзя связать с конкретным номером показа.'],
      ['Старые покупки без детализации', 'Исторические покупки, которые нельзя связать с конкретным номером показа.'], ['Установки приложения', 'Количество установок Firebase с событиями в этой строке; это не гарантированно уникальные люди.'],
    ];

    root.innerHTML = '<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #293548;border-radius:9px;color:#cbd5e1;font-size:12px;line-height:1.55"><b>Путь внутри приложения:</b> события Firebase показывают действия только пользователей, разрешивших аналитику. Успешная покупка здесь — сигнал приложения. <b>RevenueCat</b> в отдельном разделе ниже остаётся серверным источником истины по оплатам и подпискам. «Не определено» включает старые события без источника показа.</div>' +
      '<div style="margin-bottom:12px"><h4 title="Проверка доступности тарифов магазина при показе оплаты" tabindex="0" aria-label="Готовность магазина и тарифов. Проверка доступности тарифов при показе оплаты" style="margin:0 0 8px;color:#e5e7eb">Готовность магазина и тарифов</h4>' +
      '<div style="margin-bottom:8px;color:#94a3b8;font-size:12px;line-height:1.5">Состояние тарифов после первой загрузки и автоматической повторной попытки. Возможная блокировка означает отсутствие нужного тарифа или ошибку загрузки, а не подтверждённое неудачное нажатие.</div><div style="overflow:auto">' +
      (inventoryRows ? '<table style="width:100%;border-collapse:collapse;min-width:1280px;font-size:12px"><thead><tr>' + headers(inventoryHeaders) + '</tr></thead><tbody>' + inventoryRows + '</tbody></table>' : '<div class="reports-empty">За выбранный период нет данных о готовности магазина и тарифов.</div>') + '</div></div>' +
      '<div><h4 title="Переходы от показа экрана оплаты до результата покупки" tabindex="0" aria-label="Путь от показа до покупки. Переходы от показа оплаты до результата" style="margin:0 0 8px;color:#e5e7eb">Путь от показа до покупки</h4><div style="overflow:auto">' +
      (rows ? '<table style="width:100%;border-collapse:collapse;min-width:1980px;font-size:12px"><thead><tr>' + headers(funnelHeaders) + '</tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="reports-empty">За выбранный период нет событий пути до покупки.</div>') + '</div></div>' +
      '<div style="margin-top:12px"><h4 title="Сгруппированные причины неуспешной покупки" tabindex="0" aria-label="Причины ошибок покупки. Сгруппированные причины неуспешной покупки" style="margin:0 0 8px;color:#e5e7eb">Причины ошибок покупки</h4>' +
      (failures.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">' + failures.map((row) => '<div title="Количество событий ошибки и установок приложения с этой причиной" tabindex="0" aria-label="' + esc(language.label('failure', row.reason) + '. ' + num(row.events) + ' событий, ' + num(row.app_instances) + ' установок приложения') + '" style="padding:10px;border:1px solid #293548;border-radius:8px"><b>' + esc(language.label('failure', row.reason)) + '</b><div style="margin-top:5px;color:#94a3b8;font-size:12px">' + esc(num(row.events)) + ' событий · ' + esc(num(row.app_instances)) + ' установок приложения</div></div>').join('') + '</div>' : '<div class="reports-empty">За выбранный период ошибок покупки нет.</div>') + '</div>';
  };
})();

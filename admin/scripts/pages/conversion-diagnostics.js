(function () {
  'use strict';

  window.renderConversionDiagnostics = function renderConversionDiagnostics(input) {
    var L = window.AdminAnalyticsLanguage;
    var data = input && typeof input === 'object' ? input : {};
    var contexts = Array.isArray(data.contexts) ? data.contexts : [];
    var failures = Array.isArray(data.failureReasons) ? data.failureReasons : [];
    var inventory = Array.isArray(data.inventoryReadiness) ? data.inventoryReadiness : [];
    if (!contexts.length && !failures.length && !inventory.length) {
      return L.empty('Событий пути оплаты за выбранный период нет.');
    }
    var totals = contexts.reduce(function (result, row) {
      result.views += Number(row.views || 0);
      result.clicks += Number(row.cta_clicks || 0);
      result.starts += Number(row.store_starts || 0);
      result.purchases += Number(row.purchases || 0);
      return result;
    }, { views: 0, clicks: 0, starts: 0, purchases: 0 });
    var html = L.cards([
      { label: 'Показы оплаты', value: L.number(totals.views) },
      { label: 'Нажатия CTA', value: L.number(totals.clicks) },
      { label: 'Открытия магазина', value: L.number(totals.starts) },
      { label: 'Сигналы покупки', value: L.number(totals.purchases) },
      { label: 'Показ → CTA', value: L.percent(totals.views ? totals.clicks / totals.views : null) },
    ]);
    html += '<h4>По контекстам</h4>' + L.table([
      { key: 'context', label: 'Контекст', format: L.humanize },
      { key: 'source', label: 'Источник', format: L.humanize },
      { key: 'views', label: 'Показы', format: L.number },
      { key: 'cta_clicks', label: 'CTA', format: L.number },
      { key: 'store_starts', label: 'Магазин', format: L.number },
      { key: 'purchases', label: 'Покупки', format: L.number },
      { key: 'impression_cta_rate', label: 'Показ → CTA', format: L.percent },
      { key: 'impression_purchase_per_store_start_rate', label: 'Магазин → покупка', format: L.percent },
    ], contexts.slice(0, 50), 'Нет разбивки по контекстам.');
    html += '<h4>Ошибки покупки</h4>' + L.table([
      { key: 'reason', label: 'Причина', format: L.humanize },
      { key: 'events', label: 'События', format: L.number },
      { key: 'app_instances', label: 'Затронутые установки', format: L.number },
    ], failures, 'Ошибки покупки не зафиксированы.');
    html += '<h4>Готовность товаров магазина</h4>' + L.table([
      { key: 'context', label: 'Контекст', format: L.humanize },
      { key: 'source', label: 'Источник', format: L.humanize },
      { key: 'shown_impressions', label: 'Показы', format: L.number },
      { key: 'inventory_resolution_coverage_rate', label: 'Проверено', format: L.percent },
      { key: 'default_cta_blocked_rate', label: 'CTA заблокирован', format: L.percent },
      { key: 'p90_inventory_resolution_ms', label: 'P90 проверки', format: L.duration },
    ], inventory.slice(0, 50), 'Нет данных о готовности товаров.');
    return html;
  };
})();

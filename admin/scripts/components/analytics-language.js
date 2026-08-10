(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function finite(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function number(value, fallback) {
    var parsed = finite(value);
    return parsed == null ? (fallback == null ? '—' : String(fallback)) : parsed.toLocaleString('ru-RU');
  }

  function percent(value, digits) {
    var parsed = finite(value);
    if (parsed == null) return '—';
    return (parsed * 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits == null ? 1 : digits,
    }) + '%';
  }

  function duration(value) {
    var ms = finite(value);
    if (ms == null) return '—';
    if (ms < 1000) return Math.round(ms) + ' мс';
    if (ms < 60000) return (ms / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' с';
    return (ms / 60000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' мин';
  }

  function dateTime(value) {
    var ms = finite(value);
    if (ms == null || ms <= 0) return '—';
    return new Date(ms).toLocaleString('ru-RU');
  }

  function moneyMicros(value) {
    var micros = finite(value);
    if (micros == null) return '—';
    return (micros / 1000000).toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  var labels = {
    missing_screen: 'Экран не указан',
    unknown_screen: 'Неизвестный экран',
    direct_or_unknown: 'Прямой / неизвестный канал',
    waiting_for_first_daily_export: 'Ожидается первая ежедневная выгрузка',
    available_consent_observed: 'Доступно по пользователям с согласием',
    unavailable_not_configured: 'Источник не подключён',
    unavailable_no_crashlytics_aggregate_export: 'Нет агрегированной выгрузки Crashlytics',
    unavailable_no_native_performance_export: 'Нет нативной выгрузки производительности',
    suppressed_small_sample: 'Скрыто: малая выборка',
    all: 'Все',
  };

  function humanize(value) {
    var key = String(value == null ? '' : value).trim();
    if (!key) return '—';
    if (labels[key]) return labels[key];
    return key.replace(/[_-]+/g, ' ').replace(/^\w/, function (char) { return char.toUpperCase(); });
  }

  function empty(message) {
    return '<div class="reports-empty pa-empty">' + escapeHtml(message || 'За выбранный период данных нет.') + '</div>';
  }

  function cards(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return '<div class="pa-card-grid">' + items.map(function (item) {
      var note = item.note ? '<div class="pa-card-note">' + escapeHtml(item.note) + '</div>' : '';
      return '<article class="pa-card"><div class="pa-card-label">' + escapeHtml(item.label) + '</div>'
        + '<div class="pa-card-value">' + escapeHtml(item.value) + '</div>' + note + '</article>';
    }).join('') + '</div>';
  }

  function table(columns, rows, emptyMessage) {
    if (!Array.isArray(rows) || !rows.length) return empty(emptyMessage);
    return '<div class="table-scroll"><table class="pa-table"><thead><tr>'
      + columns.map(function (column) { return '<th scope="col">' + escapeHtml(column.label) + '</th>'; }).join('')
      + '</tr></thead><tbody>' + rows.map(function (row) {
        return '<tr>' + columns.map(function (column) {
          var raw = row && row[column.key];
          var shown = column.format ? column.format(raw) : (raw == null || raw === '' ? '—' : raw);
          return '<td data-label="' + escapeHtml(column.label) + '">' + escapeHtml(shown) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('admin-root-analytics-styles')) return;
    var style = document.createElement('style');
    style.id = 'admin-root-analytics-styles';
    style.textContent = [
      '.pa-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin:8px 0 12px}',
      '.pa-card{min-width:0;padding:12px 13px;border:1px solid #273043;border-radius:10px;background:#111722}',
      '.pa-card-label{color:#94a3b8;font-size:11px;font-weight:750;line-height:1.35}',
      '.pa-card-value{margin-top:5px;color:#f8fafc;font-size:20px;font-weight:850;line-height:1.2}',
      '.pa-card-note{margin-top:5px;color:#64748b;font-size:10.5px;line-height:1.4}',
      '.pa-table{width:100%;min-width:560px;border-collapse:collapse;font-size:12px}',
      '.pa-table th{padding:8px;text-align:left;color:#94a3b8;font-weight:750;border-bottom:1px solid #303849;white-space:nowrap}',
      '.pa-table td{padding:8px;color:#dbe4f0;border-bottom:1px solid #202837;vertical-align:top}',
      '.pa-table tbody tr:hover{background:#171d29}',
      '.pa-empty{padding:22px 12px;color:#64748b}',
      '.pa-note{margin:8px 0;color:#94a3b8;font-size:11.5px;line-height:1.5}',
      '.pa-warning{padding:10px 12px;border:1px solid #713f12;border-radius:9px;background:#1a1606;color:#fbbf24;font-size:12px;line-height:1.5}',
      '#subscription-analytics-content>.pa-section{margin-top:12px;padding:14px;border:1px solid rgba(228,228,231,.1);border-radius:10px;background:#111318}',
      '#subscription-analytics-content>.pa-section h3{margin:0 0 9px;color:#e5e7eb;font-size:15px}',
      '@media(max-width:640px){.pa-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pa-card-value{font-size:17px}.pa-table{min-width:520px}}',
      '@media(prefers-reduced-motion:reduce){.pa-table tbody tr{transition:none!important}}',
    ].join('');
    document.head.appendChild(style);
  }

  installStyles();
  window.AdminAnalyticsLanguage = Object.freeze({
    escapeHtml: escapeHtml,
    finite: finite,
    number: number,
    percent: percent,
    duration: duration,
    dateTime: dateTime,
    moneyMicros: moneyMicros,
    humanize: humanize,
    empty: empty,
    cards: cards,
    table: table,
  });
})();

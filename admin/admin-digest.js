(function initAdminDigestV2() {
  'use strict';

  const KPI_LABELS = {
    newUsers: 'Новые пользователи',
    initialPaidEvents: 'Платные события',
    trialStarts: 'Начатые trial',
    renewals: 'Продления',
    refunds: 'Возвраты',
    reports: 'Репорты',
    criticalErrors: 'Критические ошибки',
  };

  function escapeText(value) {
    const node = document.createElement('span');
    node.textContent = String(value == null ? '' : value);
    return node.innerHTML;
  }

  function formatNumber(value) {
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('ru-RU')
      : 'Н/Д';
  }

  function formatDelta(comparison) {
    if (!comparison || typeof comparison.absoluteDelta !== 'number') return 'Н/Д';
    if (comparison.absoluteDelta === 0) return 'Без изменений';
    const sign = comparison.absoluteDelta > 0 ? '+' : '';
    const percent = typeof comparison.percentDelta === 'number'
      ? ` (${comparison.percentDelta > 0 ? '+' : ''}${comparison.percentDelta.toFixed(1)}%)`
      : ' (нет базы для %)';
    return `${sign}${formatNumber(comparison.absoluteDelta)}${percent}`;
  }

  function formatPeriod(windowValue) {
    if (!windowValue || !Number.isFinite(windowValue.startMs) || !Number.isFinite(windowValue.endMs)) return 'Период не указан';
    const start = new Date(windowValue.startMs).toLocaleString('ru-RU');
    const end = new Date(windowValue.endMs).toLocaleString('ru-RU');
    const hours = Math.round((windowValue.endMs - windowValue.startMs) / 3_600_000);
    return `${start} — ${end} · ${hours} ч`;
  }

  function coverageState(source) {
    const status = source && source.status;
    if (status === 'failed') return { label: 'Недоступен', className: 'dd-state-failed' };
    if (status === 'partial') return { label: 'Частично', className: 'dd-state-partial' };
    if (status === 'not_configured') return { label: 'Не подключён', className: 'dd-state-muted' };
    return { label: 'Полностью', className: 'dd-state-ok' };
  }

  function renderKpis(comparisons) {
    const entries = Object.entries(comparisons || {});
    if (!entries.length) return '<div class="reports-empty">Сравнительные показатели пока недоступны.</div>';
    return `<div class="dd-kpi-grid">${entries.map(([key, comparison]) => {
      const current = comparison && comparison.current;
      const currentLabel = current === 0 ? 'Нет событий' : formatNumber(current);
      return `<article class="dd-kpi">
        <div class="dd-kpi-label">${escapeText(KPI_LABELS[key] || key)}</div>
        <div class="dd-kpi-value">${escapeText(currentLabel)}</div>
        <div class="dd-kpi-previous">Ранее: ${escapeText(formatNumber(comparison && comparison.previous))}</div>
        <div class="dd-kpi-delta">${escapeText(formatDelta(comparison))}</div>
      </article>`;
    }).join('')}</div>`;
  }

  function renderComparisonChart(comparisons) {
    const entries = Object.entries(comparisons || {}).slice(0, 7);
    if (!entries.length) return '';
    const maxValue = Math.max(1, ...entries.flatMap(([, item]) => [Number(item.current) || 0, Number(item.previous) || 0]));
    return `<div class="dd-chart-card">
      <h3>Текущий и предыдущий равный период</h3>
      <div class="dd-chart-legend"><span><i class="dd-dot-current"></i>Текущий</span><span><i class="dd-dot-previous"></i>Предыдущий</span></div>
      ${entries.map(([key, item]) => {
        const currentWidth = Math.max(0, ((Number(item.current) || 0) / maxValue) * 100);
        const previousWidth = Math.max(0, ((Number(item.previous) || 0) / maxValue) * 100);
        return `<div class="dd-bar-row">
          <div class="dd-bar-label">${escapeText(KPI_LABELS[key] || key)}</div>
          <div class="dd-bar-track" title="Текущий период: ${escapeText(formatNumber(item.current))}"><span class="dd-bar-current" style="width:${currentWidth}%"></span></div>
          <div class="dd-bar-track" title="Предыдущий период: ${escapeText(formatNumber(item.previous))}"><span class="dd-bar-previous" style="width:${previousWidth}%"></span></div>
          <div class="dd-bar-values">${escapeText(formatNumber(item.current))} / ${escapeText(formatNumber(item.previous))}</div>
        </div>`;
      }).join('')}
      <table class="dd-data-table"><caption>Табличная версия сравнительного графика</caption><thead><tr><th>Метрика</th><th>Текущий</th><th>Предыдущий</th></tr></thead><tbody>
        ${entries.map(([key, item]) => `<tr><td>${escapeText(KPI_LABELS[key] || key)}</td><td>${escapeText(formatNumber(item.current))}</td><td>${escapeText(formatNumber(item.previous))}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }

  function installStyles() {
    if (document.getElementById('admin-digest-v2-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-digest-v2-styles';
    style.textContent = `
      #tab-daily-digest { --dd-accent:#60a5fa; --dd-good:#84cc16; --dd-warn:#f59e0b; --dd-bad:#f87171; }
      #dd-period { padding:12px 14px; margin-bottom:12px; background:#11141b; border:1px solid #282d38; border-radius:10px; color:#d4d4d8; line-height:1.55; }
      .dd-period-main { font-size:14px; font-weight:700; color:#f4f4f5; }
      .dd-period-compare { margin-top:4px; font-size:12px; color:#a1a1aa; }
      .dd-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-bottom:14px; }
      .dd-kpi { background:#11141b; border:1px solid #282d38; border-radius:10px; padding:13px; min-height:118px; }
      .dd-kpi-label { font-size:11px; color:#a1a1aa; min-height:32px; }
      .dd-kpi-value { font-size:25px; font-weight:800; color:#f4f4f5; margin-top:5px; }
      .dd-kpi-previous,.dd-kpi-delta { font-size:11px; color:#a1a1aa; margin-top:4px; }
      .dd-chart-card { background:#11141b; border:1px solid #282d38; border-radius:10px; padding:16px; margin-bottom:14px; }
      .dd-chart-card h3 { margin:0 0 8px; font-size:14px; color:#f4f4f5; }
      .dd-chart-legend { display:flex; gap:14px; color:#a1a1aa; font-size:11px; margin-bottom:12px; }
      .dd-chart-legend i { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; }
      .dd-dot-current,.dd-bar-current { background:#60a5fa; } .dd-dot-previous,.dd-bar-previous { background:#71717a; }
      .dd-bar-row { display:grid; grid-template-columns:minmax(130px,1.2fr) minmax(90px,2fr) minmax(90px,2fr) 90px; gap:8px; align-items:center; margin:8px 0; }
      .dd-bar-label,.dd-bar-values { font-size:11px; color:#d4d4d8; }
      .dd-bar-track { height:9px; background:#20242e; border-radius:4px; overflow:hidden; } .dd-bar-track span { display:block; height:100%; }
      .dd-data-table { width:100%; margin-top:12px; } .dd-data-table caption { text-align:left; color:#a1a1aa; font-size:11px; margin-bottom:5px; }
      .dd-coverage-table { width:100%; background:#11141b; border:1px solid #282d38; border-radius:10px; overflow:hidden; }
      .dd-state { display:inline-block; border-radius:999px; padding:3px 8px; font-size:10px; font-weight:800; }
      .dd-state-ok { background:#84cc16; color:#07110a; } .dd-state-partial { background:#f59e0b; color:#171006; } .dd-state-failed { background:#441d23; color:#fecaca; } .dd-state-muted { background:#27272a; color:#d4d4d8; }
      .dd-summary { background:#11141b; border:1px solid #282d38; border-left:3px solid #60a5fa; border-radius:10px; padding:16px; line-height:1.7; color:#e4e4e7; margin-bottom:14px; }
      @media (max-width:768px) { .dd-bar-row { grid-template-columns:1fr; gap:4px; } .dd-bar-values { margin-bottom:8px; } }
      @media (prefers-reduced-motion:reduce) { #tab-daily-digest * { transition:none !important; } }
    `;
    document.head.appendChild(style);
  }

  window.renderDigestV2 = function renderDigestV2(data) {
    installStyles();
    const content = document.getElementById('dd-content');
    const period = document.getElementById('dd-period');
    const kpis = document.getElementById('dd-kpis');
    const charts = document.getElementById('dd-charts');
    const coverage = document.getElementById('dd-coverage');
    if (!content || !period || !kpis || !charts || !coverage) return false;
    if (!data) {
      period.innerHTML = '<div class="dd-period-main">Последний успешный дайджест ещё не создан.</div>';
      kpis.innerHTML = '';
      charts.innerHTML = '';
      content.innerHTML = '<div class="reports-empty">Сформируйте первый дайджест. Начальное окно составит 24 часа.</div>';
      coverage.innerHTML = '';
      return true;
    }

    period.innerHTML = `<div class="dd-period-main">Текущий период: ${escapeText(formatPeriod(data.windows && data.windows.current))}</div>
      <div class="dd-period-compare">Сравнение: ${escapeText(formatPeriod(data.windows && data.windows.previous))}</div>`;
    const verifiedComparisons = data.comparisons || {};
    kpis.innerHTML = renderKpis(verifiedComparisons);
    charts.innerHTML = Object.keys(verifiedComparisons).length
      ? renderComparisonChart(verifiedComparisons)
      : '<div class="reports-empty">Графики скрыты: для этих метрик нет полного покрытия обоих периодов.</div>';
    content.innerHTML = `<div class="dd-summary">${escapeText(data.summary || 'Сводка отсутствует').replace(/\n/g, '<br>')}</div>`;
    const sources = Array.isArray(data.sourceCoverage) ? data.sourceCoverage : [];
    coverage.innerHTML = `<h3 style="margin:4px 0 8px;font-size:14px">Покрытие источников</h3><div style="overflow-x:auto"><table class="dd-coverage-table"><thead><tr><th>Источник</th><th>Статус</th><th>Примечание</th></tr></thead><tbody>
      ${sources.map((source) => {
        const state = coverageState(source);
        return `<tr><td>${escapeText(source.sourceId)}</td><td><span class="dd-state ${state.className}">${state.label}</span></td><td>${escapeText(source.errorCode || '')}</td></tr>`;
      }).join('') || '<tr><td colspan="3">Диагностика источников недоступна.</td></tr>'}
    </tbody></table></div>`;
    return true;
  };
})();

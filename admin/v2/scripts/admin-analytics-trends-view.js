import {
  formatAdminChartValue,
  mountTimeSeriesChart,
  resetAdminChartZoom,
} from './components/admin-time-series-chart.js';
import { mountBarChart } from './components/admin-bar-chart.js';

export const PAYWALL_DEFAULT_VISIBLE_METRIC_IDS = Object.freeze([
  'paywall.shown.v1',
  'paywall.cta_click.v1',
  'paywall.trial_started.v1',
  'paywall.purchase_completed.v1',
]);

const OVERVIEW_COUNT_METRIC_IDS = Object.freeze([
  'paywall.shown.v1',
  'store.confirmed_trial_start.v1',
  'store.initial_purchase.v1',
]);
const OVERVIEW_SOURCE_KEYS = Object.freeze([
  'paywall',
  'premium_event_time',
  'premium_created_at',
]);
const OVERVIEW_GROSS_REVENUE_METRIC_ID = 'revenue.gross_usd_micros.v1';

const ANALYTICS_SERIES_COLORS = Object.freeze([
  '#3B82F6', '#8B5CF6', '#0D9488', '#6366F1',
  '#0284C7', '#A855F7', '#0891B2', '#4F7FEA',
]);
const SOURCE_LABELS = Object.freeze({
  paywall_funnel: 'Firestore paywall_funnel — поведенческий сигнал',
  revenuecat_premium_events: 'RevenueCat — подтверждённая покупка',
  revenuecat_shard_transactions: 'RevenueCat — подтверждённая покупка осколков',
});
const HEALTH_SOURCE_LABELS = Object.freeze({
  paywall: 'Поведенческие события paywall',
  premium_event_time: 'RevenueCat: время события',
  premium_created_at: 'RevenueCat: время сохранения',
  shards: 'RevenueCat: покупки осколков',
  purchase_failures: 'Управляемое хранилище причин ошибок',
});

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boundedText(value, maximum, fallback = '') {
  const text = String(value ?? fallback);
  return text.length <= maximum ? text : `${text.slice(0, Math.max(0, maximum - 1))}…`;
}

export function escapeAnalyticsHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function selected(value, expected) {
  return String(value ?? '') === String(expected) ? ' selected' : '';
}

function disabled(disabledValue) {
  return disabledValue ? ' disabled' : '';
}

function checked(checkedValue) {
  return checkedValue ? ' checked' : '';
}

function numberText(value) {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString('ru-RU') : '—';
}

function dateTimeText(value) {
  if (value === null || value === undefined || value === '') return 'Нет данных';
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleString('ru-RU', { timeZone: 'UTC' })
    : 'Нет данных';
}

function sourceCompletenessText(source) {
  if (source?.state === 'error' || source?.state === 'unavailable') return 'Неизвестно';
  if (source?.truncated === true) return 'Достигнут лимит';
  if (source?.truncated === false) return 'Лимит не достигнут';
  return 'Неизвестно';
}

function statusTone(value) {
  if (value === 'ready') return 'success';
  if (value === 'partial' || value === 'stale_event_watermark') return 'warning';
  if (value === 'error' || value === 'unavailable') return 'danger';
  return '';
}

function statusText(value) {
  return ({
    idle: 'Не загружено', loading: 'Обновление', ready: 'Готово', empty: 'Нет данных',
    partial: 'Неполные данные', error: 'Ошибка', unavailable: 'Недоступно',
  })[value] || 'Неизвестно';
}

function freshnessText(value) {
  return ({
    recent: 'Свежие данные', stale_event_watermark: 'Источник отстаёт',
    no_events: 'Событий нет', unknown: 'Свежесть неизвестна',
  })[value] || 'Свежесть неизвестна';
}

function currentRequest(model) {
  return model?.request && typeof model.request === 'object' ? model.request : {};
}

function renderedDataRequest(model) {
  return model?.data?.request && typeof model.data.request === 'object'
    ? model.data.request
    : currentRequest(model);
}

function controlValues(model) {
  const request = currentRequest(model);
  const responseRequest = model?.data?.request && typeof model.data.request === 'object'
    ? model.data.request
    : {};
  const filters = request.filters && typeof request.filters === 'object' ? request.filters : {};
  const draft = model?.draft && typeof model.draft === 'object' ? model.draft : {};
  const responsePreset = responseRequest.presetDays === null ? 'custom' : responseRequest.presetDays;
  const requestPreset = request.presetDays === null ? 'custom' : request.presetDays;
  return {
    preset: draft.preset ?? requestPreset ?? responsePreset ?? '28',
    fromDate: draft.fromDate ?? request.fromDate ?? responseRequest.fromDate ?? '',
    toDate: draft.toDate ?? request.toDate ?? responseRequest.toDate ?? '',
    granularity: draft.granularity ?? request.granularity ?? 'day',
    comparePrevious: draft.comparePrevious ?? request.comparePrevious ?? false,
    context: draft.context ?? filters.context ?? '',
    variant: draft.variant ?? filters.variant ?? '',
    plan: draft.plan ?? filters.plan ?? '',
    store: draft.store ?? filters.store ?? '',
    productId: draft.productId ?? filters.productId ?? '',
    platform: draft.platform ?? filters.platform ?? '',
  };
}

function renderTrendState(model) {
  const hasData = Boolean(model?.data);
  if (!model?.authorized) {
    return '<div class="notice warning" role="status">Для графиков нужна роль с разрешением «Деньги: чтение».</div>';
  }
  if (model.status === 'loading') {
    return `<div class="notice" role="status">${hasData
      ? 'Обновляем графики. Последние успешно загруженные данные остаются на экране.'
      : 'Загружаем агрегированные графики без сырых событий…'}</div>`;
  }
  if (model.status === 'error') {
    return `<div class="notice danger" role="alert"><strong>Не удалось обновить графики.</strong> ${escapeAnalyticsHtml(model.error || 'Последние успешно загруженные данные сохранены.')}</div>`;
  }
  if (model?.data?.state === 'partial') {
    return '<div class="notice warning" role="status"><strong>Часть графиков неполная.</strong> Проверьте состояние каждого источника перед решением.</div>';
  }
  if (model?.data?.state === 'error') {
    return '<div class="notice danger" role="alert"><strong>Источники графиков недоступны.</strong> Последние успешные данные сохранены, если они были.</div>';
  }
  if (model?.data?.state === 'empty') {
    return '<div class="notice" role="status">Источники проверены, но за выбранный период событий нет.</div>';
  }
  if (model.status === 'idle') {
    return '<div class="notice" role="status">Выберите период и обновите графики.</div>';
  }
  return '';
}

function renderScopeNote(id, text) {
  return `<p id="${escapeAnalyticsHtml(id)}" class="analytics-filter-scope" tabindex="0" data-tooltip="${escapeAnalyticsHtml(text)}" title="${escapeAnalyticsHtml(text)}">${escapeAnalyticsHtml(text)}</p>`;
}

function renderToolbar(model) {
  const values = controlValues(model);
  const controlsDisabled = Boolean(model?.controlsDisabled || !model?.authorized || model?.busy);
  const fieldDisabled = disabled(controlsDisabled);
  const resetTooltip = escapeAnalyticsHtml('Сбросить масштаб всех графиков к полному выбранному периоду');
  const refreshTooltip = escapeAnalyticsHtml('Принудительно обновить агрегированные графики с сервера');
  return `<section class="card section analytics-trends-toolbar" aria-labelledby="analytics-trends-filters-title">
    <div class="card-header"><div><h2 id="analytics-trends-filters-title">Период и фильтры графиков</h2><p>Каждый фильтр действует только на подписанный источник и не меняет соседние графики.</p></div><div class="actions"><button class="button" data-action="reset-analytics-zoom" type="button" title="${resetTooltip}" data-tooltip="${resetTooltip}">Сбросить масштаб</button><button class="button" data-action="load-analytics-trends" type="button" title="${refreshTooltip}" data-tooltip="${refreshTooltip}"${fieldDisabled}>${model?.status === 'loading' ? 'Обновление…' : 'Обновить графики'}</button></div></div>
    <div class="card-body analytics-trends-filter-grid">
      <fieldset class="analytics-filter-group" aria-describedby="analytics-period-scope"><legend>Период</legend>
        <div class="field"><label for="analytics-trends-preset">Быстрый период</label><select id="analytics-trends-preset"${fieldDisabled}><option value="7"${selected(values.preset, '7')}>7 дней</option><option value="28"${selected(values.preset, '28')}>28 дней</option><option value="90"${selected(values.preset, '90')}>90 дней</option><option value="custom"${selected(values.preset, 'custom')}>Свои даты</option></select></div>
        <div class="field"><label for="analytics-trends-from">С даты</label><input id="analytics-trends-from" type="date" value="${escapeAnalyticsHtml(values.fromDate)}"${fieldDisabled}></div>
        <div class="field"><label for="analytics-trends-to">По дату</label><input id="analytics-trends-to" type="date" value="${escapeAnalyticsHtml(values.toDate)}"${fieldDisabled}></div>
        <div class="field"><label for="analytics-trends-granularity">Шаг</label><select id="analytics-trends-granularity"${fieldDisabled}><option value="day"${selected(values.granularity, 'day')}>По дням</option><option value="week"${selected(values.granularity, 'week')}>По неделям</option></select></div>
        <label class="analytics-checkbox" for="analytics-trends-compare"><input id="analytics-trends-compare" type="checkbox"${checked(values.comparePrevious)}${fieldDisabled}> Сравнить с предыдущим периодом</label>
        ${renderScopeNote('analytics-period-scope', 'Период и шаг применяются ко всем графикам; наборы источников остаются раздельными.')}
      </fieldset>
      <fieldset class="analytics-filter-group" aria-describedby="analytics-paywall-scope"><legend>Поведение на paywall</legend>
        <div class="field"><label for="analytics-trends-context">Контекст</label><input id="analytics-trends-context" maxlength="40" value="${escapeAnalyticsHtml(values.context)}" placeholder="Например, onboarding"${fieldDisabled}></div>
        <div class="field"><label for="analytics-trends-variant">Вариант</label><select id="analytics-trends-variant"${fieldDisabled}><option value=""${selected(values.variant, '')}>Все</option><option value="A"${selected(values.variant, 'A')}>A</option><option value="B"${selected(values.variant, 'B')}>B</option><option value="C"${selected(values.variant, 'C')}>C</option></select></div>
        <div class="field"><label for="analytics-trends-plan">План</label><select id="analytics-trends-plan"${fieldDisabled}><option value=""${selected(values.plan, '')}>Все</option><option value="monthly"${selected(values.plan, 'monthly')}>Месяц</option><option value="yearly"${selected(values.plan, 'yearly')}>Год</option><option value="lifetime"${selected(values.plan, 'lifetime')}>Навсегда</option></select></div>
        ${renderScopeNote('analytics-paywall-scope', 'Только на поведенческую воронку paywall_funnel. На RevenueCat и деньги эти поля не влияют.')}
      </fieldset>
      <fieldset class="analytics-filter-group" aria-describedby="analytics-store-scope"><legend>Магазин и продукт</legend>
        <div class="field"><label for="analytics-trends-store">Магазин</label><select id="analytics-trends-store"${fieldDisabled}><option value=""${selected(values.store, '')}>Все</option><option value="APP_STORE"${selected(values.store, 'APP_STORE')}>App Store</option><option value="PLAY_STORE"${selected(values.store, 'PLAY_STORE')}>Google Play</option><option value="STRIPE"${selected(values.store, 'STRIPE')}>Stripe</option><option value="AMAZON"${selected(values.store, 'AMAZON')}>Amazon</option><option value="PROMOTIONAL"${selected(values.store, 'PROMOTIONAL')}>Промо</option></select></div>
        <div class="field"><label for="analytics-trends-product">ID продукта</label><input id="analytics-trends-product" maxlength="120" value="${escapeAnalyticsHtml(values.productId)}" placeholder="Идентификатор продукта"${fieldDisabled}></div>
        ${renderScopeNote('analytics-store-scope', 'Только на подтверждённые события RevenueCat и деньги. На поведенческий paywall эти поля не влияют.')}
      </fieldset>
      <fieldset class="analytics-filter-group" aria-describedby="analytics-platform-scope"><legend>Причины ошибок</legend>
        <div class="field"><label for="analytics-trends-platform">Платформа</label><select id="analytics-trends-platform"${fieldDisabled}><option value=""${selected(values.platform, '')}>Все</option><option value="ios"${selected(values.platform, 'ios')}>iOS</option><option value="android"${selected(values.platform, 'android')}>Android</option></select></div>
        ${renderScopeNote('analytics-platform-scope', 'Только на причины ошибок из управляемого хранилища. Другие графики этот фильтр не меняет.')}
      </fieldset>
    </div>
  </section>`;
}

function isSeriesVisible(metricId, visibleSeries, behavioral) {
  if (hasOwn(visibleSeries, metricId)) return visibleSeries[metricId] !== false;
  return behavioral ? PAYWALL_DEFAULT_VISIBLE_METRIC_IDS.includes(metricId) : true;
}

function chartDefinition(definition) {
  const source = definition && typeof definition === 'object' ? definition : {};
  const result = { description: boundedText(source.description, 600, 'Определение источника не передано.') };
  if (source.numerator) result.numerator = boundedText(source.numerator, 600);
  if (source.denominator) result.denominator = boundedText(source.denominator, 600);
  return result;
}

function chartSeries(series, colorIndex) {
  return {
    metricId: String(series.metricId),
    label: boundedText(series.label, 180, series.metricId),
    unit: series.unit,
    source: boundedText(series.source, 180, 'unknown'),
    sourceLabel: SOURCE_LABELS[series.source] || boundedText(series.source, 180, 'Неизвестный источник'),
    definition: chartDefinition(series.definition),
    color: ANALYTICS_SERIES_COLORS[colorIndex % ANALYTICS_SERIES_COLORS.length],
    points: asArray(series.points).map((point) => ({
      bucketStart: String(point?.bucketStart ?? ''),
      value: point?.value == null ? null : Number(point.value),
    })),
    previousPoints: series.previousPoints === null
      ? null
      : asArray(series.previousPoints).map((point) => ({
        bucketStart: String(point?.bucketStart ?? ''),
        value: point?.value == null ? null : Number(point.value),
      })),
  };
}

function timeSeriesEntry(hostId, id, title, rawSeries, model, behavioral = false) {
  const visibleSeries = model?.visibleSeries && typeof model.visibleSeries === 'object'
    ? model.visibleSeries
    : {};
  const series = asArray(rawSeries)
    .filter((item) => isSeriesVisible(String(item?.metricId ?? ''), visibleSeries, behavioral))
    .map(chartSeries);
  if (!series.length) return null;
  const dataRequest = renderedDataRequest(model);
  return {
    kind: 'time-series',
    hostId,
    descriptor: {
      id,
      title,
      ariaLabel: `${title}. Используйте стрелки для просмотра значений.`,
      granularity: dataRequest.granularity === 'week' ? 'week' : 'day',
      comparisonEnabled: dataRequest.comparePrevious === true,
      series,
      ...(behavioral && typeof model?.onToggleSeries === 'function'
        ? { onToggleSeries: model.onToggleSeries }
        : {}),
    },
  };
}

function breakdownEntry(hostId, id, title, breakdown, source, definition) {
  const rows = asArray(breakdown?.rows).map((row, index) => ({
    id: `${id}-row-${index + 1}`,
    label: boundedText(row?.value, 180, 'Без значения'),
    value: row?.events == null ? null : Number(row.events),
    source,
    sourceLabel: SOURCE_LABELS[source] || source,
    definition,
  }));
  if (!rows.length) return null;
  return {
    kind: 'bar',
    hostId,
    descriptor: {
      id,
      title,
      ariaLabel: `${title}. Используйте стрелки для просмотра категорий.`,
      unit: 'count',
      rows,
    },
  };
}

function failureEntry(section) {
  const rows = asArray(section?.rows).map((row, index) => ({
    id: `paywall-purchase-failure-row-${index + 1}`,
    label: boundedText(row?.id, 180, 'Неизвестная причина'),
    value: row?.events == null ? null : Number(row.events),
    source: 'purchase_failures',
    sourceLabel: 'Управляемое хранилище причин ошибок',
    definition: `События ошибки; затронуто экземпляров приложения: ${numberText(row?.appInstances)}.`,
  }));
  if (!rows.length) return null;
  return {
    kind: 'bar',
    hostId: 'analytics-trends-failure-chart',
    descriptor: {
      id: 'paywall-purchase-failures',
      title: 'Причины ошибок покупки',
      ariaLabel: 'Причины ошибок покупки по числу событий.',
      unit: 'count',
      rows,
    },
  };
}

export function createPaywallAnalyticsChartDescriptors(model) {
  const sections = model?.data?.sections && typeof model.data.sections === 'object'
    ? model.data.sections
    : {};
  const breakdowns = sections.behavioralBreakdowns || {};
  return [
    timeSeriesEntry(
      'analytics-trends-behavioral-chart',
      'paywall-behavioral-trend',
      'Поведенческие сигналы paywall',
      sections.behavioralPaywall?.series,
      model,
      true,
    ),
    breakdownEntry(
      'analytics-trends-context-chart', 'paywall-context-breakdown', 'События по контексту',
      breakdowns.byContext, 'paywall_funnel', 'Количество событий paywall_funnel в этом контексте.',
    ),
    breakdownEntry(
      'analytics-trends-variant-chart', 'paywall-variant-breakdown', 'События по варианту',
      breakdowns.byVariant, 'paywall_funnel', 'Количество событий paywall_funnel в этом варианте.',
    ),
    breakdownEntry(
      'analytics-trends-plan-chart', 'paywall-plan-breakdown', 'События по плану',
      breakdowns.byPlan, 'paywall_funnel', 'Количество событий paywall_funnel в этом плане.',
    ),
    timeSeriesEntry(
      'analytics-trends-store-chart', 'paywall-confirmed-store-trend',
      'Подтверждённые события магазина', sections.confirmedStore?.series, model,
    ),
    timeSeriesEntry(
      'analytics-trends-revenue-chart', 'paywall-gross-revenue-trend',
      'Валовая выручка, USD', sections.grossRevenue?.series, model,
    ),
    timeSeriesEntry(
      'analytics-trends-shards-chart', 'paywall-shard-purchases-trend',
      'Подтверждённые покупки осколков', sections.shardPurchases?.series, model,
    ),
    failureEntry(sections.purchaseFailures),
  ].filter(Boolean);
}

function overviewSeriesByMetricId(model, metricId) {
  const sections = model?.data?.sections && typeof model.data.sections === 'object'
    ? model.data.sections
    : {};
  return [
    ...asArray(sections.behavioralPaywall?.series),
    ...asArray(sections.confirmedStore?.series),
  ].find((series) => series?.metricId === metricId) || null;
}

export function createOverviewPaymentChartDescriptors(model) {
  const countSeries = OVERVIEW_COUNT_METRIC_IDS
    .map((metricId) => overviewSeriesByMetricId(model, metricId))
    .filter((series) => series && series.unit === 'count')
    .slice(0, 3);
  const entry = timeSeriesEntry(
    'overview-payment-count-chart',
    'overview-payment-count-trend',
    'Количество событий по дням',
    countSeries,
    model,
  );
  return entry ? [entry] : [];
}

function descriptorHostIds(descriptors) {
  return new Set(descriptors.map((entry) => entry.hostId));
}

function chartHost(id, mountedHostIds, emptyText) {
  return `<div id="${escapeAnalyticsHtml(id)}" class="analytics-trends-chart-host">${mountedHostIds.has(id) ? '' : `<div class="analytics-empty">${escapeAnalyticsHtml(emptyText)}</div>`}</div>`;
}

function renderSeriesToggles(model) {
  const series = asArray(model?.data?.sections?.behavioralPaywall?.series);
  const visibleSeries = model?.visibleSeries && typeof model.visibleSeries === 'object'
    ? model.visibleSeries
    : {};
  if (!series.length) return '';
  return `<div class="analytics-trends-series-toggles" role="group" aria-label="Линии поведенческого графика">${series.map((item) => {
    const metricId = String(item?.metricId ?? '');
    const visible = isSeriesVisible(metricId, visibleSeries, true);
    const label = boundedText(item?.label, 180, metricId);
    const tooltip = escapeAnalyticsHtml(`Показать или скрыть линию «${label}»`);
    return `<button class="button ghost small" data-action="toggle-analytics-series" data-metric-id="${escapeAnalyticsHtml(metricId)}" type="button" aria-pressed="${visible ? 'true' : 'false'}" title="${tooltip}" data-tooltip="${tooltip}">${escapeAnalyticsHtml(label)}</button>`;
  }).join('')}</div>`;
}

function stageMetric(series, metricId) {
  return asArray(series).find((item) => item?.metricId === metricId) || null;
}

function coveredSeriesTotal(series, expectedUnit = 'count') {
  if (
    !series
    || series.unit !== expectedUnit
    || series.coverage !== 'complete'
    || !['ready', 'empty'].includes(series.status)
  ) return null;
  const points = asArray(series.points);
  if (!points.length) return series.status === 'empty' ? 0 : null;
  const values = points.map((point) => point?.value);
  if (values.some((value) => !Number.isFinite(value))) return null;
  return values.reduce((sum, value) => sum + Number(value), 0);
}

function renderSemanticFunnel(model) {
  const series = asArray(model?.data?.sections?.behavioralPaywall?.series);
  const stages = [
    ['paywall.shown.v1', 'Показы предложения'],
    ['paywall.cta_click.v1', 'Нажатия основной кнопки'],
    ['paywall.trial_started.v1', 'Сигналы пробного периода'],
    ['paywall.purchase_completed.v1', 'Сигналы покупки'],
  ].map(([metricId, fallback]) => {
    const item = stageMetric(series, metricId);
    return { metricId, label: item?.label || fallback, value: coveredSeriesTotal(item) };
  });
  return `<ol class="analytics-semantic-funnel">${stages.map((stage, index) => {
    const previous = index > 0 ? stages[index - 1].value : null;
    const ratio = Number.isFinite(stage.value) && Number.isFinite(previous) && previous > 0
      ? `${((stage.value / previous) * 100).toFixed(1)}% от предыдущего шага`
      : 'Доля недоступна';
    return `<li><span>${escapeAnalyticsHtml(index + 1)}</span><div><strong>${escapeAnalyticsHtml(stage.label)}</strong><small>${index === 3 ? 'Поведенческий сигнал покупки, не подтверждение магазина.' : 'События приложения, разрешённые аналитикой.'}</small></div><div><strong>${escapeAnalyticsHtml(numberText(stage.value))}</strong><small>${escapeAnalyticsHtml(ratio)}</small></div></li>`;
  }).join('')}</ol>`;
}

function renderOverviewFunnelSkeleton() {
  return `<ol class="analytics-semantic-funnel">${Array.from({ length: 4 }, (_, index) => `<li><span aria-hidden="true">${index + 1}</span><div><strong class="overview-payment-skeleton overview-payment-funnel-label-skeleton" aria-hidden="true"></strong><small class="overview-payment-skeleton overview-payment-funnel-note-skeleton" aria-hidden="true"></small></div><div><strong class="overview-payment-skeleton overview-payment-funnel-value-skeleton" aria-hidden="true"></strong><small class="overview-payment-skeleton overview-payment-funnel-ratio-skeleton" aria-hidden="true"></small></div></li>`).join('')}</ol>`;
}

function renderSourceHealth(model) {
  const sources = asArray(model?.data?.sources);
  if (!sources.length) return '<div class="analytics-empty">Состояние источников ещё не загружено.</div>';
  return `<div class="analytics-source-grid analytics-trends-source-health">${sources.map((source) => {
    const sourceKey = String(source?.source ?? '');
    const limitations = asArray(source?.limitations);
    const sourceStatus = String(source?.state ?? '');
    return `<article><div><strong>${escapeAnalyticsHtml(HEALTH_SOURCE_LABELS[sourceKey] || sourceKey || 'Неизвестный источник')}</strong><span class="badge ${escapeAnalyticsHtml(statusTone(sourceStatus))}">${escapeAnalyticsHtml(statusText(sourceStatus))}</span></div><dl><dt>Свежесть</dt><dd>${escapeAnalyticsHtml(freshnessText(source?.freshness))}</dd><dt>Последнее событие</dt><dd>${escapeAnalyticsHtml(dateTimeText(source?.latestAtMs))}</dd><dt>Проверено</dt><dd>${escapeAnalyticsHtml(dateTimeText(source?.checkedAtMs))}</dd><dt>Полнота</dt><dd>${escapeAnalyticsHtml(sourceCompletenessText(source))}</dd>${source?.errorCode ? `<dt>Код ошибки</dt><dd><code>${escapeAnalyticsHtml(source.errorCode)}</code></dd>` : ''}</dl>${limitations.length ? `<ul>${limitations.map((item) => `<li>${escapeAnalyticsHtml(item)}</li>`).join('')}</ul>` : ''}</article>`;
  }).join('')}</div>`;
}

function renderOverviewHeadlineMetrics(model) {
  const paywallShown = overviewSeriesByMetricId(model, 'paywall.shown.v1');
  const confirmedTrials = overviewSeriesByMetricId(model, 'store.confirmed_trial_start.v1');
  const confirmedPurchases = overviewSeriesByMetricId(model, 'store.initial_purchase.v1');
  const grossRevenue = asArray(model?.data?.sections?.grossRevenue?.series)
    .find((series) => series?.metricId === OVERVIEW_GROSS_REVENUE_METRIC_ID) || null;
  const grossTotal = coveredSeriesTotal(grossRevenue, 'usd_micros');
  const grossCoverageUsable = Number.isFinite(grossTotal);
  const metrics = [
    ['Показы предложения', numberText(coveredSeriesTotal(paywallShown)), 'Поведенческие события приложения'],
    ['Подтверждённые начала пробного периода', numberText(coveredSeriesTotal(confirmedTrials)), 'Подтверждено RevenueCat'],
    ['Подтверждённые первичные покупки', numberText(coveredSeriesTotal(confirmedPurchases)), 'Подтверждено RevenueCat'],
    [
      'Валовая выручка с полным покрытием',
      grossCoverageUsable ? formatAdminChartValue(grossTotal, 'usd_micros') : '—',
      grossCoverageUsable ? 'Покрытие финансовых данных полное' : 'Не показана: финансовое покрытие неполное',
    ],
  ];
  return `<div class="overview-payment-headlines" aria-label="Основные показатели оплаты">${metrics.map(([label, value, note]) => `<article class="overview-payment-headline"><span>${escapeAnalyticsHtml(label)}</span><strong>${escapeAnalyticsHtml(value)}</strong><small>${escapeAnalyticsHtml(note)}</small></article>`).join('')}</div>`;
}

function renderOverviewHeadlineSkeletons() {
  return `<div class="overview-payment-headlines" aria-label="Основные показатели оплаты">${Array.from({ length: 4 }, () => '<article class="overview-payment-headline"><span class="overview-payment-skeleton overview-payment-headline-label-skeleton" aria-hidden="true"></span><strong class="overview-payment-skeleton overview-payment-headline-value-skeleton" aria-hidden="true"></strong><small class="overview-payment-skeleton overview-payment-headline-note-skeleton" aria-hidden="true"></small></article>').join('')}</div>`;
}

function renderOverviewPaymentChartHost(mountedHostIds, coldLoading, emptyText) {
  const id = 'overview-payment-count-chart';
  if (coldLoading) {
    return `<div id="${id}" class="analytics-trends-chart-host overview-payment-chart-frame"><div class="overview-payment-skeleton overview-payment-chart-skeleton" aria-hidden="true"></div></div>`;
  }
  return `<div id="${id}" class="analytics-trends-chart-host overview-payment-chart-frame">${mountedHostIds.has(id) ? '' : `<div class="analytics-empty">${escapeAnalyticsHtml(emptyText)}</div>`}</div>`;
}

function renderOverviewSourceSkeletons() {
  return `<div class="analytics-source-grid analytics-trends-source-health overview-payment-source-skeleton-grid">${OVERVIEW_SOURCE_KEYS.map((sourceKey) => `<article class="overview-payment-source-skeleton" aria-hidden="true" data-source="${escapeAnalyticsHtml(sourceKey)}"><div><strong class="overview-payment-skeleton overview-payment-source-title-skeleton" aria-hidden="true"></strong><span class="overview-payment-skeleton overview-payment-source-status-skeleton" aria-hidden="true"></span></div><dl><dt class="overview-payment-skeleton overview-payment-source-term-skeleton" aria-hidden="true"></dt><dd class="overview-payment-skeleton overview-payment-source-value-skeleton" aria-hidden="true"></dd><dt class="overview-payment-skeleton overview-payment-source-term-skeleton" aria-hidden="true"></dt><dd class="overview-payment-skeleton overview-payment-source-value-skeleton" aria-hidden="true"></dd><dt class="overview-payment-skeleton overview-payment-source-term-skeleton" aria-hidden="true"></dt><dd class="overview-payment-skeleton overview-payment-source-value-skeleton" aria-hidden="true"></dd><dt class="overview-payment-skeleton overview-payment-source-term-skeleton" aria-hidden="true"></dt><dd class="overview-payment-skeleton overview-payment-source-value-skeleton" aria-hidden="true"></dd></dl></article>`).join('')}</div>`;
}

function overviewPaymentDisplayStatus(model) {
  if (model?.status === 'loading' || model?.status === 'error') return model.status;
  return model?.data?.state || model?.status;
}

function renderOverviewPaymentState(model) {
  const hasData = Boolean(model?.data);
  if (!model?.authorized) return '<div class="notice warning" role="status">Для сводки оплаты нужно разрешение «Деньги: чтение».</div>';
  if (model?.status === 'loading') {
    return `<div class="notice" role="status" aria-live="polite">${hasData ? 'Обновляем сводку. Последние успешные данные остаются на экране.' : 'Загружаем сводку оплаты…'}</div>`;
  }
  if (model?.status === 'error') {
    return `<div class="notice danger" role="alert"><strong>Не удалось обновить сводку оплаты.</strong> ${escapeAnalyticsHtml(hasData ? 'Последние успешные данные сохранены.' : model?.error || 'Данные пока недоступны.')}</div>`;
  }
  if (model?.data?.state === 'partial') return '<div class="notice warning" role="status">Часть источников неполная. Проверяйте состояние источников перед решением.</div>';
  if (model?.data?.state === 'empty') return '<div class="notice" role="status">Источники проверены: за период событий оплаты нет.</div>';
  if (model?.status === 'idle') return '<div class="notice" role="status">Сводка загрузится в фоне без изменения остального Обзора.</div>';
  return '';
}

export function renderOverviewPaymentSummary(model) {
  const descriptors = createOverviewPaymentChartDescriptors(model);
  const mountedHostIds = descriptorHostIds(descriptors);
  const loading = model?.status === 'loading';
  const coldLoading = loading && !model?.data;
  const displayStatus = overviewPaymentDisplayStatus(model);
  return `<section class="card section overview-payment" aria-labelledby="overview-payment-title" aria-busy="${loading ? 'true' : 'false'}">
    <div class="card-header"><div><h2 id="overview-payment-title">Что происходит с оплатой</h2><p>Поведение приложения и подтверждённые результаты магазина показаны раздельно за последние 28 дней.</p></div><span class="badge ${escapeAnalyticsHtml(displayStatus === 'loading' ? 'warning' : statusTone(displayStatus))}">${escapeAnalyticsHtml(statusText(displayStatus))}</span></div>
    <div class="card-body">
      <div class="overview-payment-status">${renderOverviewPaymentState(model)}</div>
      ${coldLoading ? renderOverviewHeadlineSkeletons() : renderOverviewHeadlineMetrics(model)}
      <div class="overview-payment-detail-grid">
        <section aria-labelledby="overview-payment-trend-title"><h3 id="overview-payment-trend-title">Сигналы и подтверждения</h3><p>Только количество событий; денежные значения не используют эту шкалу.</p>${renderOverviewPaymentChartHost(mountedHostIds, coldLoading, loading ? 'Готовим график количества событий…' : 'Данных для графика количества событий пока нет.')}</section>
        <section aria-labelledby="overview-payment-funnel-title"><h3 id="overview-payment-funnel-title">Компактная поведенческая воронка</h3><p>События приложения не считаются подтверждением магазина.</p>${coldLoading ? renderOverviewFunnelSkeleton() : renderSemanticFunnel(model)}</section>
      </div>
      <section class="overview-payment-health" aria-labelledby="overview-payment-health-title"><h3 id="overview-payment-health-title">Состояние источников оплаты</h3>${coldLoading ? renderOverviewSourceSkeletons() : renderSourceHealth(model)}</section>
      <div class="actions end section"><a class="button" href="#analytics" title="Открыть подробные графики, фильтры и определения источников оплаты">Открыть всю аналитику</a></div>
    </div>
  </section>`;
}

export function renderPaywallAnalyticsCategory(model) {
  const descriptors = createPaywallAnalyticsChartDescriptors(model);
  const mountedHostIds = descriptorHostIds(descriptors);
  const response = model?.data;
  return `<section class="analytics-trends-category section" aria-labelledby="analytics-trends-title">
    <div class="section-heading"><div><h2 id="analytics-trends-title">Paywall и покупки</h2><p>Поведение в приложении и подтверждённые данные магазина показаны раздельно.</p></div></div>
    <div id="analytics-trends-live" class="analytics-detail-status" role="status" aria-live="polite">${renderTrendState(model)}${response ? `<small>Графики: ${escapeAnalyticsHtml(dateTimeText(response.generatedAtMs))} · UTC · ${escapeAnalyticsHtml(response.definitionVersion || '')}</small>` : ''}</div>
    ${renderToolbar(model)}
    <section class="card section" aria-labelledby="analytics-behavioral-title"><div class="card-header"><div><h2 id="analytics-behavioral-title">Поведенческие сигналы приложения</h2><p>Firestore показывает действия в приложении: сигнал покупки, не подтверждение магазина. По умолчанию видны не больше четырёх основных линий.</p></div></div><div class="card-body">${renderSeriesToggles(model)}${chartHost('analytics-trends-behavioral-chart', mountedHostIds, 'Поведенческие линии не выбраны или данных пока нет.')}</div></section>
    <section class="card section" aria-labelledby="analytics-semantic-funnel-title"><div class="card-header"><div><h2 id="analytics-semantic-funnel-title">Семантическая воронка paywall</h2><p>Последовательность действий помогает читать смысл шагов, но не связывает сигнал приложения с транзакцией магазина.</p></div></div><div class="card-body">${renderSemanticFunnel(model)}</div></section>
    <section class="card section" aria-labelledby="analytics-breakdowns-title"><div class="card-header"><div><h2 id="analytics-breakdowns-title">Разрезы поведенческих сигналов</h2><p>Контекст, вариант и план относятся только к paywall_funnel.</p></div></div><div class="card-body analytics-trends-breakdown-grid">${chartHost('analytics-trends-context-chart', mountedHostIds, 'Нет разреза по контексту.')}${chartHost('analytics-trends-variant-chart', mountedHostIds, 'Нет разреза по варианту.')}${chartHost('analytics-trends-plan-chart', mountedHostIds, 'Нет разреза по плану.')}</div></section>
    <section class="card section" aria-labelledby="analytics-confirmed-store-title"><div class="card-header"><div><h2 id="analytics-confirmed-store-title">Подтверждённые покупки RevenueCat</h2><p>RevenueCat — подтверждённая покупка магазина. Эти события не выдаются за сигналы paywall.</p></div></div><div class="card-body">${chartHost('analytics-trends-store-chart', mountedHostIds, 'Подтверждённых событий магазина за период нет.')}</div></section>
    <section class="card section" aria-labelledby="analytics-revenue-title"><div class="card-header"><div><h2 id="analytics-revenue-title">Валовая выручка по валютной шкале</h2><p>Деньги отделены от количества событий и показываются в USD по подтверждённым полям RevenueCat.</p></div></div><div class="card-body">${chartHost('analytics-trends-revenue-chart', mountedHostIds, 'Денежные значения за период недоступны.')}</div></section>
    <section class="card section" aria-labelledby="analytics-shards-title"><div class="card-header"><div><h2 id="analytics-shards-title">Покупки осколков</h2><p>Подтверждённые production-транзакции осколков показаны отдельно от премиум-доступа.</p></div></div><div class="card-body">${chartHost('analytics-trends-shards-chart', mountedHostIds, 'Подтверждённых покупок осколков за период нет.')}</div></section>
    <section class="card section" aria-labelledby="analytics-failures-title"><div class="card-header"><div><h2 id="analytics-failures-title">Причины ошибок покупки</h2><p>Агрегированные причины из управляемого хранилища; фильтр платформы действует только здесь.</p></div></div><div class="card-body">${chartHost('analytics-trends-failure-chart', mountedHostIds, 'Причины ошибок не зарегистрированы или источник недоступен.')}</div></section>
    <section class="card section" aria-labelledby="analytics-trends-health-title"><div class="card-header"><div><h2 id="analytics-trends-health-title">Свежесть и состояние источников</h2><p>Каждый источник сообщает собственную свежесть, полноту и ограничения.</p></div></div><div class="card-body">${renderSourceHealth(model)}</div></section>
  </section>`;
}

export function mountPaywallAnalyticsChartsWhenCurrent(
  root,
  descriptors,
  isCurrent,
  dependencies = {},
) {
  if (typeof isCurrent !== 'function' || isCurrent() !== true) return [];
  if (!root || typeof root.querySelector !== 'function') return [];
  const mountTimeSeries = dependencies.mountTimeSeriesChart || mountTimeSeriesChart;
  const mountBar = dependencies.mountBarChart || mountBarChart;
  const chartFactory = dependencies.chartFactory || globalThis.Chart;
  const onMountError = typeof dependencies.onMountError === 'function'
    ? dependencies.onMountError
    : (error, entry) => console.error(`[Admin analytics chart: ${entry?.descriptor?.id || 'unknown'}]`, error);
  const mounted = [];
  for (const entry of asArray(descriptors)) {
    if (isCurrent() !== true) break;
    try {
      const host = root.querySelector(`#${entry.hostId}`);
      if (!host) continue;
      const result = entry.kind === 'bar'
        ? mountBar(host, entry.descriptor, chartFactory)
        : mountTimeSeries(host, entry.descriptor, chartFactory);
      mounted.push(result);
    } catch (error) {
      try { onMountError(error, entry); } catch { /* error reporting must not break later charts */ }
    }
  }
  return mounted;
}

export function resetAllAdminChartZoom() {
  return resetAdminChartZoom();
}

export function updatePaywallAnalyticsLiveRegion(root, message) {
  if (!root || typeof root.querySelector !== 'function') return false;
  const target = root.querySelector('#analytics-trends-live');
  if (!target) return false;
  target.textContent = String(message ?? '');
  return true;
}

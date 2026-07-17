export function completeAnalyticsLoad(current, snapshot, rangeDays) {
  if (snapshot?.state === 'error') {
    return {
      status: 'error',
      snapshot: current.snapshot,
      error: 'Все источники аналитики недоступны. Последний успешный снимок сохранён.',
      rangeDays,
    };
  }
  return {
    status: snapshot?.state || 'ready',
    snapshot,
    error: '',
    rangeDays,
  };
}

const CANONICAL_SOURCE_STATES = Object.freeze(['ready', 'empty', 'partial', 'error', 'unavailable', 'idle', 'loading']);

function safeState(value) {
  const state = String(value || 'idle');
  return CANONICAL_SOURCE_STATES.includes(state) ? state : 'partial';
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pointList(series) {
  return (Array.isArray(series?.points) ? series.points : []).map((point) => ({
    bucketStart: String(point?.bucketStart || ''),
    value: numberOrNull(point?.value),
  }));
}

function registryMetric(id, label, value, unit, source, definition, state = 'ready', points = []) {
  return {
    id: String(id),
    label: String(label),
    value: numberOrNull(value),
    unit: String(unit || 'count'),
    source: String(source || 'unknown'),
    definition: String(definition || ''),
    state: safeState(state),
    points,
  };
}

function firstSeries(trends, metricId) {
  const sections = trends?.data?.sections && typeof trends.data.sections === 'object'
    ? trends.data.sections
    : {};
  return [
    ...(Array.isArray(sections.behavioralPaywall?.series) ? sections.behavioralPaywall.series : []),
    ...(Array.isArray(sections.confirmedStore?.series) ? sections.confirmedStore.series : []),
    ...(Array.isArray(sections.grossRevenue?.series) ? sections.grossRevenue.series : []),
    ...(Array.isArray(sections.shardPurchases?.series) ? sections.shardPurchases.series : []),
  ].find((series) => String(series?.metricId || '') === String(metricId)) || null;
}

function sourceHealth(snapshot, trends) {
  const snapshotSources = Object.entries(snapshot?.sources || {}).map(([source, info]) => ({
    source,
    state: safeState(info?.state),
    count: numberOrNull(info?.count),
    latestAtMs: numberOrNull(info?.latestAtMs),
    checkedAtMs: numberOrNull(info?.checkedAtMs),
    truncated: info?.truncated === true,
    errorCode: info?.errorCode ? String(info.errorCode) : '',
  }));
  const trendSources = (Array.isArray(trends?.data?.sources) ? trends.data.sources : []).map((info) => ({
    source: String(info?.source || 'unknown'),
    state: safeState(info?.state),
    count: numberOrNull(info?.count),
    latestAtMs: numberOrNull(info?.latestAtMs),
    checkedAtMs: numberOrNull(info?.checkedAtMs),
    truncated: info?.truncated === true,
    errorCode: info?.errorCode ? String(info.errorCode) : '',
  }));
  return [...snapshotSources, ...trendSources];
}

function rangeRequest(snapshot, trends, rangeDays) {
  const trendRequest = trends?.data?.request || trends?.request || {};
  return {
    period: {
      rangeDays: Number(snapshot?.rangeDays || rangeDays || 28),
      fromDate: trendRequest.fromDate || null,
      toDate: trendRequest.toDate || null,
      granularity: trendRequest.granularity || 'day',
      timezone: 'UTC',
    },
    comparison: { comparePrevious: Boolean(trendRequest.comparePrevious) },
    filters: trendRequest.filters && typeof trendRequest.filters === 'object' ? { ...trendRequest.filters } : {},
  };
}

export function createCanonicalAnalyticsReport(input = {}) {
  const snapshot = input.snapshot || null;
  const trends = input.analyticsTrends || null;
  const access = snapshot?.access || {};
  const store = snapshot?.storeActivity || {};
  const funnel = snapshot?.funnelSignals || {};
  const events = funnel.events || {};
  const appActivity = snapshot?.appActivity || {};
  const getSeriesMetric = (metricId, fallbackLabel, fallbackSource = 'adminGetAnalyticsTrends') => {
    const series = firstSeries(trends, metricId);
    return registryMetric(
      metricId,
      series?.label || fallbackLabel,
      null,
      series?.unit || 'count',
      series?.source || fallbackSource,
      series?.definition?.description || 'Time series from analytics trends.',
      series?.status || trends?.status || 'idle',
      pointList(series),
    );
  };
  return Object.freeze({
    schemaVersion: 1,
    generatedAtMs: Date.now(),
    definitionVersion: snapshot?.definitionVersion || trends?.data?.definitionVersion || '',
    activeReport: String(input.activeReport || 'overview'),
    request: rangeRequest(snapshot, trends, input.rangeDays),
    sourceHealth: sourceHealth(snapshot, trends),
    metrics: [
      registryMetric('access.active.total', 'Активные доступы', access.activeAccessTotal, 'count', 'adminGetAnalyticsSnapshot.users', 'Current active access categories.', snapshot?.sources?.users?.state),
      registryMetric('access.store_backed.total', 'Оплачено через магазин', access.storeBackedTotal, 'count', 'adminGetAnalyticsSnapshot.users', 'Store-backed active access.', snapshot?.sources?.users?.state),
      registryMetric('store.new_purchases.total', 'Начальные покупки', store.newPurchases, 'count', 'adminGetAnalyticsSnapshot.revenuecat_premium_events', 'Confirmed initial purchases in the selected period.', snapshot?.sources?.revenuecat_premium_events?.state),
      registryMetric('store.renewals.total', 'Продления', store.renewals, 'count', 'adminGetAnalyticsSnapshot.revenuecat_premium_events', 'Confirmed renewals in the selected period.', snapshot?.sources?.revenuecat_premium_events?.state),
      registryMetric('paywall.shown.total', 'Показы paywall', events.shown, 'count', 'adminGetAnalyticsSnapshot.paywall_funnel', 'Paywall shown events, not unique users.', snapshot?.sources?.paywall_funnel?.state),
      registryMetric('paywall.purchase_signal.total', 'Сигналы покупки', events.purchaseCompleted, 'count', 'adminGetAnalyticsSnapshot.paywall_funnel', 'Client-side purchase-completed signal, not store confirmation.', snapshot?.sources?.paywall_funnel?.state),
      registryMetric('app.activity.total', 'События приложения', Object.values(appActivity).reduce((sum, value) => sum + (Number(value) || 0), 0), 'count', 'adminGetAnalyticsSnapshot.app_activity', 'Total recorded app activity events in the selected period.', snapshot?.sources?.app_activity?.state),
      getSeriesMetric('paywall.shown.v1', 'Показы paywall по дням', 'paywall_funnel'),
      getSeriesMetric('paywall.cta_click.v1', 'Нажатия CTA по дням', 'paywall_funnel'),
      getSeriesMetric('paywall.trial_started.v1', 'Сигналы пробного периода по дням', 'paywall_funnel'),
      getSeriesMetric('paywall.purchase_completed.v1', 'Сигналы покупки по дням', 'paywall_funnel'),
      getSeriesMetric('store.initial_purchase.v1', 'Подтверждённые первые покупки', 'revenuecat_premium_events'),
      getSeriesMetric('revenue.gross_usd_micros.v1', 'Валовая выручка USD', 'revenuecat_premium_events'),
    ],
    raw: { snapshot, trends: trends?.data || null },
  });
}

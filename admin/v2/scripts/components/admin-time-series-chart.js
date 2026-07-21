const MAX_ID_LENGTH = 80;
const MAX_TITLE_LENGTH = 180;
const MAX_LABEL_LENGTH = 180;
const MAX_SOURCE_LENGTH = 180;
const MAX_DEFINITION_LENGTH = 600;
const MAX_SERIES = 24;
const MAX_POINTS = 2_000;
const MAX_TREND_RANGE_DAYS = 90;
const MAX_WEEKLY_BUCKETS = Math.ceil(MAX_TREND_RANGE_DAYS / 7) + 1;

export const ADMIN_CHART_COLORS = Object.freeze(['#2563EB', '#7C3AED', '#0F766E']);

const UNIT_NAMES = new Set(['count', 'ratio', 'usd_micros']);
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const liveChartsById = new Map();
const liveChartsByHost = new Map();
const chartKindById = new Map();
const CHART_KINDS = Object.freeze([
  ['line', 'Линии', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m3 17 6-6 4 4 8-8"/></svg>'],
  ['area', 'Область', '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17l6-6 4 4 8-8v12H3z" opacity="0.85"/></svg>'],
  ['bar', 'Столбцы', '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="10" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="13" width="4" height="7" rx="1"/></svg>'],
]);
const ruDate = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const ruTooltipDate = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const ruNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const ruPercent = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const ruUsd = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * @typedef {'count'|'ratio'|'usd_micros'} AdminChartUnit
 * @typedef {'day'|'week'} AdminChartGranularity
 * @typedef {{bucketStart:string,value:number|null}} AdminTimeSeriesPoint
 * @typedef {{description:string,numerator?:string,denominator?:string}} AdminMetricDefinition
 * @typedef {Object} AdminTimeSeriesMetric
 * @property {string} metricId
 * @property {string} label
 * @property {AdminChartUnit} unit
 * @property {string} source
 * @property {string=} sourceLabel
 * @property {AdminMetricDefinition} definition
 * @property {string=} color
 * @property {AdminTimeSeriesPoint[]} points
 * @property {AdminTimeSeriesPoint[]|null} previousPoints
 * @typedef {Object} AdminTimeSeriesDescriptor
 * @property {string} id
 * @property {string} title
 * @property {string} ariaLabel
 * @property {AdminChartGranularity} granularity
 * @property {boolean} comparisonEnabled
 * @property {AdminTimeSeriesMetric[]} series
 * @property {(metricId:string, visible:boolean)=>void=} onToggleSeries
 */

function normalizeSpaces(value) {
  return String(value).replace(/[\u00a0\u202f]/g, ' ');
}

function fail(label, detail) {
  throw new TypeError(`${label}: ${detail}`);
}

export function assertPlainRecord(value, label, allowedKeys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(label, 'expected a plain object');
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    fail(label, 'custom prototype is not allowed');
  }
  const properties = Object.getOwnPropertyDescriptors(value);
  for (const [key, property] of Object.entries(properties)) {
    if ('get' in property || 'set' in property) fail(label, `accessor ${key} is not allowed`);
    if (!allowedKeys.includes(key)) fail(label, `unknown field ${key}`);
  }
  return value;
}

export function assertPlainArray(value, label, maximum, minimum = 0) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail(label, 'expected a plain array');
  }
  if (value.length < minimum || value.length > maximum) {
    fail(label, `array length must be ${minimum}..${maximum}`);
  }
  const properties = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const property = properties[String(index)];
    if (!property) fail(label, 'sparse arrays are not allowed');
    if ('get' in property || 'set' in property) fail(label, 'array accessors are not allowed');
  }
  for (const key of Object.keys(properties)) {
    if (key !== 'length' && !/^\d+$/.test(key)) fail(label, `unexpected array field ${key}`);
  }
  return value;
}

export function assertString(value, label, maximum, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string') fail(label, 'expected a string');
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    fail(label, `string length must be 1..${maximum}`);
  }
  return normalized;
}

export function assertId(value, label) {
  const id = assertString(value, label, MAX_ID_LENGTH);
  if (RESERVED_IDS.has(id) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) {
    fail(label, 'invalid id');
  }
  return id;
}

export function assertValue(value, label) {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(label, 'expected a finite number or null');
  return value;
}

function assertIsoDate(value, label) {
  const iso = assertString(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) fail(label, 'expected ISO YYYY-MM-DD');
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    fail(label, 'invalid calendar date');
  }
  return iso;
}

export function normalizeDefinition(value, label) {
  assertPlainRecord(value, label, ['description', 'numerator', 'denominator']);
  return {
    description: assertString(value.description, `${label}.description`, MAX_DEFINITION_LENGTH),
    numerator: assertString(value.numerator, `${label}.numerator`, MAX_DEFINITION_LENGTH, { optional: true }),
    denominator: assertString(value.denominator, `${label}.denominator`, MAX_DEFINITION_LENGTH, { optional: true }),
  };
}

function normalizePoint(value, label) {
  assertPlainRecord(value, label, ['bucketStart', 'value']);
  return {
    bucketStart: assertIsoDate(value.bucketStart, `${label}.bucketStart`),
    value: assertValue(value.value, `${label}.value`),
  };
}

function normalizePoints(value, label) {
  assertPlainArray(value, label, MAX_POINTS);
  const points = value.map((point, index) => normalizePoint(point, `${label}[${index}]`));
  for (let index = 1; index < points.length; index += 1) {
    if (points[index - 1].bucketStart >= points[index].bucketStart) {
      fail(label, 'bucketStart values must be unique and ascending');
    }
  }
  return points;
}

function isoDayNumber(iso) {
  return Math.trunc(parseIsoDate(iso).getTime() / 86_400_000);
}

function validatePointCadence(points, granularity, label) {
  const expectedStep = granularity === 'week' ? 7 : 1;
  if (granularity === 'week') {
    for (const point of points) {
      if (parseIsoDate(point.bucketStart).getUTCDay() !== 1) {
        fail(label, 'weekly buckets must start on Monday');
      }
    }
  }
  for (let index = 1; index < points.length; index += 1) {
    if (isoDayNumber(points[index].bucketStart) - isoDayNumber(points[index - 1].bucketStart) !== expectedStep) {
      fail(label, `invalid ${granularity} cadence step`);
    }
  }
}

function validatePointCount(points, granularity, label) {
  const maximum = granularity === 'week' ? MAX_WEEKLY_BUCKETS : MAX_TREND_RANGE_DAYS;
  if (points.length > maximum) {
    fail(label, `bucket count exceeds the ${MAX_TREND_RANGE_DAYS}-day backend range`);
  }
}

function validatePreviousWindow(points, previousPoints, granularity, label) {
  if (granularity === 'day') {
    if (previousPoints.length !== points.length) {
      fail(label, 'daily previous and current points must align by index');
    }
    const expectedOffset = points.length;
    for (let index = 0; index < points.length; index += 1) {
      const offset = isoDayNumber(points[index].bucketStart) - isoDayNumber(previousPoints[index].bucketStart);
      if (offset !== expectedOffset) {
        fail(label, 'previous period must be the adjacent equal-length daily window');
      }
    }
    return;
  }

  if (!points.length || !previousPoints.length) {
    if (!points.length && !previousPoints.length) return;
    fail(label, 'weekly current and previous buckets must either both be empty or both contain data');
  }
  if (Math.abs(points.length - previousPoints.length) > 1) {
    fail(label, 'weekly current and previous bucket counts may differ by at most one');
  }
  const pairedCount = Math.min(points.length, previousPoints.length);
  const boundaryOffset = isoDayNumber(points[0].bucketStart)
    - isoDayNumber(previousPoints[previousPoints.length - 1].bucketStart);
  if (boundaryOffset !== 0 && boundaryOffset !== 7) {
    fail(label, 'weekly previous period must touch the adjacent raw-window boundary');
  }
  const expectedOffset = isoDayNumber(points[0].bucketStart)
    - isoDayNumber(previousPoints[0].bucketStart);
  if (expectedOffset < 0
    || expectedOffset % 7 !== 0) {
    fail(label, 'weekly previous period must precede the current window on the same cadence');
  }
  for (let index = 1; index < pairedCount; index += 1) {
    const offset = isoDayNumber(points[index].bucketStart) - isoDayNumber(previousPoints[index].bucketStart);
    if (offset !== expectedOffset) {
      fail(label, 'weekly previous period must keep one relative-index offset');
    }
  }
}

function normalizeColor(value, label) {
  if (value === undefined) return undefined;
  const color = assertString(value, label, 48);
  if (!/^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) {
    fail(label, 'color must be #RGB or #RRGGBB');
  }
  return color;
}

/** @param {AdminTimeSeriesDescriptor} descriptor */
export function validateTimeSeriesDescriptor(descriptor) {
  assertPlainRecord(descriptor, 'descriptor', [
    'id', 'title', 'ariaLabel', 'granularity', 'comparisonEnabled', 'series', 'onToggleSeries',
  ]);
  const id = assertId(descriptor.id, 'descriptor.id');
  const title = assertString(descriptor.title, 'descriptor.title', MAX_TITLE_LENGTH);
  const ariaLabel = assertString(descriptor.ariaLabel, 'descriptor.ariaLabel', MAX_TITLE_LENGTH);
  if (descriptor.granularity !== 'day' && descriptor.granularity !== 'week') {
    fail('descriptor.granularity', 'expected day or week');
  }
  if (typeof descriptor.comparisonEnabled !== 'boolean') {
    fail('descriptor.comparisonEnabled', 'expected a boolean');
  }
  if (descriptor.onToggleSeries !== undefined && typeof descriptor.onToggleSeries !== 'function') {
    fail('descriptor.onToggleSeries', 'expected a function');
  }
  assertPlainArray(descriptor.series, 'descriptor.series', MAX_SERIES, 1);

  const metricIds = new Set();
  let sharedUnit = null;
  let alignedBuckets = null;
  let previousShapeInitialized = false;
  let alignedPreviousBuckets = null;
  const series = descriptor.series.map((rawSeries, seriesIndex) => {
    const label = `descriptor.series[${seriesIndex}]`;
    assertPlainRecord(rawSeries, label, [
      'metricId', 'label', 'unit', 'source', 'sourceLabel', 'definition', 'color', 'points', 'previousPoints',
    ]);
    const metricId = assertId(rawSeries.metricId, `${label}.metricId`);
    if (metricIds.has(metricId)) fail(`${label}.metricId`, 'duplicate metric id');
    metricIds.add(metricId);
    if (!UNIT_NAMES.has(rawSeries.unit)) fail(`${label}.unit`, 'unsupported unit');
    if (sharedUnit !== null && sharedUnit !== rawSeries.unit) {
      fail('descriptor.series', 'all series must share one unit');
    }
    sharedUnit = rawSeries.unit;
    const points = normalizePoints(rawSeries.points, `${label}.points`);
    validatePointCount(points, descriptor.granularity, `${label}.points`);
    validatePointCadence(points, descriptor.granularity, `${label}.points`);
    const bucketKeys = points.map((point) => point.bucketStart);
    if (alignedBuckets && bucketKeys.some((key, index) => alignedBuckets[index] !== key)
      || alignedBuckets && alignedBuckets.length !== bucketKeys.length) {
      fail(`${label}.points`, 'series must use aligned category keys');
    }
    if (!alignedBuckets) alignedBuckets = bucketKeys;
    let previousPoints = null;
    if (rawSeries.previousPoints !== null) {
      previousPoints = normalizePoints(rawSeries.previousPoints, `${label}.previousPoints`);
      validatePointCount(previousPoints, descriptor.granularity, `${label}.previousPoints`);
      validatePointCadence(previousPoints, descriptor.granularity, `${label}.previousPoints`);
      validatePreviousWindow(points, previousPoints, descriptor.granularity, `${label}.previousPoints`);
    }
    const previousBucketKeys = previousPoints?.map((point) => point.bucketStart) ?? null;
    if (!previousShapeInitialized) {
      previousShapeInitialized = true;
      alignedPreviousBuckets = previousBucketKeys;
    } else if ((alignedPreviousBuckets === null) !== (previousBucketKeys === null)) {
      fail(`${label}.previousPoints`, 'all series must use the same previous bucket shape');
    } else if (previousBucketKeys !== null
      && (previousBucketKeys.length !== alignedPreviousBuckets.length
        || previousBucketKeys.some((key, index) => alignedPreviousBuckets[index] !== key))) {
      fail(`${label}.previousPoints`, 'series must use aligned previous category keys');
    }
    return {
      metricId,
      label: assertString(rawSeries.label, `${label}.label`, MAX_LABEL_LENGTH),
      unit: rawSeries.unit,
      source: assertString(rawSeries.source, `${label}.source`, MAX_SOURCE_LENGTH),
      sourceLabel: assertString(rawSeries.sourceLabel, `${label}.sourceLabel`, MAX_SOURCE_LENGTH, { optional: true }),
      definition: normalizeDefinition(rawSeries.definition, `${label}.definition`),
      color: normalizeColor(rawSeries.color, `${label}.color`),
      points,
      previousPoints,
    };
  });

  return {
    id,
    title,
    ariaLabel,
    granularity: descriptor.granularity,
    comparisonEnabled: descriptor.comparisonEnabled,
    series,
    onToggleSeries: descriptor.onToggleSeries,
  };
}

function parseIsoDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addUtcDays(iso, days) {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return normalizeSpaces(ruDate.format(parseIsoDate(iso)));
}

function formatTooltipDate(iso, granularity) {
  if (granularity === 'week') return formatWeek(iso);
  return normalizeSpaces(ruTooltipDate.format(parseIsoDate(iso)));
}

function dateParts(iso) {
  return Object.fromEntries(ruDate.formatToParts(parseIsoDate(iso)).map((part) => [part.type, part.value]));
}

function formatWeek(iso) {
  const endIso = addUtcDays(iso, 6);
  const start = dateParts(iso);
  const end = dateParts(endIso);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${formatDate(endIso)}`;
  }
  if (start.year === end.year) {
    return `${start.day} ${start.month} – ${formatDate(endIso)}`;
  }
  return `${formatDate(iso)} – ${formatDate(endIso)}`;
}

export function formatAdminChartValue(value, unit) {
  if (value === null) return '—';
  if (!UNIT_NAMES.has(unit)) fail('unit', 'unsupported unit');
  if (unit === 'count') return `${normalizeSpaces(ruNumber.format(value))} шт.`;
  if (unit === 'ratio') return `${normalizeSpaces(ruPercent.format(value * 100))} %`;
  return normalizeSpaces(ruUsd.format(value / 1_000_000));
}

export function formatAdminChartTick(value, unit) {
  let numeric = value;
  if (typeof value === 'string' && /^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) {
    numeric = Number(value);
  }
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return '—';
  return formatAdminChartValue(numeric, unit);
}

export function formatAdminMetricDefinition(definition) {
  if (typeof definition === 'string') return definition;
  const additions = [];
  if (definition.numerator) additions.push(`числитель: ${definition.numerator}`);
  if (definition.denominator) additions.push(`знаменатель: ${definition.denominator}`);
  return additions.length ? `${definition.description}; ${additions.join('; ')}` : definition.description;
}

/**
 * Produces the single source of truth used by both Chart.js tooltips and aria-live inspection.
 * Time-series inspection: `{kind:'time-series', metricId:string, bucketIndex:number}`.
 * Bar inspection: `{kind:'bar', row:{label,value,source,sourceLabel?,definition}, unit:AdminChartUnit}`.
 */
export function formatInspectionText(descriptor, inspection) {
  if (inspection?.kind === 'bar') {
    const row = inspection.row;
    return `${row.label}: ${formatAdminChartValue(row.value, inspection.unit)}`
      + ` · Источник: ${row.sourceLabel || row.source}`
      + ` · Определение: ${formatAdminMetricDefinition(row.definition)}`;
  }
  if (inspection?.kind !== 'time-series') fail('inspection.kind', 'unsupported inspection kind');
  if (inspection.metricId === undefined) {
    const requestedMetricIds = inspection.metricIds ?? descriptor.series.map((item) => item.metricId);
    assertPlainArray(requestedMetricIds, 'inspection.metricIds', MAX_SERIES);
    const metricIds = [...new Set(requestedMetricIds.map((metricId) => (
      assertId(metricId, 'inspection.metricIds[]')
    )))];
    return metricIds.map((metricId) => formatInspectionText(descriptor, {
      kind: 'time-series', metricId, bucketIndex: inspection.bucketIndex,
    })).join(' | ');
  }
  const series = descriptor.series.find((item) => item.metricId === inspection.metricId);
  if (!series) fail('inspection.metricId', 'unknown metric');
  if (!Number.isInteger(inspection.bucketIndex)
    || inspection.bucketIndex < 0
    || inspection.bucketIndex >= series.points.length) {
    fail('inspection.bucketIndex', 'outside the series');
  }
  const current = series.points[inspection.bucketIndex];
  const currentDate = descriptor.granularity === 'week'
    ? formatWeek(current.bucketStart)
    : formatDate(current.bucketStart);
  let result = `${currentDate} · ${series.label}: ${formatAdminChartValue(current.value, series.unit)}`;
  if (descriptor.comparisonEnabled) {
    const previous = series.previousPoints?.[inspection.bucketIndex] ?? null;
    if (previous) {
      const previousDate = descriptor.granularity === 'week'
        ? formatWeek(previous.bucketStart)
        : formatDate(previous.bucketStart);
      result += ` · Предыдущий период — ${previousDate}: ${formatAdminChartValue(previous.value, series.unit)}`;
    } else {
      result += ' · Предыдущий период: данные недоступны (—)';
    }
  }
  result += ` · Источник: ${series.sourceLabel || series.source}`;
  result += ` · Определение: ${formatAdminMetricDefinition(series.definition)}`;
  return result;
}

export function assertAdminChartHost(host) {
  if (!host || typeof host.appendChild !== 'function'
    || !host.ownerDocument || typeof host.ownerDocument.createElement !== 'function') {
    fail('host', 'expected a DOM element with ownerDocument');
  }
  return host;
}

export function assertAdminChartFactory(chartFactory) {
  if (typeof chartFactory !== 'function') fail('chartFactory', 'Chart constructor is required');
  return chartFactory;
}

export function createAdminChartScaffold(host, descriptor) {
  const document = host.ownerDocument;
  const root = document.createElement('div');
  root.className = 'admin-chart';
  root.setAttribute('data-admin-chart-id', descriptor.id);
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', descriptor.title);

  const heading = document.createElement('h3');
  heading.className = 'admin-chart__title';
  heading.textContent = descriptor.title;
  const head = document.createElement('div');
  head.className = 'admin-chart__head';
  head.appendChild(heading);
  const kinds = document.createElement('div');
  kinds.className = 'admin-chart__kinds';
  kinds.setAttribute('data-chart-kinds', '');
  head.appendChild(kinds);
  const legend = document.createElement('div');
  legend.className = 'admin-chart__legend';
  legend.setAttribute('data-chart-legend', '');
  legend.setAttribute('role', 'tablist');
  legend.setAttribute('aria-label', 'Показатель графика');
  const summary = document.createElement('p');
  summary.className = 'admin-chart__summary';
  summary.setAttribute('data-chart-summary', '');
  const canvas = document.createElement('canvas');
  canvas.className = 'admin-chart__canvas';
  canvas.id = `${descriptor.id}-canvas`;
  canvas.setAttribute('id', canvas.id);
  canvas.tabIndex = 0;
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', descriptor.ariaLabel);
  const live = document.createElement('p');
  live.className = 'admin-chart__live';
  live.setAttribute('data-chart-live', '');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  root.append(head, legend, summary, canvas, live);
  host.appendChild(root);
  return { root, legend, summary, canvas, live, kinds };
}

export function createAdminChartTable(document, captionText, headers, rows) {
  const details = document.createElement('details');
  details.className = 'admin-chart__table-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Таблица данных';
  const table = document.createElement('table');
  table.className = 'admin-chart__table';
  const caption = document.createElement('caption');
  caption.textContent = captionText;
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const header of headers) {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = header;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    row.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.setAttribute('scope', 'row');
      cell.textContent = value;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  }
  table.append(caption, thead, tbody);
  details.append(summary, table);
  return details;
}

export function adminChartAnimation() {
  let reduced = false;
  try {
    reduced = typeof globalThis.matchMedia === 'function'
      && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    reduced = false;
  }
  return reduced ? false : { duration: 240 };
}

export function adminChartValueScale(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  const min = finite.length ? Math.min(0, ...finite) : 0;
  let max = finite.length ? Math.max(0, ...finite) : 1;
  if (min === max) max = min === 0 ? 1 : min + 1;
  return { beginAtZero: true, min, max };
}

function destroyRecord(record) {
  if (!record || record.destroyed) return false;
  record.destroyed = true;
  for (const cleanup of record.cleanup) cleanup();
  if (typeof record.chart?.destroy === 'function') record.chart.destroy();
  if (typeof record.root?.remove === 'function') record.root.remove();
  if (liveChartsById.get(record.id) === record) liveChartsById.delete(record.id);
  if (liveChartsByHost.get(record.host) === record) liveChartsByHost.delete(record.host);
  return true;
}

export function destroyAdminChart(idOrHost) {
  const record = typeof idOrHost === 'string'
    ? liveChartsById.get(assertId(idOrHost, 'id'))
    : liveChartsByHost.get(idOrHost);
  return destroyRecord(record);
}

export function destroyAdminChartConflicts(id, host) {
  const conflicts = new Set([liveChartsById.get(id), liveChartsByHost.get(host)]);
  let count = 0;
  for (const conflict of conflicts) if (destroyRecord(conflict)) count += 1;
  return count;
}

export function registerAdminChart({ id, host, root, chart, cleanup = [] }) {
  destroyAdminChartConflicts(id, host);
  const record = { id, host, root, chart, cleanup: [...cleanup], destroyed: false };
  liveChartsById.set(id, record);
  liveChartsByHost.set(host, record);
  return {
    chart,
    destroy: () => destroyRecord(record),
    resetZoom: () => {
      if (record.destroyed || typeof chart.resetZoom !== 'function') return false;
      chart.resetZoom();
      return true;
    },
  };
}

export function destroyAdminCharts() {
  const records = [...liveChartsById.values()];
  let count = 0;
  for (const record of records) if (destroyRecord(record)) count += 1;
  liveChartsById.clear();
  liveChartsByHost.clear();
  return count;
}

export function resetAdminChartZoom(id) {
  const records = id === undefined
    ? [...liveChartsById.values()]
    : [liveChartsById.get(assertId(id, 'id'))].filter(Boolean);
  let count = 0;
  for (const record of records) {
    if (!record.destroyed && typeof record.chart?.resetZoom === 'function') {
      record.chart.resetZoom();
      count += 1;
    }
  }
  return count;
}

function buildTimeSeriesTable(descriptor, document) {
  const rows = [];
  for (const series of descriptor.series) {
    const rowCount = Math.max(series.points.length, series.previousPoints?.length ?? 0);
    for (let index = 0; index < rowCount; index += 1) {
      const point = series.points[index] ?? null;
      const previous = series.previousPoints?.[index] ?? null;
      rows.push([
        point?.bucketStart ?? '—',
        series.label,
        formatAdminChartValue(point?.value ?? null, series.unit),
        previous?.bucketStart ?? '—',
        formatAdminChartValue(previous?.value ?? null, series.unit),
        series.sourceLabel || series.source,
        formatAdminMetricDefinition(series.definition),
      ]);
    }
  }
  return createAdminChartTable(document, descriptor.title, [
    'Дата', 'Серия', 'Значение', 'Дата предыдущего периода', 'Предыдущий период', 'Источник', 'Определение',
  ], rows);
}

function colorWithAlpha(color, alpha) {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(color);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function createSeriesFill(canvas, color) {
  try {
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 230);
    gradient.addColorStop(0, colorWithAlpha(color, 0.28));
    gradient.addColorStop(1, colorWithAlpha(color, 0));
    return gradient;
  } catch {
    return colorWithAlpha(color, 0.18);
  }
}

function createTimeSeriesDatasets(descriptor, canvas) {
  const datasets = [];
  descriptor.series.forEach((series, index) => {
    const color = series.color || ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length];
    const common = {
      metricId: series.metricId,
      borderColor: color,
      backgroundColor: createSeriesFill(canvas, color),
      borderWidth: 2,
      fill: true,
      spanGaps: false,
      tension: 0.28,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      pointHitRadius: 12,
      pointBackgroundColor: 'rgba(13, 15, 23, 0.96)',
      pointBorderColor: color,
      pointHoverBackgroundColor: color,
    };
    datasets.push({
      ...common,
      label: series.label,
      period: 'current',
      borderDash: [],
      data: series.points.map((point) => point.value),
      hidden: index !== 0,
    });
    if (series.previousPoints !== null) {
      datasets.push({
        ...common,
        label: `${series.label} — предыдущий период`,
        period: 'previous',
        borderDash: [6, 4],
        data: series.points.map((_, pointIndex) => series.previousPoints[pointIndex]?.value ?? null),
        hidden: index !== 0 || !descriptor.comparisonEnabled,
      });
    }
  });
  return datasets;
}

/**
 * @param {Element} host
 * @param {AdminTimeSeriesDescriptor} descriptor
 * @param {Function} chartFactory
 * @returns {{chart:object,destroy:()=>boolean,resetZoom:()=>boolean}}
 */
export function mountTimeSeriesChart(host, descriptor, chartFactory = globalThis.Chart) {
  assertAdminChartHost(host);
  assertAdminChartFactory(chartFactory);
  const normalized = validateTimeSeriesDescriptor(descriptor);
  destroyAdminChartConflicts(normalized.id, host);
  const scaffold = createAdminChartScaffold(host, normalized);
  const table = buildTimeSeriesTable(normalized, host.ownerDocument);
  scaffold.root.appendChild(table);
  const datasets = createTimeSeriesDatasets(normalized, scaffold.canvas);
  let activeMetricId = normalized.series[0].metricId;
  const formatVisibleInspection = (bucketIndex) => {
    return formatInspectionText(normalized, {
      kind: 'time-series',
      metricId: activeMetricId,
      bucketIndex,
    });
  };
  const config = {
    type: 'line',
    data: {
      labels: normalized.series[0].points.map((point) => point.bucketStart),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: adminChartAnimation(),
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'category',
          grid: { color: 'rgba(107, 114, 128, 0.16)' },
          ticks: {
            color: '#6B7280',
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            callback(value) {
              const raw = this.getLabelForValue(value);
              return typeof raw === 'string' ? raw.slice(5) : raw;
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(107, 114, 128, 0.16)' },
          ticks: {
            color: '#6B7280',
            font: { size: 10 },
            ...(normalized.series[0].unit === 'count' ? { precision: 0 } : {}),
            callback: (value) => formatAdminChartTick(value, normalized.series[0].unit),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0B0E16',
          borderColor: '#2A2F40',
          borderWidth: 1,
          titleColor: '#F1F5F9',
          bodyColor: '#CBD5E1',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const iso = String(items?.[0]?.label ?? '');
              return /^\d{4}-\d{2}-\d{2}$/.test(iso)
                ? formatTooltipDate(iso, normalized.granularity)
                : iso;
            },
            label: (item) => {
              const dataset = item?.dataset || {};
              const series = normalized.series.find((entry) => entry.metricId === dataset.metricId);
              if (!series) return '';
              const value = typeof item?.parsed?.y === 'number'
                ? item.parsed.y
                : dataset.data?.[item?.dataIndex] ?? null;
              return `${dataset.label || series.label}: ${formatAdminChartValue(value, series.unit)}`;
            },
          },
        },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            drag: { enabled: false },
            mode: 'x',
          },
          limits: { x: { minRange: 3 } },
        },
      },
    },
  };

  let chart;
  try {
    chart = new chartFactory(scaffold.canvas, config);
  } catch (error) {
    scaffold.root.remove();
    throw error;
  }

  const cleanup = [];
  let activeBucket = 0;
  const metricButtons = new Map();
  const visibleCurrentDatasets = () => chart.data.datasets
    .map((dataset, datasetIndex) => ({ dataset, datasetIndex }))
    .filter(({ dataset }) => dataset.period === 'current' && dataset.hidden !== true);
  const inspect = () => {
    const visible = visibleCurrentDatasets();
    if (!normalized.series[0].points.length || !visible.length) {
      if (typeof chart.setActiveElements === 'function') chart.setActiveElements([]);
      if (typeof chart.tooltip?.setActiveElements === 'function') {
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      }
      scaffold.live.textContent = visible.length ? 'Нет данных для выбранного периода.' : 'Нет видимых рядов данных.';
      return;
    }
    const elements = visible.map(({ datasetIndex }) => ({ datasetIndex, index: activeBucket }));
    if (typeof chart.setActiveElements === 'function') chart.setActiveElements(elements);
    if (typeof chart.tooltip?.setActiveElements === 'function') {
      chart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
    }
    scaffold.live.textContent = formatVisibleInspection(activeBucket);
  };
  const clearInspection = () => {
    if (typeof chart.setActiveElements === 'function') chart.setActiveElements([]);
    if (typeof chart.tooltip?.setActiveElements === 'function') {
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    }
  };
  const updateSummary = () => {
    const series = normalized.series.find((item) => item.metricId === activeMetricId);
    if (!series) return;
    const total = series.points.reduce((sum, point) => (
      typeof point.value === 'number' && Number.isFinite(point.value) ? sum + point.value : sum
    ), 0);
    scaffold.summary.textContent = `${series.label} — итого за период: ${formatAdminChartValue(total, series.unit)}`;
    scaffold.live.textContent = `Выбран показатель «${series.label}». Используйте стрелки влево и вправо на графике, чтобы услышать точные значения по датам.`;
  };
  const selectMetric = (metricId, updateChart = true) => {
    activeMetricId = metricId;
    activeBucket = 0;
    for (const dataset of chart.data.datasets) {
      const selected = dataset.metricId === metricId;
      dataset.hidden = dataset.period === 'previous'
        ? (!selected || !normalized.comparisonEnabled)
        : !selected;
    }
    for (const [buttonMetricId, button] of metricButtons) {
      const selected = buttonMetricId === metricId;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.setAttribute('tabindex', String(button.tabIndex));
    }
    clearInspection();
    updateSummary();
    if (updateChart) {
      if (typeof chart.resetZoom === 'function') chart.resetZoom();
      if (typeof chart.update === 'function') chart.update();
    }
  };
  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const lastIndex = normalized.series[0].points.length - 1;
    if (lastIndex < 0) return;
    activeBucket = event.key === 'ArrowRight'
      ? Math.min(lastIndex, activeBucket + 1)
      : Math.max(0, activeBucket - 1);
    inspect();
    if (typeof chart.update === 'function') chart.update('none');
  };
  scaffold.canvas.addEventListener('keydown', onKeyDown);
  cleanup.push(() => scaffold.canvas.removeEventListener('keydown', onKeyDown));

  normalized.series.forEach((series, seriesIndex) => {
    const button = host.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('type', 'button');
    button.className = 'admin-chart__legend-button';
    button.setAttribute('data-metric-id', series.metricId);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', scaffold.canvas.id);
    button.setAttribute('aria-selected', String(seriesIndex === 0));
    button.tabIndex = seriesIndex === 0 ? 0 : -1;
    button.setAttribute('tabindex', String(button.tabIndex));
    const tooltipText = `Показать на графике показатель «${series.label}»`;
    button.setAttribute('title', tooltipText);
    button.setAttribute('data-tooltip', tooltipText);
    button.textContent = series.label;
    const onClick = () => {
      selectMetric(series.metricId);
    };
    const onTabKeyDown = (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (seriesIndex + offset + normalized.series.length) % normalized.series.length;
      const nextSeries = normalized.series[nextIndex];
      selectMetric(nextSeries.metricId);
      const nextButton = metricButtons.get(nextSeries.metricId);
      if (typeof nextButton?.focus === 'function') nextButton.focus();
    };
    button.addEventListener('click', onClick);
    button.addEventListener('keydown', onTabKeyDown);
    cleanup.push(() => button.removeEventListener('click', onClick));
    cleanup.push(() => button.removeEventListener('keydown', onTabKeyDown));
    metricButtons.set(series.metricId, button);
    scaffold.legend.appendChild(button);
  });
  const kindButtons = new Map();
  const applyChartKind = (kind) => {
    chartKindById.set(normalized.id, kind);
    for (const dataset of chart.data.datasets) {
      dataset.type = kind === 'bar' ? 'bar' : 'line';
      dataset.fill = kind === 'area';
      if (kind === 'bar') {
        dataset.borderRadius = 5;
        dataset.maxBarThickness = 26;
      }
    }
    for (const [buttonKind, button] of kindButtons) {
      const selected = buttonKind === kind;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    if (typeof chart.update === 'function') chart.update();
  };
  for (const [kind, label, icon] of CHART_KINDS) {
    const button = host.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('type', 'button');
    button.className = 'admin-chart__kind';
    button.setAttribute('aria-pressed', 'false');
    const kindTooltip = `Показать график как: ${label}`;
    button.setAttribute('title', kindTooltip);
    button.setAttribute('data-tooltip', kindTooltip);
    button.setAttribute('aria-label', label);
    button.innerHTML = icon;
    const onClick = () => applyChartKind(kind);
    button.addEventListener('click', onClick);
    cleanup.push(() => button.removeEventListener('click', onClick));
    kindButtons.set(kind, button);
    scaffold.kinds.appendChild(button);
  }
  selectMetric(activeMetricId, false);
  applyChartKind(chartKindById.get(normalized.id) || 'area');
  return registerAdminChart({ id: normalized.id, host, root: scaffold.root, chart, cleanup });
}

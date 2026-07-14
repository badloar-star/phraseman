import assert from 'node:assert/strict';
import fs from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

const timeSeriesModuleUrl = new URL(
  '../admin/v2/scripts/components/admin-time-series-chart.js',
  import.meta.url,
);
const barModuleUrl = new URL(
  '../admin/v2/scripts/components/admin-bar-chart.js',
  import.meta.url,
);

const [{
  destroyAdminChart,
  destroyAdminCharts,
  formatInspectionText,
  mountTimeSeriesChart,
  resetAdminChartZoom,
}, {
  mountBarChart,
}] = await Promise.all([
  import(timeSeriesModuleUrl),
  import(barModuleUrl),
]);

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this._textContent = '';
    this.className = '';
    this.tabIndex = -1;
    this.type = '';
  }

  set innerHTML(_value) {
    throw new Error('innerHTML is forbidden in chart components');
  }

  get innerHTML() {
    return '';
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  appendChild(child) {
    if (!(child instanceof FakeElement)) throw new TypeError('Fake DOM only accepts elements');
    if (child.parentNode) child.remove();
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    for (const child of children) this.appendChild(child);
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._textContent = '';
    this.append(...children);
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;
    for (const listener of [...(this.listeners.get(event.type) ?? [])]) listener.call(this, event);
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: 'click', defaultPrevented: false, preventDefault() {} });
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
}

function matchesSelector(element, selector) {
  const attributeMatch = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (attributeMatch) {
    const actual = element.getAttribute(attributeMatch[1]);
    return attributeMatch[2] === undefined ? actual !== null : actual === attributeMatch[2];
  }
  return element.tagName === selector.toUpperCase();
}

class FakeChart {
  static instances = [];

  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.data = config.data;
    this.options = config.options;
    this.destroyCalls = 0;
    this.resetZoomCalls = 0;
    this.updateCalls = [];
    this.activeElements = [];
    this.tooltipActiveElements = [];
    this.tooltip = {
      setActiveElements: (elements, position) => {
        this.tooltipActiveElements = elements;
        this.tooltipPosition = position;
      },
    };
    FakeChart.instances.push(this);
  }

  destroy() {
    this.destroyCalls += 1;
  }

  resetZoom() {
    this.resetZoomCalls += 1;
  }

  update(mode) {
    this.updateCalls.push(mode);
  }

  setActiveElements(elements) {
    this.activeElements = elements;
  }
}

function keyEvent(key) {
  return {
    type: 'keydown',
    key,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

function createHost() {
  return new FakeDocument().createElement('section');
}

function definition(description = 'Завершённые покупки') {
  return { description };
}

function timeSeriesDescriptor(overrides = {}) {
  return {
    id: 'paywall-purchases',
    title: 'Покупки по дням',
    ariaLabel: 'График покупок по дням',
    granularity: 'day',
    comparisonEnabled: true,
    series: [{
      metricId: 'purchases',
      label: 'Покупки',
      unit: 'count',
      source: 'revenuecat',
      sourceLabel: 'RevenueCat',
      definition: definition(),
      color: '#2563EB',
      points: [
        { bucketStart: '2026-07-12', value: 1 },
        { bucketStart: '2026-07-13', value: null },
        { bucketStart: '2026-07-14', value: 3 },
      ],
      previousPoints: [
        { bucketStart: '2026-07-09', value: 4 },
        { bucketStart: '2026-07-10', value: 5 },
        { bucketStart: '2026-07-11', value: 6 },
      ],
    }],
    ...overrides,
  };
}

function barDescriptor(overrides = {}) {
  return {
    id: 'paywall-plans',
    title: 'Покупки по тарифам',
    ariaLabel: 'График покупок по тарифам',
    unit: 'count',
    rows: [
      {
        id: 'monthly',
        label: 'Месячный',
        value: 7,
        source: 'revenuecat',
        sourceLabel: 'RevenueCat',
        definition: 'Активные подписки',
      },
      {
        id: 'yearly',
        label: 'Годовой',
        value: null,
        source: 'revenuecat',
        definition: 'Активные подписки',
      },
    ],
    ...overrides,
  };
}

function pointRange(startIso, count, stepDays = 1, baseValue = 1) {
  const points = [];
  const cursor = new Date(`${startIso}T00:00:00.000Z`);
  for (let index = 0; index < count; index += 1) {
    points.push({ bucketStart: cursor.toISOString().slice(0, 10), value: baseValue + index });
    cursor.setUTCDate(cursor.getUTCDate() + stepDays);
  }
  return points;
}

beforeEach(() => {
  FakeChart.instances = [];
  globalThis.matchMedia = () => ({ matches: false });
});

afterEach(() => {
  destroyAdminCharts();
  delete globalThis.matchMedia;
});

test('keeps null time-series values, category ISO labels and comparison styling', () => {
  const host = createHost();
  const { chart } = mountTimeSeriesChart(host, timeSeriesDescriptor(), FakeChart);
  const [current, previous] = chart.data.datasets;

  assert.equal(chart.config.type, 'line');
  assert.deepEqual(chart.data.labels, ['2026-07-12', '2026-07-13', '2026-07-14']);
  assert.deepEqual(current.data, [1, null, 3]);
  assert.equal(current.spanGaps, false);
  assert.equal(current.tension, 0.28);
  assert.equal(current.pointRadius, 0);
  assert.ok(current.pointHoverRadius > 0);
  assert.deepEqual(current.borderDash, []);
  assert.equal(current.metricId, 'purchases');
  assert.equal(current.period, 'current');
  assert.deepEqual(previous.borderDash, [6, 4]);
  assert.equal(previous.borderColor, current.borderColor);
  assert.equal(previous.metricId, current.metricId);
  assert.equal(previous.period, 'previous');
  assert.equal(previous.hidden, false);
  assert.equal(chart.options.responsive, true);
  assert.equal(chart.options.maintainAspectRatio, false);
  assert.equal(chart.options.scales.x.type, 'category');
  assert.equal(chart.options.scales.y.beginAtZero, true);
  assert.equal(chart.options.scales.y.min, 0);
  assert.equal(chart.options.scales.y.max, 6);
  assert.equal('adapters' in chart.options.scales.x, false);
  assert.equal(chart.options.plugins.zoom.pan.mode, 'x');
  assert.equal(chart.options.plugins.zoom.zoom.wheel.enabled, true);
  assert.equal(chart.options.plugins.zoom.zoom.pinch.enabled, true);
  assert.equal(chart.options.plugins.zoom.zoom.mode, 'x');
});

test('rejects mixed time-series units and unsafe descriptor containers', () => {
  const countSeries = timeSeriesDescriptor().series[0];
  const moneySeries = {
    ...countSeries,
    metricId: 'revenue',
    label: 'Выручка',
    unit: 'usd_micros',
  };
  assert.throws(
    () => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({ series: [countSeries, moneySeries] }), FakeChart),
    /unit|единиц/i,
  );

  let accessorCalls = 0;
  const accessorSeries = [];
  Object.defineProperty(accessorSeries, '0', {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return countSeries;
    },
  });
  accessorSeries.length = 1;
  assert.throws(
    () => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({ series: accessorSeries }), FakeChart),
    /accessor|array|массив|schema/i,
  );
  assert.equal(accessorCalls, 0);

  class CustomRows extends Array {}
  assert.throws(
    () => mountBarChart(createHost(), barDescriptor({ rows: new CustomRows(...barDescriptor().rows) }), FakeChart),
    /array|prototype|массив|schema/i,
  );
  assert.throws(
    () => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({ title: 'x'.repeat(300) }), FakeChart),
    /title|строк/i,
  );
  assert.throws(
    () => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({ id: '__proto__' }), FakeChart),
    /id/i,
  );
  assert.throws(
    () => mountTimeSeriesChart(null, timeSeriesDescriptor(), FakeChart),
    /host/i,
  );
  assert.throws(
    () => mountTimeSeriesChart(createHost(), timeSeriesDescriptor(), {}),
    /chart/i,
  );
});

test('keeps the previous series hidden when comparison is disabled', () => {
  const { chart } = mountTimeSeriesChart(
    createHost(),
    timeSeriesDescriptor({ comparisonEnabled: false }),
    FakeChart,
  );
  assert.equal(chart.data.datasets[0].hidden, false);
  assert.equal(chart.data.datasets[1].hidden, true);
  assert.deepEqual(chart.data.datasets[1].borderDash, [6, 4]);
});

test('uses one exact Russian formatter for live inspection and tooltips', () => {
  const descriptor = timeSeriesDescriptor({
    series: [{
      ...timeSeriesDescriptor().series[0],
      points: [{ bucketStart: '2026-07-14', value: 12 }],
      previousPoints: [{ bucketStart: '2026-07-13', value: 10 }],
    }],
  });
  const expected = '14 июля 2026 г. · Покупки: 12 шт. · Предыдущий период — 13 июля 2026 г.: 10 шт. · Источник: RevenueCat · Определение: Завершённые покупки';
  assert.equal(
    formatInspectionText(descriptor, { kind: 'time-series', metricId: 'purchases', bucketIndex: 0 }),
    expected,
  );

  const host = createHost();
  const { chart } = mountTimeSeriesChart(host, descriptor, FakeChart);
  const tooltipItems = chart.data.datasets.map((dataset) => ({ dataset, dataIndex: 0 }));
  const tooltipCallbacks = chart.options.plugins.tooltip.callbacks;
  const tooltip = tooltipCallbacks.afterBody(tooltipItems);
  const canvas = host.querySelector('canvas');
  const event = keyEvent('ArrowRight');
  canvas.dispatchEvent(event);

  assert.deepEqual(tooltipCallbacks.title(tooltipItems), []);
  assert.deepEqual(tooltipItems.map((item) => tooltipCallbacks.label(item)), [[], []]);
  assert.equal(tooltip, expected);
  assert.equal(host.querySelector('[data-chart-live]').textContent, expected);
  assert.equal(tooltip.match(/Покупки:/g)?.length, 1);
  assert.doesNotMatch(tooltip, /2026-07-14/);
  assert.equal(event.defaultPrevented, true);
  assert.doesNotMatch(expected, /0[.,]0\s*%/);
});

test('tooltip keeps every series when Chart.js omits a null current item', () => {
  const base = timeSeriesDescriptor().series[0];
  const descriptor = timeSeriesDescriptor({
    series: [
      {
        ...base,
        metricId: 'series-a',
        label: 'Серия A',
        points: [{ bucketStart: '2026-07-14', value: null }],
        previousPoints: [{ bucketStart: '2026-07-13', value: 7 }],
      },
      {
        ...base,
        metricId: 'series-b',
        label: 'Серия B',
        points: [{ bucketStart: '2026-07-14', value: 5 }],
        previousPoints: [{ bucketStart: '2026-07-13', value: 4 }],
      },
    ],
  });
  const host = createHost();
  const { chart } = mountTimeSeriesChart(host, descriptor, FakeChart);
  const callbacks = chart.options.plugins.tooltip.callbacks;
  const incompleteItems = [
    { dataset: chart.data.datasets[1], dataIndex: 0 },
    { dataset: chart.data.datasets[2], dataIndex: 0 },
  ];
  const expected = formatInspectionText(descriptor, { kind: 'time-series', bucketIndex: 0 });
  const tooltip = callbacks.afterBody(incompleteItems);

  host.querySelector('canvas').dispatchEvent(keyEvent('ArrowRight'));
  assert.equal(tooltip, expected);
  assert.equal(host.querySelector('[data-chart-live]').textContent, expected);
  assert.match(tooltip, /Серия A: —/);
  assert.match(tooltip, /Серия A:[\s\S]*Предыдущий период[\s\S]*7 шт\./);
  assert.match(tooltip, /Серия B: 5 шт\./);
  assert.equal(callbacks.afterBody([]), '');
  assert.equal(callbacks.afterBody([{ dataset: chart.data.datasets[0], dataIndex: null }]), '');
  assert.equal(callbacks.afterBody([{ dataset: chart.data.datasets[0], dataIndex: 99 }]), '');
});

test('tooltip and live inspection share legend visibility without losing null series', () => {
  const base = timeSeriesDescriptor().series[0];
  const descriptor = timeSeriesDescriptor({
    series: [
      {
        ...base,
        metricId: 'series-a',
        label: 'Серия A',
        points: [{ bucketStart: '2026-07-14', value: null }],
        previousPoints: [{ bucketStart: '2026-07-13', value: 7 }],
      },
      {
        ...base,
        metricId: 'series-b',
        label: 'Серия B',
        points: [{ bucketStart: '2026-07-14', value: 5 }],
        previousPoints: [{ bucketStart: '2026-07-13', value: 4 }],
      },
    ],
  });
  const host = createHost();
  const { chart } = mountTimeSeriesChart(host, descriptor, FakeChart);
  const callbacks = chart.options.plugins.tooltip.callbacks;
  const incompleteItems = [
    { dataset: chart.data.datasets[1], dataIndex: 0 },
    { dataset: chart.data.datasets[2], dataIndex: 0 },
  ];
  const [seriesAButton, seriesBButton] = host.querySelectorAll('button');
  const live = host.querySelector('[data-chart-live]');

  seriesAButton.click();
  const withoutA = callbacks.afterBody(incompleteItems);
  assert.equal(withoutA, live.textContent);
  assert.doesNotMatch(withoutA, /Серия A/);
  assert.match(withoutA, /Серия B: 5 шт\./);
  assert.equal(seriesAButton.getAttribute('aria-pressed'), 'false');

  seriesAButton.click();
  const withAAgain = callbacks.afterBody(incompleteItems);
  assert.equal(withAAgain, live.textContent);
  assert.match(withAAgain, /Серия A: —/);
  assert.match(withAAgain, /Серия A:[\s\S]*Предыдущий период[\s\S]*7 шт\./);
  assert.match(withAAgain, /Серия B: 5 шт\./);
  assert.equal(seriesAButton.getAttribute('aria-pressed'), 'true');

  seriesAButton.click();
  seriesBButton.click();
  assert.equal(live.textContent, 'Нет видимых рядов данных.');
  assert.equal(callbacks.afterBody(incompleteItems), 'Нет видимых рядов данных.');
  assert.deepEqual(chart.activeElements, []);
  assert.deepEqual(chart.tooltipActiveElements, []);
  seriesAButton.click();
  assert.deepEqual(chart.activeElements, [{ datasetIndex: 0, index: 0 }]);
  assert.match(live.textContent, /Серия A: —/);
});

test('formats deterministic Russian week ranges in UTC', () => {
  const descriptor = timeSeriesDescriptor({
    granularity: 'week',
    series: [{
      ...timeSeriesDescriptor().series[0],
      points: [{ bucketStart: '2026-07-13', value: 20 }],
      previousPoints: [{ bucketStart: '2026-07-06', value: 15 }],
    }],
  });
  assert.equal(
    formatInspectionText(descriptor, { kind: 'time-series', metricId: 'purchases', bucketIndex: 0 }),
    '13–19 июля 2026 г. · Покупки: 20 шт. · Предыдущий период — 6–12 июля 2026 г.: 15 шт. · Источник: RevenueCat · Определение: Завершённые покупки',
  );
});

test('honors reduced motion and caps normal animation at 240ms', () => {
  globalThis.matchMedia = () => ({ matches: true });
  const reduced = mountTimeSeriesChart(createHost(), timeSeriesDescriptor(), FakeChart);
  assert.equal(reduced.chart.options.animation, false);
  reduced.destroy();

  globalThis.matchMedia = () => ({ matches: false });
  const normal = mountTimeSeriesChart(createHost(), timeSeriesDescriptor(), FakeChart);
  assert.equal(normal.chart.options.animation.duration, 240);
});

test('makes the canvas keyboard inspectable, clamps buckets and resets zoom', () => {
  const host = createHost();
  const handle = mountTimeSeriesChart(host, timeSeriesDescriptor(), FakeChart);
  const canvas = host.querySelector('canvas');
  const live = host.querySelector('[data-chart-live]');

  assert.equal(canvas.getAttribute('role'), 'img');
  assert.equal(canvas.getAttribute('aria-label'), 'График покупок по дням');
  assert.equal(canvas.getAttribute('tabindex'), '0');
  assert.equal(canvas.tabIndex, 0);
  assert.match(canvas.className, /admin-chart__canvas/);
  assert.equal(live.getAttribute('aria-live'), 'polite');

  canvas.dispatchEvent(keyEvent('ArrowRight'));
  assert.deepEqual(handle.chart.activeElements, [{ datasetIndex: 0, index: 1 }]);
  assert.match(live.textContent, /13 июля 2026 г\./);
  assert.match(live.textContent, /Покупки: —/);
  canvas.dispatchEvent(keyEvent('ArrowRight'));
  canvas.dispatchEvent(keyEvent('ArrowRight'));
  assert.deepEqual(handle.chart.activeElements, [{ datasetIndex: 0, index: 2 }]);
  canvas.dispatchEvent(keyEvent('ArrowLeft'));
  assert.deepEqual(handle.chart.tooltipActiveElements, [{ datasetIndex: 0, index: 1 }]);

  handle.resetZoom();
  assert.equal(handle.chart.resetZoomCalls, 1);
  assert.equal(resetAdminChartZoom('paywall-purchases'), 1);
  assert.equal(handle.chart.resetZoomCalls, 2);
  assert.equal(resetAdminChartZoom(), 1);
  assert.equal(handle.chart.resetZoomCalls, 3);
});

test('legend buttons toggle current and paired comparison datasets locally', () => {
  const toggles = [];
  const descriptor = timeSeriesDescriptor({
    onToggleSeries: (metricId, visible) => toggles.push([metricId, visible]),
  });
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error('network must not be used');
  };
  try {
    const host = createHost();
    const { chart } = mountTimeSeriesChart(host, descriptor, FakeChart);
    const button = host.querySelector('button');

    assert.equal(host.querySelectorAll('button').length, 1);
    assert.equal(button.type, 'button');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(button.textContent, 'Покупки');
    assert.match(button.className, /admin-chart__legend-button/);

    button.click();
    assert.equal(chart.data.datasets[0].hidden, true);
    assert.equal(chart.data.datasets[1].hidden, true);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    button.click();
    assert.equal(chart.data.datasets[0].hidden, false);
    assert.equal(chart.data.datasets[1].hidden, false);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(toggles, [['purchases', false], ['purchases', true]]);
    assert.equal(chart.updateCalls.length, 2);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('creates a safe semantic table covering every current and previous value', () => {
  const descriptor = timeSeriesDescriptor({
    title: '<img onerror=alert(1)>',
    series: [{
      ...timeSeriesDescriptor().series[0],
      label: '<img onerror=alert(1)>',
      sourceLabel: '<img onerror=alert(1)>',
      definition: definition('<img onerror=alert(1)>'),
    }],
  });
  const host = createHost();
  mountTimeSeriesChart(host, descriptor, FakeChart);
  const details = host.querySelector('details');
  const table = details.querySelector('table');

  assert.equal(details.querySelector('summary').textContent, 'Таблица данных');
  assert.equal(table.querySelectorAll('thead').length, 1);
  assert.equal(table.querySelectorAll('tbody').length, 1);
  assert.equal(table.querySelectorAll('tbody')[0].querySelectorAll('tr').length, 3);
  assert.match(table.textContent, /2026-07-12/);
  assert.match(table.textContent, /2026-07-09/);
  assert.match(table.textContent, /—/);
  assert.match(table.textContent, /<img onerror=alert\(1\)>/);
  assert.equal(host.querySelectorAll('img').length, 0);
});

test('destroys all charts and replaces prior mounts by id or host without listeners leaking', () => {
  const firstHost = createHost();
  const first = mountTimeSeriesChart(firstHost, timeSeriesDescriptor(), FakeChart);
  const firstCanvas = firstHost.querySelector('canvas');
  assert.equal(firstCanvas.listeners.get('keydown').size, 1);

  const sameId = mountTimeSeriesChart(createHost(), timeSeriesDescriptor(), FakeChart);
  assert.equal(first.chart.destroyCalls, 1);
  assert.equal(firstCanvas.listeners.get('keydown').size, 0);
  assert.equal(firstHost.children.length, 0);

  const sameHost = createHost();
  const replacedByHost = mountBarChart(sameHost, barDescriptor(), FakeChart);
  const oldBarCanvas = sameHost.querySelector('canvas');
  const replacement = mountTimeSeriesChart(
    sameHost,
    timeSeriesDescriptor({ id: 'replacement-chart' }),
    FakeChart,
  );
  assert.equal(replacedByHost.chart.destroyCalls, 1);
  assert.equal(oldBarCanvas.listeners.get('keydown').size, 0);
  assert.equal(sameHost.querySelectorAll('canvas').length, 1);

  assert.equal(destroyAdminCharts(), 2);
  assert.equal(sameId.chart.destroyCalls, 1);
  assert.equal(replacement.chart.destroyCalls, 1);
  assert.equal(destroyAdminCharts(), 0);
  assert.equal(resetAdminChartZoom(), 0);
});

test('mounts horizontal bars with keyboard inspection, null preservation and a table', () => {
  const host = createHost();
  const handle = mountBarChart(host, barDescriptor(), FakeChart);
  const canvas = host.querySelector('canvas');
  const live = host.querySelector('[data-chart-live]');

  assert.equal(handle.chart.config.type, 'bar');
  assert.equal(handle.chart.options.indexAxis, 'y');
  assert.equal(handle.chart.options.responsive, true);
  assert.equal(handle.chart.options.maintainAspectRatio, false);
  assert.deepEqual(handle.chart.data.labels, ['Месячный', 'Годовой']);
  assert.deepEqual(handle.chart.data.datasets[0].data, [7, null]);
  assert.equal(handle.chart.data.datasets[0].metricId, 'paywall-plans');
  assert.equal(handle.chart.options.scales.x.beginAtZero, true);
  assert.equal(handle.chart.options.scales.x.min, 0);
  assert.equal(handle.chart.options.scales.x.max, 7);
  assert.equal(canvas.getAttribute('role'), 'img');
  assert.equal(canvas.getAttribute('aria-label'), 'График покупок по тарифам');

  const expected = 'Месячный: 7 шт. · Источник: RevenueCat · Определение: Активные подписки';
  assert.equal(formatInspectionText(barDescriptor(), {
    kind: 'bar', row: barDescriptor().rows[0], unit: 'count',
  }), expected);
  const tooltipCallbacks = handle.chart.options.plugins.tooltip.callbacks;
  const tooltipItems = [{ dataset: handle.chart.data.datasets[0], dataIndex: 0 }];
  const tooltip = tooltipCallbacks.afterBody(tooltipItems);
  assert.deepEqual(tooltipCallbacks.title(tooltipItems), []);
  assert.deepEqual(tooltipCallbacks.label(tooltipItems[0]), []);
  assert.equal(tooltip, expected);
  canvas.dispatchEvent(keyEvent('ArrowDown'));
  assert.deepEqual(handle.chart.activeElements, [{ datasetIndex: 0, index: 1 }]);
  assert.equal(live.textContent, 'Годовой: — · Источник: revenuecat · Определение: Активные подписки');
  canvas.dispatchEvent(keyEvent('ArrowUp'));
  assert.deepEqual(handle.chart.activeElements, [{ datasetIndex: 0, index: 0 }]);

  const details = host.querySelector('details');
  assert.equal(details.querySelector('summary').textContent, 'Таблица данных');
  assert.equal(details.querySelector('tbody').querySelectorAll('tr').length, 2);
  assert.match(details.textContent, /Месячный/);
  assert.match(details.textContent, /7 шт\./);
  assert.match(details.textContent, /Годовой/);
  assert.match(details.textContent, /—/);
  assert.match(details.textContent, /RevenueCat/);
  assert.match(details.textContent, /Активные подписки/);
});

test('bar visibility keeps data, keyboard, tooltip and live inspection in sync', () => {
  const host = createHost();
  const descriptor = barDescriptor({
    id: 'bar-visibility',
    rows: [
      { ...barDescriptor().rows[0], id: 'a', label: 'A', value: 7 },
      { ...barDescriptor().rows[1], id: 'b', label: 'B', value: null },
    ],
  });
  const { chart } = mountBarChart(host, descriptor, FakeChart);
  const [buttonA, buttonB] = host.querySelectorAll('button');
  const canvas = host.querySelector('canvas');
  const live = host.querySelector('[data-chart-live]');
  const callbacks = chart.options.plugins.tooltip.callbacks;
  const staleAItem = [{ dataset: chart.data.datasets[0], dataIndex: 0 }];

  buttonA.click();
  assert.deepEqual(chart.data.datasets[0].data, [null, null]);
  assert.deepEqual(chart.activeElements, [{ datasetIndex: 0, index: 1 }]);
  assert.equal(live.textContent, 'B: — · Источник: revenuecat · Определение: Активные подписки');
  assert.equal(callbacks.afterBody(staleAItem), live.textContent);
  canvas.dispatchEvent(keyEvent('ArrowDown'));
  assert.deepEqual(chart.activeElements, [{ datasetIndex: 0, index: 1 }]);

  buttonB.click();
  assert.deepEqual(chart.activeElements, []);
  assert.deepEqual(chart.tooltipActiveElements, []);
  assert.equal(live.textContent, 'Нет видимых категорий данных.');
  assert.equal(callbacks.afterBody(staleAItem), 'Нет видимых категорий данных.');

  buttonA.click();
  assert.deepEqual(chart.data.datasets[0].data, [7, null]);
  assert.deepEqual(chart.activeElements, [{ datasetIndex: 0, index: 0 }]);
  assert.equal(live.textContent, 'A: 7 шт. · Источник: RevenueCat · Определение: Активные подписки');
  assert.equal(callbacks.afterBody([{ dataset: chart.data.datasets[0], dataIndex: 1 }]), live.textContent);
  assert.equal(buttonA.getAttribute('aria-pressed'), 'true');
  assert.equal(buttonB.getAttribute('aria-pressed'), 'false');
});

test('formats line and bar axis ticks with count, ratio and USD units', () => {
  const base = timeSeriesDescriptor().series[0];
  const ratioLine = mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'ratio-line',
    series: [{
      ...base,
      unit: 'ratio',
      points: base.points.map((point, index) => ({ ...point, value: [0.25, null, 0.5][index] })),
      previousPoints: base.previousPoints.map((point, index) => ({ ...point, value: [0.1, 0.2, 0.3][index] })),
    }],
  }), FakeChart);
  const ratioBar = mountBarChart(createHost(), barDescriptor({
    id: 'ratio-bar',
    unit: 'ratio',
    rows: barDescriptor().rows.map((row, index) => ({ ...row, value: index ? null : 0.25 })),
  }), FakeChart);
  const usdLine = mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'usd-line',
    series: [{
      ...base,
      unit: 'usd_micros',
      points: base.points.map((point, index) => ({ ...point, value: index ? null : 1_500_000 })),
      previousPoints: base.previousPoints.map((point) => ({ ...point, value: 1_000_000 })),
    }],
  }), FakeChart);
  const usdBar = mountBarChart(createHost(), barDescriptor({
    id: 'usd-bar',
    unit: 'usd_micros',
    rows: barDescriptor().rows.map((row, index) => ({ ...row, value: index ? null : 1_500_000 })),
  }), FakeChart);
  const countLine = mountTimeSeriesChart(createHost(), timeSeriesDescriptor({ id: 'count-line' }), FakeChart);

  assert.equal(ratioLine.chart.options.scales.y.ticks.callback(0.25), '25 %');
  assert.equal(ratioBar.chart.options.scales.x.ticks.callback(0.25), '25 %');
  assert.equal(usdLine.chart.options.scales.y.ticks.callback(1_500_000), '1,50 $');
  assert.equal(usdBar.chart.options.scales.x.ticks.callback(1_500_000), '1,50 $');
  assert.equal(countLine.chart.options.scales.y.ticks.callback(1200), '1 200 шт.');
  assert.equal(ratioLine.chart.options.scales.y.ticks.callback('not-a-number'), '—');
  assert.doesNotMatch(usdBar.chart.options.scales.x.ticks.callback(1_500_000), /1500000/);
});

test('destroys id and host conflicts before constructing replacement charts', () => {
  const sameHost = createHost();
  const first = mountTimeSeriesChart(sameHost, timeSeriesDescriptor({ id: 'destroy-order-a' }), FakeChart);
  const firstCanvas = sameHost.querySelector('canvas');
  class SameHostReplacementChart extends FakeChart {
    constructor(canvas, config) {
      assert.equal(first.chart.destroyCalls, 1);
      assert.equal(firstCanvas.listeners.get('keydown').size, 0);
      assert.equal(sameHost.querySelectorAll('canvas').length, 1);
      super(canvas, config);
    }
  }
  const replacement = mountBarChart(
    sameHost,
    barDescriptor({ id: 'destroy-order-b' }),
    SameHostReplacementChart,
  );

  const secondCanvas = sameHost.querySelector('canvas');
  const otherHost = createHost();
  class SameIdReplacementChart extends FakeChart {
    constructor(canvas, config) {
      assert.equal(replacement.chart.destroyCalls, 1);
      assert.equal(secondCanvas.listeners.get('keydown').size, 0);
      assert.equal(sameHost.children.length, 0);
      assert.equal(otherHost.querySelectorAll('canvas').length, 1);
      super(canvas, config);
    }
  }
  const final = mountTimeSeriesChart(
    otherHost,
    timeSeriesDescriptor({ id: 'destroy-order-b' }),
    SameIdReplacementChart,
  );
  assert.equal(destroyAdminChart(otherHost), true);
  assert.equal(final.chart.destroyCalls, 1);
  assert.equal(destroyAdminChart('destroy-order-b'), false);
});

test('validates period cadence and safe colors without inventing unavailable comparison dates', () => {
  const base = timeSeriesDescriptor().series[0];
  const noPrevious = timeSeriesDescriptor({
    id: 'no-previous',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-14', value: 2 }],
      previousPoints: null,
    }],
  });
  const noPreviousText = formatInspectionText(noPrevious, {
    kind: 'time-series', metricId: 'purchases', bucketIndex: 0,
  });
  assert.match(noPreviousText, /Предыдущий период: данные недоступны \(—\)/);
  assert.doesNotMatch(noPreviousText, /13 июля/);

  const validWeekly = timeSeriesDescriptor({
    id: 'valid-weekly-window',
    granularity: 'week',
    series: [{
      ...base,
      color: '#0F7',
      points: [
        { bucketStart: '2026-07-06', value: 1 },
        { bucketStart: '2026-07-13', value: 2 },
      ],
      previousPoints: [
        { bucketStart: '2026-06-22', value: 3 },
        { bucketStart: '2026-06-29', value: 4 },
      ],
    }],
  });
  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), validWeekly, FakeChart));

  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'invalid-weekly-start',
    granularity: 'week',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-07', value: 1 }],
      previousPoints: [{ bucketStart: '2026-06-30', value: 2 }],
    }],
  }), FakeChart), /Monday|понедельник|week/i);
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'invalid-day-cadence',
    series: [{
      ...base,
      points: [
        { bucketStart: '2026-07-12', value: 1 },
        { bucketStart: '2026-07-14', value: 2 },
      ],
      previousPoints: [
        { bucketStart: '2026-07-10', value: 3 },
        { bucketStart: '2026-07-11', value: 4 },
      ],
    }],
  }), FakeChart), /cadence|step|day|период/i);
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'invalid-previous-window',
    granularity: 'week',
    series: [{
      ...base,
      points: [
        { bucketStart: '2026-07-06', value: 1 },
        { bucketStart: '2026-07-13', value: 2 },
      ],
      previousPoints: [
        { bucketStart: '2026-07-13', value: 3 },
        { bucketStart: '2026-07-20', value: 4 },
      ],
    }],
  }), FakeChart), /previous|offset|window|период/i);
  for (const color of ['transparent', 'red', '#12345678']) {
    assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
      id: `invalid-color-${color.length}`,
      series: [{ ...base, color }],
    }), FakeChart), /color/i);
  }
});

test('accepts backend-shaped weekly windows and preserves every unequal bucket', () => {
  const base = timeSeriesDescriptor().series[0];
  const backendWindows = [
    {
      id: 'preset-7',
      current: ['2026-07-06', '2026-07-13'],
      previous: ['2026-06-29', '2026-07-06'],
    },
    {
      id: 'preset-28',
      current: ['2026-06-15', '2026-06-22', '2026-06-29', '2026-07-06', '2026-07-13'],
      previous: ['2026-05-18', '2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15'],
    },
    {
      id: 'preset-90',
      current: [
        '2026-04-13', '2026-04-20', '2026-04-27', '2026-05-04', '2026-05-11',
        '2026-05-18', '2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15',
        '2026-06-22', '2026-06-29', '2026-07-06', '2026-07-13',
      ],
      previous: [
        '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02', '2026-02-09',
        '2026-02-16', '2026-02-23', '2026-03-02', '2026-03-09', '2026-03-16',
        '2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13',
      ],
    },
    {
      id: 'custom-13',
      current: ['2026-06-29', '2026-07-06', '2026-07-13'],
      previous: ['2026-06-15', '2026-06-22', '2026-06-29'],
    },
  ];

  for (const fixture of backendWindows) {
    const descriptor = timeSeriesDescriptor({
      id: `backend-${fixture.id}`,
      granularity: 'week',
      series: [{
        ...base,
        points: fixture.current.map((bucketStart, index) => ({ bucketStart, value: index + 1 })),
        previousPoints: fixture.previous.map((bucketStart, index) => ({ bucketStart, value: index + 101 })),
      }],
    });
    assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), descriptor, FakeChart), fixture.id);
  }

  const missingPreviousHost = createHost();
  const missingPrevious = timeSeriesDescriptor({
    id: 'backend-current-has-extra-week',
    granularity: 'week',
    series: [{
      ...base,
      points: [
        { bucketStart: '2026-07-06', value: 1 },
        { bucketStart: '2026-07-13', value: 2 },
      ],
      previousPoints: [{ bucketStart: '2026-07-06', value: 11 }],
    }],
  });
  const missingPreviousMount = mountTimeSeriesChart(missingPreviousHost, missingPrevious, FakeChart);
  assert.deepEqual(missingPreviousMount.chart.data.datasets[1].data, [11, null]);
  const missingPreviousText = formatInspectionText(missingPrevious, {
    kind: 'time-series', metricId: 'purchases', bucketIndex: 1,
  });
  assert.match(missingPreviousText, /данные недоступны \(—\)/i);
  assert.doesNotMatch(missingPreviousText, /6 июля 2026/);

  const extraPreviousHost = createHost();
  const extraPrevious = timeSeriesDescriptor({
    id: 'backend-previous-has-extra-week',
    granularity: 'week',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-06-29', value: 1 }],
      previousPoints: [
        { bucketStart: '2026-06-22', value: 11 },
        { bucketStart: '2026-06-29', value: 12 },
      ],
    }],
  });
  const extraPreviousMount = mountTimeSeriesChart(extraPreviousHost, extraPrevious, FakeChart);
  assert.deepEqual(extraPreviousMount.chart.data.datasets[1].data, [11]);
  const rows = extraPreviousHost.querySelector('tbody').querySelectorAll('tr');
  assert.equal(rows.length, 2);
  assert.match(rows[0].textContent, /2026-06-22/);
  assert.match(rows[0].textContent, /11/);
  assert.match(rows[0].textContent, /RevenueCat/);
  assert.match(rows[1].textContent, /2026-06-29/);
  assert.match(rows[1].textContent, /12/);
  assert.match(rows[1].textContent, /RevenueCat/);
  assert.equal(rows[1].children[0].textContent, '—');

  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'invalid-unequal-daily-window',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-14', value: 1 }],
      previousPoints: [
        { bucketStart: '2026-07-12', value: 2 },
        { bucketStart: '2026-07-13', value: 3 },
      ],
    }],
  }), FakeChart), /previous|align|length|период/i);
});

test('accepts all backend weekly buckets for adjacent equal-day raw windows', () => {
  const base = timeSeriesDescriptor().series[0];
  const host = createHost();
  const toIso = (date) => date.toISOString().slice(0, 10);
  const addDays = (iso, days) => {
    const date = new Date(`${iso}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return toIso(date);
  };
  const backendWeeklyBuckets = (from, to) => {
    const first = new Date(`${from}T00:00:00.000Z`);
    first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
    const buckets = [];
    for (let cursor = toIso(first); cursor <= to; cursor = addDays(cursor, 7)) {
      buckets.push(cursor);
    }
    return buckets;
  };

  let checked = 0;
  for (let startWeekday = 0; startWeekday < 7; startWeekday += 1) {
    for (let lengthDays = 1; lengthDays <= 90; lengthDays += 1) {
      const currentFrom = addDays('2026-01-05', startWeekday);
      const currentTo = addDays(currentFrom, lengthDays - 1);
      const previousTo = addDays(currentFrom, -1);
      const previousFrom = addDays(previousTo, -lengthDays + 1);
      const currentBuckets = backendWeeklyBuckets(currentFrom, currentTo);
      const previousBuckets = backendWeeklyBuckets(previousFrom, previousTo);
      const descriptor = timeSeriesDescriptor({
        id: 'backend-weekly-property',
        granularity: 'week',
        series: [{
          ...base,
          points: currentBuckets.map((bucketStart, index) => ({ bucketStart, value: index + 1 })),
          previousPoints: previousBuckets.map((bucketStart, index) => ({ bucketStart, value: index + 101 })),
        }],
      });
      assert.doesNotThrow(
        () => mountTimeSeriesChart(host, descriptor, FakeChart),
        `startWeekday=${startWeekday}, lengthDays=${lengthDays}`,
      );
      checked += 1;
    }
  }
  assert.equal(checked, 630);
});

test('requires weekly comparison buckets to touch the adjacent raw-window boundary', () => {
  const base = timeSeriesDescriptor().series[0];
  const mondayStartAdjacent = timeSeriesDescriptor({
    id: 'weekly-monday-start-adjacent',
    granularity: 'week',
    series: [{
      ...base,
      points: [
        { bucketStart: '2026-07-06', value: 1 },
        { bucketStart: '2026-07-13', value: 2 },
      ],
      previousPoints: [
        { bucketStart: '2026-06-22', value: 3 },
        { bucketStart: '2026-06-29', value: 4 },
      ],
    }],
  });
  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), mondayStartAdjacent, FakeChart));

  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-far-past-window',
    granularity: 'week',
    series: [{
      ...base,
      points: [
        { bucketStart: '2026-07-06', value: 1 },
        { bucketStart: '2026-07-13', value: 2 },
      ],
      previousPoints: [
        { bucketStart: '2020-01-06', value: 3 },
        { bucketStart: '2020-01-13', value: 4 },
      ],
    }],
  }), FakeChart), /previous|boundary|adjacent|window|период/i);
});

test('rejects impossible weekly bucket-count skew despite an adjacent last bucket', () => {
  const base = timeSeriesDescriptor().series[0];
  const longPrevious = pointRange('2020-01-06', 341, 7, 100);
  assert.equal(longPrevious.at(-1).bucketStart, '2026-07-13');
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-malicious-count-skew',
    granularity: 'week',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-13', value: 1 }],
      previousPoints: longPrevious,
    }],
  }), FakeChart), /range|length|count|bucket|points|90|14/i);
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-bounded-count-skew',
    granularity: 'week',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-13', value: 1 }],
      previousPoints: pointRange('2026-06-29', 3, 7, 100),
    }],
  }), FakeChart), /differ|length|count|bucket/i);
});

test('rejects equally long weekly rows beyond the 90-day backend range', () => {
  const base = timeSeriesDescriptor().series[0];
  const current = pointRange('2026-04-06', 15, 7);
  const previous = pointRange('2025-12-29', 15, 7, 100);
  assert.equal(current.at(-1).bucketStart, '2026-07-13');
  assert.equal(previous.at(-1).bucketStart, current[0].bucketStart);
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-over-backend-range',
    granularity: 'week',
    series: [{ ...base, points: current, previousPoints: previous }],
  }), FakeChart), /range|length|count|bucket|points|90|14/i);
});

test('keeps empty daily series valid but rejects a 91-day backend window', () => {
  const base = timeSeriesDescriptor().series[0];
  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'empty-daily-window',
    series: [{ ...base, points: [], previousPoints: [] }],
  }), FakeChart));
  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'empty-weekly-window',
    granularity: 'week',
    series: [{ ...base, points: [], previousPoints: [] }],
  }), FakeChart));
  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'daily-maximum-backend-range',
    series: [{
      ...base,
      points: pointRange('2026-04-16', 90),
      previousPoints: pointRange('2026-01-16', 90, 1, 100),
    }],
  }), FakeChart));

  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'daily-over-backend-range',
    series: [{
      ...base,
      points: pointRange('2026-04-15', 91),
      previousPoints: pointRange('2026-01-14', 91, 1, 100),
    }],
  }), FakeChart), /range|length|count|bucket|points|90/i);
});

test('rejects a weekly comparison with only previous buckets', () => {
  const base = timeSeriesDescriptor().series[0];
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-only-previous-buckets',
    granularity: 'week',
    series: [{
      ...base,
      points: [],
      previousPoints: [{ bucketStart: '2026-07-06', value: 1 }],
    }],
  }), FakeChart), /empty|both|current|previous|bucket|period/i);
});

test('rejects a weekly comparison with only current buckets', () => {
  const base = timeSeriesDescriptor().series[0];
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'weekly-only-current-buckets',
    granularity: 'week',
    series: [{
      ...base,
      points: [{ bucketStart: '2026-07-13', value: 1 }],
      previousPoints: [],
    }],
  }), FakeChart), /empty|both|current|previous|bucket|period/i);
});

test('requires every metric to share the same previous bucket shape', () => {
  const base = timeSeriesDescriptor().series[0];
  const current = [
    { bucketStart: '2026-07-06', value: 1 },
    { bucketStart: '2026-07-13', value: 2 },
  ];
  const previousA = [
    { bucketStart: '2026-06-22', value: 3 },
    { bucketStart: '2026-06-29', value: 4 },
  ];
  const previousB = [
    { bucketStart: '2026-06-29', value: 5 },
    { bucketStart: '2026-07-06', value: 6 },
  ];
  const metricA = { ...base, metricId: 'metric-a', label: 'Metric A', points: current, previousPoints: previousA };
  const metricB = { ...base, metricId: 'metric-b', label: 'Metric B', points: current, previousPoints: previousA };

  assert.doesNotThrow(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'aligned-metric-previous-buckets',
    granularity: 'week',
    series: [metricA, metricB],
  }), FakeChart));
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'misaligned-metric-previous-buckets',
    granularity: 'week',
    series: [metricA, { ...metricB, previousPoints: previousB }],
  }), FakeChart), /previous|align|shape|bucket|series/i);
  assert.throws(() => mountTimeSeriesChart(createHost(), timeSeriesDescriptor({
    id: 'mixed-null-metric-previous-buckets',
    granularity: 'week',
    series: [{ ...metricA, previousPoints: null }, metricB],
  }), FakeChart), /previous|align|shape|null|series/i);
});

test('gives chart tables captions, row headers and grouped legends', () => {
  const lineHost = createHost();
  const barHost = createHost();
  mountTimeSeriesChart(lineHost, timeSeriesDescriptor(), FakeChart);
  mountBarChart(barHost, barDescriptor(), FakeChart);

  assert.equal(lineHost.querySelector('[data-chart-legend]').getAttribute('role'), 'group');
  assert.equal(barHost.querySelector('[data-chart-legend]').getAttribute('role'), 'group');
  assert.equal(lineHost.querySelector('caption').textContent, 'Покупки по дням');
  assert.equal(barHost.querySelector('caption').textContent, 'Покупки по тарифам');
  assert.equal(lineHost.querySelectorAll('[scope="row"]').length, 3);
  assert.equal(barHost.querySelectorAll('[scope="row"]').length, 2);
  assert.equal(lineHost.querySelector('[scope="row"]').tagName, 'TH');
  assert.equal(barHost.querySelector('[scope="row"]').tagName, 'TH');
});

test('gives line and bar legend buttons focus-visible tooltip text', () => {
  const lineHost = createHost();
  const barHost = createHost();
  mountTimeSeriesChart(lineHost, timeSeriesDescriptor(), FakeChart);
  mountBarChart(barHost, barDescriptor(), FakeChart);
  const lineButton = lineHost.querySelector('button');
  const barButton = barHost.querySelector('button');

  assert.equal(
    lineButton.getAttribute('data-tooltip'),
    'Показать или скрыть ряд «Покупки»',
  );
  assert.equal(
    barButton.getAttribute('data-tooltip'),
    'Показать или скрыть категорию «Месячный»',
  );
  assert.equal(lineButton.getAttribute('data-tooltip'), lineButton.getAttribute('title'));
  assert.equal(barButton.getAttribute('data-tooltip'), barButton.getAttribute('title'));
});

test('uses three restrained default semantic colors instead of a rainbow', () => {
  const base = timeSeriesDescriptor().series[0];
  const descriptor = timeSeriesDescriptor({
    series: [
      { ...base, color: undefined },
      { ...base, metricId: 'trials', label: 'Пробные периоды', color: undefined },
      { ...base, metricId: 'renewals', label: 'Продления', color: undefined },
      { ...base, metricId: 'refunds', label: 'Возвраты', color: undefined },
    ],
  });
  const { chart } = mountTimeSeriesChart(createHost(), descriptor, FakeChart);
  const colors = chart.data.datasets.filter((dataset) => dataset.period === 'current')
    .map((dataset) => dataset.borderColor);
  assert.deepEqual(colors.slice(0, 3), ['#2563EB', '#7C3AED', '#0F766E']);
  assert.equal(colors[3], colors[0]);
});

test('smoke requires chart modules, Firestore-guards them and does not demand direct script tags', () => {
  const source = fs.readFileSync(
    new URL('../scripts/admin-v2-smoke.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /admin\/v2\/scripts\/components\/admin-time-series-chart\.js/);
  assert.match(source, /admin\/v2\/scripts\/components\/admin-bar-chart\.js/);
  assert.match(source, /directScriptFiles|classicScriptFiles/);
  assert.match(source, /analyticsModuleFiles/);
  assert.match(source, /components\/admin-(?:time-series-chart|bar-chart)/);
  const directFilesBlock = /const directScriptFiles = \[([\s\S]*?)\];/.exec(source)?.[1] ?? '';
  assert.doesNotMatch(directFilesBlock, /admin-time-series-chart|admin-bar-chart/);
});

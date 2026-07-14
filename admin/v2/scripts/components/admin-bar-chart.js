import {
  ADMIN_CHART_COLORS,
  adminChartAnimation,
  adminChartValueScale,
  assertAdminChartFactory,
  assertAdminChartHost,
  assertId,
  assertPlainArray,
  assertPlainRecord,
  assertString,
  assertValue,
  createAdminChartScaffold,
  createAdminChartTable,
  destroyAdminChartConflicts,
  formatAdminChartTick,
  formatAdminChartValue,
  formatAdminMetricDefinition,
  formatInspectionText,
  normalizeDefinition,
  registerAdminChart,
} from './admin-time-series-chart.js';

export {
  destroyAdminChart,
  destroyAdminCharts,
  formatInspectionText,
  resetAdminChartZoom,
} from './admin-time-series-chart.js';

const BAR_UNITS = new Set(['count', 'ratio', 'usd_micros']);
const MAX_BAR_ROWS = 200;

/**
 * @typedef {'count'|'ratio'|'usd_micros'} AdminBarChartUnit
 * @typedef {{description:string,numerator?:string,denominator?:string}} AdminBarDefinition
 * @typedef {Object} AdminBarRow
 * @property {string} id
 * @property {string} label
 * @property {number|null} value
 * @property {string} source
 * @property {string=} sourceLabel
 * @property {string|AdminBarDefinition} definition
 * @typedef {Object} AdminBarChartDescriptor
 * @property {string} id
 * @property {string} title
 * @property {string} ariaLabel
 * @property {AdminBarChartUnit} unit
 * @property {AdminBarRow[]} rows
 * @property {(metricId:string, visible:boolean)=>void=} onToggleSeries
 */

function normalizeBarDefinition(value, label) {
  if (typeof value === 'string') {
    return { description: assertString(value, label, 600) };
  }
  return normalizeDefinition(value, label);
}

/** @param {AdminBarChartDescriptor} descriptor */
export function validateBarChartDescriptor(descriptor) {
  assertPlainRecord(descriptor, 'descriptor', [
    'id', 'title', 'ariaLabel', 'unit', 'rows', 'onToggleSeries',
  ]);
  if (!BAR_UNITS.has(descriptor.unit)) throw new TypeError('descriptor.unit: unsupported unit');
  if (descriptor.onToggleSeries !== undefined && typeof descriptor.onToggleSeries !== 'function') {
    throw new TypeError('descriptor.onToggleSeries: expected a function');
  }
  assertPlainArray(descriptor.rows, 'descriptor.rows', MAX_BAR_ROWS, 1);
  const rowIds = new Set();
  const rows = descriptor.rows.map((rawRow, index) => {
    const label = `descriptor.rows[${index}]`;
    assertPlainRecord(rawRow, label, [
      'id', 'label', 'value', 'source', 'sourceLabel', 'definition',
    ]);
    const id = assertId(rawRow.id, `${label}.id`);
    if (rowIds.has(id)) throw new TypeError(`${label}.id: duplicate row id`);
    rowIds.add(id);
    return {
      id,
      label: assertString(rawRow.label, `${label}.label`, 180),
      value: assertValue(rawRow.value, `${label}.value`),
      source: assertString(rawRow.source, `${label}.source`, 180),
      sourceLabel: assertString(rawRow.sourceLabel, `${label}.sourceLabel`, 180, { optional: true }),
      definition: normalizeBarDefinition(rawRow.definition, `${label}.definition`),
    };
  });
  return {
    id: assertId(descriptor.id, 'descriptor.id'),
    title: assertString(descriptor.title, 'descriptor.title', 180),
    ariaLabel: assertString(descriptor.ariaLabel, 'descriptor.ariaLabel', 180),
    unit: descriptor.unit,
    rows,
    onToggleSeries: descriptor.onToggleSeries,
  };
}

function buildBarTable(descriptor, document) {
  return createAdminChartTable(document, descriptor.title, [
    'Категория', 'Значение', 'Источник', 'Определение',
  ], descriptor.rows.map((row) => [
    row.label,
    formatAdminChartValue(row.value, descriptor.unit),
    row.sourceLabel || row.source,
    formatAdminMetricDefinition(row.definition),
  ]));
}

/**
 * @param {Element} host
 * @param {AdminBarChartDescriptor} descriptor
 * @param {Function} chartFactory
 * @returns {{chart:object,destroy:()=>boolean,resetZoom:()=>boolean}}
 */
export function mountBarChart(host, descriptor, chartFactory = globalThis.Chart) {
  assertAdminChartHost(host);
  assertAdminChartFactory(chartFactory);
  const normalized = validateBarChartDescriptor(descriptor);
  destroyAdminChartConflicts(normalized.id, host);
  const scaffold = createAdminChartScaffold(host, normalized);
  scaffold.legend.setAttribute('role', 'group');
  scaffold.legend.setAttribute('aria-label', 'Категории данных');
  scaffold.summary.remove();
  scaffold.root.appendChild(buildBarTable(normalized, host.ownerDocument));
  const originalValues = normalized.rows.map((row) => row.value);
  const visibleRowIds = new Set(normalized.rows.map((row) => row.id));
  const visibleIndexes = () => normalized.rows
    .map((row, index) => (visibleRowIds.has(row.id) ? index : -1))
    .filter((index) => index >= 0);
  const nearestVisibleIndex = (requestedIndex) => {
    const indexes = visibleIndexes();
    if (!indexes.length) return -1;
    return indexes.reduce((nearest, index) => {
      const distance = Math.abs(index - requestedIndex);
      const nearestDistance = Math.abs(nearest - requestedIndex);
      return distance < nearestDistance || (distance === nearestDistance && index < nearest)
        ? index
        : nearest;
    }, indexes[0]);
  };
  const formatVisibleRow = (requestedIndex) => {
    const index = nearestVisibleIndex(requestedIndex);
    if (index < 0) return 'Нет видимых категорий данных.';
    return formatInspectionText(normalized, {
      kind: 'bar', row: normalized.rows[index], unit: normalized.unit,
    });
  };
  const config = {
    type: 'bar',
    data: {
      labels: normalized.rows.map((row) => row.label),
      datasets: [{
        label: normalized.title,
        metricId: normalized.id,
        period: 'current',
        data: [...originalValues],
        backgroundColor: normalized.rows.map((_, index) => (
          ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]
        )),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: adminChartAnimation(),
      scales: {
        x: {
          ...adminChartValueScale(originalValues),
          ticks: { callback: (value) => formatAdminChartTick(value, normalized.unit) },
        },
        y: { type: 'category' },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: () => [],
            label: () => [],
            afterBody: (items) => {
              const first = items.find((item) => (
                Number.isInteger(item.dataIndex)
                && item.dataIndex >= 0
                && item.dataIndex < normalized.rows.length
              ));
              if (!first) return '';
              return formatVisibleRow(first.dataIndex);
            },
          },
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
  let activeRow = 0;
  const inspect = (requestedIndex = activeRow) => {
    const resolvedIndex = nearestVisibleIndex(requestedIndex);
    if (resolvedIndex < 0) {
      if (typeof chart.setActiveElements === 'function') chart.setActiveElements([]);
      if (typeof chart.tooltip?.setActiveElements === 'function') {
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
      }
      scaffold.live.textContent = normalized.rows.length
        ? 'Нет видимых категорий данных.'
        : 'Нет данных для выбранного периода.';
      return;
    }
    activeRow = resolvedIndex;
    const elements = [{ datasetIndex: 0, index: activeRow }];
    if (typeof chart.setActiveElements === 'function') chart.setActiveElements(elements);
    if (typeof chart.tooltip?.setActiveElements === 'function') {
      chart.tooltip.setActiveElements(elements, { x: 0, y: 0 });
    }
    scaffold.live.textContent = formatInspectionText(normalized, {
      kind: 'bar', row: normalized.rows[activeRow], unit: normalized.unit,
    });
  };
  const onKeyDown = (event) => {
    const movesBackward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    const movesForward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    if (!movesBackward && !movesForward) return;
    event.preventDefault();
    const indexes = visibleIndexes();
    if (!indexes.length) {
      inspect();
      return;
    }
    const resolved = nearestVisibleIndex(activeRow);
    const position = Math.max(0, indexes.indexOf(resolved));
    const nextPosition = movesForward
      ? Math.min(indexes.length - 1, position + 1)
      : Math.max(0, position - 1);
    activeRow = indexes[nextPosition];
    inspect();
    if (typeof chart.update === 'function') chart.update('none');
  };
  scaffold.canvas.addEventListener('keydown', onKeyDown);
  cleanup.push(() => scaffold.canvas.removeEventListener('keydown', onKeyDown));

  normalized.rows.forEach((row, index) => {
    const button = host.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('type', 'button');
    button.className = 'admin-chart__legend-button';
    button.setAttribute('data-metric-id', row.id);
    button.setAttribute('aria-pressed', 'true');
    const tooltipText = `Показать или скрыть категорию «${row.label}»`;
    button.setAttribute('title', tooltipText);
    button.setAttribute('data-tooltip', tooltipText);
    button.textContent = row.label;
    const onClick = () => {
      const visible = !visibleRowIds.has(row.id);
      if (visible) visibleRowIds.add(row.id);
      else visibleRowIds.delete(row.id);
      chart.data.datasets[0].data[index] = visible ? originalValues[index] : null;
      button.setAttribute('aria-pressed', String(visible));
      inspect(activeRow);
      if (typeof chart.update === 'function') chart.update();
      normalized.onToggleSeries?.(row.id, visible);
    };
    button.addEventListener('click', onClick);
    cleanup.push(() => button.removeEventListener('click', onClick));
    scaffold.legend.appendChild(button);
  });
  inspect();
  return registerAdminChart({ id: normalized.id, host, root: scaffold.root, chart, cleanup });
}

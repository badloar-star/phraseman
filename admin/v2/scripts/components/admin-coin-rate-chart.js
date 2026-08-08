import { createAdminChartTable, registerAdminChart } from './admin-time-series-chart.js';

// Данные серии приходят из callable adminGetCoinExchangeCenter (источник: economy_exchange_history).
// Точка: { date: 'YYYY-MM-DD', rate: number, volumeCoins: number, volumeStars: number, source: 'auto'|'manual' }.
const RATE_COLOR = '#2563EB';
const MANUAL_COLOR = '#D97706';
const VOLUME_COLOR = 'rgba(15, 118, 110, 0.35)';
const CHART_ID = 'coin-rate-history';

const ruNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const ruTooltipDate = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

function normalizeSpaces(value) {
  return String(value).replace(/[  ]/g, ' ');
}

function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? normalizeSpaces(ruNumber.format(value)) : '—';
}

function sourceLabel(source) {
  return source === 'manual' ? 'Ручной курс' : 'Автоматический пересчёт';
}

function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => ({
      date: String(point?.date || ''),
      rate: Number.isFinite(Number(point?.rate)) ? Number(point.rate) : null,
      volumeCoins: Number.isFinite(Number(point?.volumeCoins)) ? Number(point.volumeCoins) : 0,
      volumeStars: Number.isFinite(Number(point?.volumeStars)) ? Number(point.volumeStars) : 0,
      source: String(point?.source) === 'manual' ? 'manual' : 'auto',
    }))
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && point.rate !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Монтирует график истории курса биржи «монеты → звёзды»:
 * линия курса (левая ось), столбцы дневного объёма в монетах (правая ось),
 * ручные переопределения отмечены отдельным маркером.
 * @param {Element|null} host
 * @param {Array} rawPoints
 */
export function mountCoinRateChart(host, rawPoints) {
  if (!host || typeof host.appendChild !== 'function') return null;
  const points = normalizePoints(rawPoints);
  if (!points.length || typeof globalThis.Chart !== 'function') return null;
  const document = host.ownerDocument;

  const root = document.createElement('div');
  root.className = 'admin-chart';
  root.setAttribute('data-admin-chart-id', CHART_ID);
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'История курса обмена монет на звёзды');

  const head = document.createElement('div');
  head.className = 'admin-chart__head';
  const heading = document.createElement('h3');
  heading.className = 'admin-chart__title';
  heading.textContent = 'Динамика курса по дням';
  head.appendChild(heading);

  const legend = document.createElement('div');
  legend.className = 'admin-chart__legend';
  legend.innerHTML = [
    `<span class="hint">— Курс: звёзд за 1 монету</span>`,
    `<span class="hint" style="color:${MANUAL_COLOR}">▲ Ручное переопределение</span>`,
    `<span class="hint" style="color:${RATE_COLOR}">● Автоматический пересчёт</span>`,
    `<span class="hint">▮ Объём обменов в монетах (правая ось)</span>`,
  ].join('');

  const summary = document.createElement('p');
  summary.className = 'admin-chart__summary';
  const manualCount = points.filter((point) => point.source === 'manual').length;
  const first = points[0];
  const last = points[points.length - 1];
  summary.textContent = `Период: ${first.date} — ${last.date}. Курс изменился с ${formatNumber(first.rate)} до ${formatNumber(last.rate)} звёзд. Ручных переопределений: ${manualCount}.`;

  const canvas = document.createElement('canvas');
  canvas.className = 'admin-chart__canvas';
  canvas.id = `${CHART_ID}-canvas`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Линия дневного курса обмена и столбцы дневного объёма обменов. Ниже доступна таблица данных.');

  const table = createAdminChartTable(document, 'История курса обмена монет на звёзды', [
    'Дата', 'Курс (звёзд за монету)', 'Объём, монеты', 'Объём, звёзды', 'Источник курса',
  ], points.map((point) => [
    point.date,
    formatNumber(point.rate),
    formatNumber(point.volumeCoins),
    formatNumber(point.volumeStars),
    sourceLabel(point.source),
  ]));

  root.append(head, legend, summary, canvas, table);
  host.appendChild(root);

  const chart = new globalThis.Chart(canvas, {
    data: {
      labels: points.map((point) => point.date),
      datasets: [
        {
          type: 'line',
          label: 'Курс (звёзд за 1 монету)',
          data: points.map((point) => point.rate),
          borderColor: RATE_COLOR,
          backgroundColor: RATE_COLOR,
          borderWidth: 2,
          tension: 0.28,
          fill: false,
          yAxisID: 'rate',
          pointRadius: points.map((point) => (point.source === 'manual' ? 5 : 2.5)),
          pointHoverRadius: 6,
          pointHitRadius: 12,
          pointStyle: points.map((point) => (point.source === 'manual' ? 'triangle' : 'circle')),
          pointBackgroundColor: points.map((point) => (point.source === 'manual' ? MANUAL_COLOR : RATE_COLOR)),
          pointBorderColor: points.map((point) => (point.source === 'manual' ? MANUAL_COLOR : RATE_COLOR)),
        },
        {
          type: 'bar',
          label: 'Объём обменов, монеты',
          data: points.map((point) => point.volumeCoins),
          backgroundColor: VOLUME_COLOR,
          borderColor: 'rgba(15, 118, 110, 0.6)',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 22,
          yAxisID: 'volume',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
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
        rate: {
          position: 'left',
          beginAtZero: false,
          title: { display: true, text: 'Звёзд за 1 монету', color: '#6B7280', font: { size: 10 } },
          grid: { color: 'rgba(107, 114, 128, 0.16)' },
          ticks: { color: '#6B7280', font: { size: 10 } },
        },
        volume: {
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: 'Монеты обменяно', color: '#6B7280', font: { size: 10 } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#6B7280', font: { size: 10 }, precision: 0 },
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
            title(items) {
              const iso = String(items?.[0]?.label ?? '');
              if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
              return normalizeSpaces(ruTooltipDate.format(new Date(`${iso}T00:00:00.000Z`)));
            },
            label(item) {
              const point = points[item?.dataIndex];
              if (!point) return '';
              if (item?.dataset?.yAxisID === 'volume') {
                return `Объём: ${formatNumber(point.volumeCoins)} монет · ${formatNumber(point.volumeStars)} звёзд`;
              }
              return `Курс: 1 монета = ${formatNumber(point.rate)} звёзд · ${sourceLabel(point.source)}`;
            },
          },
        },
      },
    },
  });

  return registerAdminChart({ id: CHART_ID, host, root, chart });
}

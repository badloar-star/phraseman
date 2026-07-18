import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 trustworthy analytics contract', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const view = read('admin/v2/scripts/admin-analytics-view.js');
  const analyticsState = read('admin/v2/scripts/admin-analytics-state.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const css = read('admin/v2/styles/admin.css');

  test('renders the native analytics snapshot instead of raw JSON or legacy analytics', () => {
    expect(core).toMatch(/import\s*\{[^}]*\brenderAdminAnalytics\b[^}]*\}\s*from '\.\/admin-analytics-view\.js';/);
    expect(core).not.toContain('JSON.stringify(snapshot, null, 2)');
    expect(view).toContain('Активные доступы');
    expect(view).toContain('События магазина');
    expect(view).toContain('Сигналы экрана оплаты');
    expect(view).toContain('Качество источников');
    expect(view).toContain('События, не уникальные пользователи и не деньги');
    expect(view).toContain('Административная выдача');
    expect(view).toContain('Подписки магазина');
    expect(view).not.toContain('>Admin grant<');
    expect(view).not.toContain('../../admin/index.html');
    expect(view).toContain('renderPaywallAnalyticsCategory');
  });

  test('has one primary refresh action, a labeled bounded period and accessible status', () => {
    expect(view.match(/data-action="load-analytics"/g)).toHaveLength(1);
    expect(view).toContain('class="button primary"');
    expect(view).toContain('title="Обновить серверный снимок аналитики, сохраняя последний подтверждённый результат на экране"');
    expect(view).toContain('for="analytics-range"');
    expect(view).toContain('value="7"');
    expect(view).toContain('value="28"');
    expect(view).toContain('value="90"');
    expect(view).toContain('aria-live="polite"');
  });

  test('uses a compact report switcher instead of a long in-page analytics scroll', () => {
    expect(view).toContain('id="analytics-report-select"');
    expect(view).toContain('data-action="select-analytics-report"');
    expect(view).toContain('data-analytics-report-panel');
    expect(view).toContain('Сегодня');
    expect(view).toContain('Рост');
    expect(view).toContain('Деньги');
    expect(view).toContain('Обучение');
    expect(view).toContain('Что показывает:');
    expect(view).toContain('Какое решение принять:');
    expect(view).not.toContain('aria-label="Разделы аналитики"');
    expect(view).not.toContain('href="#product-analytics-panel"');
    expect(core).toContain('activeAnalyticsReport');
    expect(core).toContain('syncAnalyticsReportVisibility');
    expect(core).toContain("state.activeAnalyticsReport === 'product'");
    expect(core).toContain("state.activeAnalyticsReport === 'subscriptions'");
    expect(core).toContain("state.activeAnalyticsReport === 'exports'");
  });

  test('maps every visible analytics deep link to one real decision report', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');

    expect(capabilities).toContain("'today', '/today'");
    expect(capabilities).toContain("'growth', '/growth'");
    expect(capabilities).toContain("'money', '/money'");
    expect(capabilities).toContain("'learning', '/learning'");
    expect(core).toContain("today: 'overview'");
    expect(core).toContain("growth: 'product'");
    expect(core).toContain("money: 'subscriptions'");
    expect(core).toContain("learning: 'exports'");
    expect(core).toContain("['today', 'Сегодня']");
    expect(core).toContain("['growth', 'Рост']");
    expect(core).toContain("['money', 'Деньги']");
    expect(core).toContain("['learning', 'Обучение']");
    expect(view).toContain("reportShell('overview'");
    expect(view).toContain("reportShell('product'");
    expect(view).toContain("reportShell('subscriptions'");
    expect(view).toContain("reportShell('exports'");
    expect(view).not.toContain('старый ZIP');
    expect(view).not.toContain('ZIP-пакет');
    expect(view).not.toContain('новая кнопка сверху скачивает');
  });

  test('exports the current canonical analytics report as PDF and JSON', () => {
    expect(analyticsState).toContain('export function createCanonicalAnalyticsReport');
    expect(analyticsState).toContain('metrics: [');
    expect(analyticsState).toContain('sourceHealth');
    expect(core).toContain('downloadAnalyticsReportBundle');
    expect(core).toContain("action === 'export-analytics-report'");
    const reportExport = read('admin/v2/scripts/admin-report-export.js');
    expect(reportExport).toContain('export function downloadAnalyticsReportBundle');
    expect(reportExport).toContain('application/pdf');
    expect(reportExport).toContain('application/json');
  });

  test('keeps the last good snapshot through loading and error states', () => {
    expect(core).toContain("analytics: { status: 'idle', snapshot: null, error: '' }");
    expect(core).toContain("status: 'loading'");
    expect(core).toContain("status: 'error'");
    expect(core).toContain('snapshot: state.analytics.snapshot');
    expect(core).toContain('completeAnalyticsLoad');
    expect(analyticsState).toContain("snapshot: current.snapshot");
    expect(view).toContain("model.status === 'partial'");
    expect(view).toContain("model.status === 'empty'");
    expect(view).toContain("model.status === 'error'");
    expect(core).toContain('analyticsTrends: createAnalyticsTrendScopesState()');
    expect(core).toContain('snapshot: state.analytics.snapshot');
  });

  test('mirrors the backend money.read permission and existing callable', () => {
    expect(core).toContain("owner: new Set(['users.read', 'money.read'");
    expect(core).toContain("admin: new Set(['users.read', 'money.read'");
    expect(core).toContain("analyst: new Set(['users.read', 'money.read'");
    expect(core).toContain("disabledWhenUnauthorized('money.read')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsTrends')");
    expect(core).toContain("if (!state.authorized || !can('money.read')) state.analytics = { status: 'idle', snapshot: null, error: '' }");
  });

  test('provides responsive stable geometry and correct lime contrast', () => {
    expect(css).toContain('.analytics-summary-grid');
    expect(css).toContain('.analytics-source-grid');
    expect(css).toContain('.analytics-skeleton');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('.button.primary { border-color: #8eaf2f; background: var(--lime); color: var(--lime-ink); }');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('does not use emoji as dashboard icons', () => {
    expect(view).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

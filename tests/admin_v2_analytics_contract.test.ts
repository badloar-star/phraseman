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
    expect(core).toContain("import { renderAdminAnalytics } from './admin-analytics-view.js'");
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
  });

  test('has one primary refresh action, a labeled bounded period and accessible status', () => {
    expect(view.match(/data-action="load-analytics"/g)).toHaveLength(1);
    expect(view).toContain('class="button primary"');
    expect(view).toContain('title="Обновить серверный снимок аналитики"');
    expect(view).toContain('for="analytics-range"');
    expect(view).toContain('value="7"');
    expect(view).toContain('value="28"');
    expect(view).toContain('value="90"');
    expect(view).toContain('aria-live="polite"');
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
  });

  test('mirrors the backend money.read permission and existing callable', () => {
    for (const role of ['owner', 'admin', 'analyst']) {
      expect(core).toMatch(new RegExp(`${role}: new Set\\(\\[[^\\n]*'money\\.read'`));
    }
    expect(core).toContain("disabledWhenUnauthorized('money.read')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetAnalyticsSnapshot')");
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

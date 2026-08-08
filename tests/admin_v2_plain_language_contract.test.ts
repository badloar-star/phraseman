import fs from 'fs';
import path from 'path';
import vm from 'vm';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 plain-language contract', () => {
  it('provides safe Russian labels and focusable explanations', () => {
    const source = read('admin/v2/scripts/components/analytics-language.js');
    const sandbox: any = { window: {} };
    vm.runInNewContext(source, sandbox);
    const language = sandbox.window.AdminAnalyticsLanguage;
    expect(language.label('screen', 'home')).toBe('Главная');
    expect(language.label('context', 'unknown')).toBe('Не определено');
    expect(language.label('action', 'shards_shop:open')).toBe('Открыли магазин осколков');
    expect(language.label('action', 'onboarding_source_select')).toBe('Выбрали источник знакомства с приложением');
    expect(language.label('action', 'paywall:abandoned_push')).toBe('Отправлено напоминание после закрытия экрана оплаты');
    expect(language.label('action', 'unknown_new_event')).toBe('Неизвестное действие');
    const header = language.header('Показы экрана', 'Сколько раз экран был открыт.');
    expect(header).toContain('title="Сколько раз экран был открыт."');
    expect(header).toContain('tabindex="0"');
    expect(header).toContain('aria-label="Показы экрана. Сколько раз экран был открыт."');
    expect(language.header('<script>', '"опасно"')).not.toContain('<script>');
  });

  it('shows event names in Russian and keeps the internal key secondary', () => {
    const source = read('admin/v2/scripts/admin-analytics-view.js');
    expect(source).toContain("language.label('action', key)");
    expect(source).toContain('Технический ключ:');
    expect(source).not.toContain('<td>${escapeHtml(key)}</td>');
  });

  it('loads the shared language helper before every analytics renderer', () => {
    const html = read('admin/v2/index.html');
    expect(html.indexOf('/scripts/components/analytics-language.js')).toBeGreaterThan(-1);
    expect(html.indexOf('/scripts/components/analytics-language.js')).toBeLessThan(html.indexOf('/scripts/pages/product-analytics.js'));
  });

  it('uses human Russian section names and explanations throughout new analytics', () => {
    const files = [
      'admin/v2/scripts/pages/product-analytics.js',
      'admin/v2/scripts/pages/product-sessions.js',
      'admin/v2/scripts/pages/learning-diagnostics.js',
      'admin/v2/scripts/pages/conversion-diagnostics.js',
      'admin/v2/scripts/pages/retention-diagnostics.js',
      'admin/v2/scripts/pages/subscription-analytics.js',
    ];
    const source = files.map(read).join('\n');
    expect(source).toContain('AdminAnalyticsLanguage');
    expect(source).toContain('Показы экрана оплаты');
    expect(source).toContain('Доля данных с детализацией');
    expect(source).toContain('У половины');
    expect(source).toContain('У 90%');
    expect(source).toContain('Установки приложения');
    for (const forbidden of ['Observed sessions', 'Store/package readiness', 'Purchase failure categories', 'No events for this period.']) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toContain('ANALYTICS_BIGQUERY_DATASET');
    expect(source).not.toContain('error?.message');
    expect(source).not.toContain('Где заканчиваются сессии');
  });

  it('uses Russian headings, filters and hover explanations in the shell', () => {
    const html = read('admin/v2/scripts/admin-core.js');
    const start = html.indexOf('id="product-analytics-panel"');
    const end = html.indexOf('id="subscription-analytics-content"');
    const analyticsShell = html.slice(start, end);
    expect(analyticsShell).toContain('Экраны, сессии и уроки');
    expect(analyticsShell).toContain('title="За какой период показать события продукта"');
    expect(analyticsShell).toContain('Обновить данные');
    expect(analyticsShell).not.toContain('Product analytics: screens and lessons');
    expect(analyticsShell).not.toContain('Refresh');
  });

  it('audits the current shell and actual Admin v2 modules', () => {
    const audit = read('scripts/admin-v2-language-audit.mjs');
    expect(audit).toContain("collectFiles('admin/v2')");
    expect(audit).toContain('повреждённая UTF-8 кодировка');
    expect(audit).toContain('сырой ключ события как основная подпись');
    expect(audit).toContain('Product Manager Digest');
    expect(audit).toContain('ANALYTICS_BIGQUERY_DATASET');
    expect(audit).toContain('Где заканчиваются сессии');
    expect(audit).not.toContain("'admin/index.html'");
  });
});

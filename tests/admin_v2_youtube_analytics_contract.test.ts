import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

describe('Admin v2 YouTube analytics contract', () => {
  const html = read('admin/v2/index.html');
  const core = read('admin/v2/scripts/admin-core.js');
  const router = read('admin/v2/scripts/admin-router.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const page = read('admin/v2/scripts/pages/youtube-analytics.js');
  const css = read('admin/v2/styles/admin.css');

  test('registers a sub-route and mount point without adding an eighth primary section', () => {
    expect(router).toContain("'youtube-analytics': 'youtube-analytics'");
    expect(router).toContain("'youtube-analytics', 'daily-briefing'");
    expect(core).toContain("'youtube-analytics': renderYoutubeAnalytics");
    expect(page).toContain('id="youtube-analytics-panel"');
    expect(html).toContain('/v2/scripts/pages/youtube-analytics.js');
    const primarySections = core.slice(core.indexOf('export const ADMIN_SECTIONS'), core.indexOf('const PAGES'));
    expect(primarySections).not.toContain('youtube-analytics');
    expect(primarySections.match(/\{ route:/g)).toHaveLength(7);
  });

  test('links from the existing analytics hub and mirrors analytics.read permissions', () => {
    expect(core).toContain('href="#youtube-analytics"');
    expect(core).toContain("owner: new Set(['users.read', 'money.read', 'analytics.read'");
    expect(core).toContain("admin: new Set(['users.read', 'money.read', 'analytics.read'");
    expect(core).toContain("analyst: new Set(['users.read', 'money.read', 'analytics.read'");
    expect(core).toContain("can('analytics.read')");
    expect(core).toContain("!can('analytics.read')");
  });

  test('uses only the protected callable bridge for aggregate data', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminYoutubeAnalytics')");
    expect(firebase).toContain('loadYoutubeAnalytics: async');
    expect(router).toContain('globalThis.callAdminYoutubeAnalytics');
    expect(page).toContain('globalThis.callAdminYoutubeAnalytics(input)');
    expect(page).not.toContain('getFirestore');
  });

  test('provides labeled filters, one primary refresh, accessible trend data, funnel, and video table', () => {
    expect(page).toContain('for="youtube-range"');
    expect(page).toContain('for="youtube-platform"');
    expect(page).toContain('for="youtube-channel"');
    expect(page).toContain('for="youtube-video"');
    expect(page.match(/class="button primary youtube-refresh"/g)).toHaveLength(1);
    expect(page).toContain('Показать данные графика таблицей');
    expect(page).toContain('Путь до просмотра');
    expect(page).toContain('Сортировать по запускам');
    expect(page).toContain('Что мы можем измерить');
    expect(page).toContain("'Нажали открыть видео'");
    expect(page).toContain("renderMetric('Нажали открыть канал'");
    expect(page).toContain('Они не подтверждают фактический переход, просмотр или подписку.');
    expect(page).toContain('Переустановка приложения может создать новый анонимный экземпляр.');
    expect(page).toContain('const primary = hasTitle ? row.title : row.videoId;');
    expect(page).toContain('Название недоступно · канал');
    expect(page).not.toContain("row.title || 'Видео без названия'");
    expect(page).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  test('keeps responsive geometry, local table scrolling, focus support, and existing lime contrast', () => {
    expect(css).toContain('.youtube-table-wrap { max-width: 100%; overflow-x: auto;');
    expect(css).toContain('.youtube-filters');
    expect(css).toContain('.youtube-kpis');
    expect(css).toContain('@media (max-width: 1180px)');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.button.primary { border-color: #8eaf2f; background: var(--lime); color: var(--lime-ink); }');
  });
});

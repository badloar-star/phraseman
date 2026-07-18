import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const supportStart = core.indexOf('function renderSupport()');
const supportEnd = core.indexOf('\nfunction renderDetailedAnalyticsWorkspace()', supportStart);
const support = core.slice(supportStart, supportEnd);

describe('Admin v2 support inbox UI contract', () => {
  test('uses the approved inbox heading and exposes the active filter to assistive technology', () => {
    expect(support).toContain("title: 'Входящие / Поддержка'");
    expect(support).toContain('data-support-filter="new"');
    expect(support).toContain('data-support-filter="answered"');
    expect(support).toContain('data-support-filter="archived"');
    expect(support).toContain('data-support-filter="all"');
    expect(support).toContain("aria-pressed=\"${filter === 'new' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'answered' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'archived' ? 'true' : 'false'}\"");
    expect(support).toContain("aria-pressed=\"${filter === 'all' ? 'true' : 'false'}\"");
  });

  test('announces one loading-or-count status and uses empty copy for the selected folder', () => {
    expect((support.match(/role="status"/g) || [])).toHaveLength(1);
    expect(support).toContain('aria-live="polite"');
    expect(support).toContain('Загружаю входящие…');
    expect(support).toContain('Писем в списке: ${filtered.length}.');
    expect(support).toContain('Новых писем нет.');
    expect(support).toContain('Отвеченных писем нет.');
    expect(support).toContain('В архиве писем нет.');
    expect(support).toContain('Во входящих писем нет.');
  });
});

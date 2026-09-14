import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync(path.join(__dirname, '..', 'admin/v2/legacy.html'), 'utf8');

function loadFormatter(): (value: unknown, withTime?: boolean, nowMs?: number) => string {
  const start = html.indexOf("  const IDEA_DATE_LOCALE = 'ru-RU';");
  const end = html.indexOf('  function ideaLangLabel', start);
  if (start < 0 || end < 0) throw new Error('Idea date formatter block was not found');
  const context = vm.createContext({ Date, Intl, Number, String });
  vm.runInContext(`${html.slice(start, end)}; globalThis.formatIdeaPostDate = formatIdeaPostDate;`, context);
  return (context as unknown as {
    formatIdeaPostDate: (value: unknown, withTime?: boolean, nowMs?: number) => string;
  }).formatIdeaPostDate;
}

describe('community ideas admin dates', () => {
  test('uses compact Twitter-like date labels and supports an exact detail timestamp', () => {
    const formatIdeaPostDate = loadFormatter();
    const nowMs = Date.parse('2026-09-11T12:00:00Z');

    expect(formatIdeaPostDate('2026-09-11T09:30:00Z', false, nowMs)).toBe('11 сент.');
    expect(formatIdeaPostDate('2025-09-11T09:30:00Z', false, nowMs)).toBe('11 сент. 2025 г.');
    const expectedLocalTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
      .format(new Date('2026-09-11T09:30:00Z'));
    expect(formatIdeaPostDate('2026-09-11T09:30:00Z', true, nowMs)).toBe(`11 сент. · ${expectedLocalTime}`);
    expect(formatIdeaPostDate('not-a-date', false, nowMs)).toBe('—');
  });

  test('uses the formatter for both idea lists and the idea detail', () => {
    expect(html).toContain('formatIdeaPostDate(r.createdAt || r.createdAtMs)');
    expect(html).toContain('formatIdeaPostDate(idea.createdAt || idea.createdAtMs, true)');
    expect(html).toContain('window.renderAdminIdeaDetail = renderAdminIdeaDetail;');
    expect(html).not.toContain("String(r.createdAt).slice(0, 10)");
    expect(html).not.toContain("String(r.createdAt || '')");
  });
});

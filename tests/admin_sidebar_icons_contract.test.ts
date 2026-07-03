import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();

describe('admin sidebar icons', () => {
  const html = readFileSync(path.join(root, 'admin/index.html'), 'utf8');

  test('sidebar tabs render compact SVG icons next to text labels', () => {
    expect(html).toContain('.admin-tab-icon');
    expect(html).toContain('.admin-tab-main');
    expect(html).toContain('.admin-tab-text');
    expect(html).toContain('function adminTabIconHtml(key)');
    expect(html).toContain('aria-hidden="true"');
  });

  test('all internal admin tab keys have icon mapping', () => {
    const keysBlock = html.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/)?.[1] || '';
    const iconBlock = html.match(/const ADMIN_TAB_ICON_BY_KEY = \{([\s\S]*?)\n  \};/)?.[1] || '';
    const keys = Array.from(keysBlock.matchAll(/'([^']+)'/g), (match) => match[1]);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      expect(iconBlock.includes(`${key}:`) || iconBlock.includes(`'${key}':`)).toBe(true);
    }
  });

  test('external sidebar links also receive clean labels and icons', () => {
    expect(html).toContain("if (onclick.includes('full.html')) return 'full';");
    expect(html).toContain("if (onclick.includes('site.html')) return 'site';");
    expect(html).toContain("full: 'Full analytics'");
    expect(html).toContain("site: 'Site'");
    expect(html).toContain("full: 'chart'");
    expect(html).toContain("site: 'globe'");
  });
});

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('legacy admin primary entry', () => {
  const entry = read('admin/index.html');
  const legacy = read('admin/legacy.html');

  test('opens the preserved legacy admin by default and keeps the requested hash', () => {
    expect(entry).toContain('<title>PhraseMan Admin</title>');
    expect(entry).toContain('url=/legacy.html');
    expect(entry).toContain("window.location.replace('/legacy.html' + suffix)");
    expect(entry).not.toContain('url=/v2/');
    expect(entry).not.toContain("window.location.replace('/v2/'");
  });

  test('shows one prominent and accessible route to Admin 2 in the old header', () => {
    const headerStart = legacy.indexOf('<header>');
    const headerEnd = legacy.indexOf('</header>', headerStart);
    const header = legacy.slice(headerStart, headerEnd);

    expect(headerStart).toBeGreaterThanOrEqual(0);
    expect(headerEnd).toBeGreaterThan(headerStart);
    expect(header).toContain('class="admin-v2-link"');
    expect(header).toContain('href="/v2/"');
    expect(header).toContain('Открыть новую админку');
    expect(header).toContain('aria-label="Открыть новую админку Admin 2"');
    expect(header).toContain('title="Открыть новую админку Admin 2. Старая админка останется доступна в этой вкладке."');

    expect(legacy).toMatch(/\.admin-v2-link\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*#2563eb;/s);
    expect(legacy).toMatch(/\.admin-v2-link:focus-visible\s*\{[^}]*outline:\s*3px solid #38bdf8;/s);
  });
});

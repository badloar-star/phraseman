import fs from 'node:fs';
import path from 'node:path';

describe('admin local file entry', () => {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'admin/v2/legacy.html'),
    'utf8',
  );

  test('redirects file:// openings to the hosted admin before auth bootstrap', () => {
    expect(html).toMatch(
      /if\s*\(window\.location\.protocol\s*===\s*['"]file:['"]\)/,
    );
    expect(html).toContain(
      "https://phraseman-ea0b3.web.app/legacy.html' + window.location.search + window.location.hash",
    );
    expect(html).toContain('window.location.replace(');
  });
});

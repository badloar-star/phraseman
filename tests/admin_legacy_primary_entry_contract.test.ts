import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('legacy admin primary entry', () => {
  const entry = read('admin/index.html');

  test('opens the preserved legacy admin by default and keeps the requested hash', () => {
    expect(entry).toContain('<title>PhraseMan Admin</title>');
    expect(entry).toContain('url=/legacy.html');
    expect(entry).toContain("window.location.replace('/legacy.html' + suffix)");
    expect(entry).not.toContain('url=/v2/');
    expect(entry).not.toContain("window.location.replace('/v2/'");
  });
});

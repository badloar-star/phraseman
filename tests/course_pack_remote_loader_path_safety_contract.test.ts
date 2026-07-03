import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_remote_loader.ts'), 'utf8');

describe('course pack remote loader path safety contract', () => {
  it('sanitizes cache-relative paths before creating File handles', () => {
    expect(SOURCE).toContain('function safeRelativeCachePath');
    expect(SOURCE).toContain("name.replace(/\\\\/g, '/')");
    expect(SOURCE).toContain("normalized.startsWith('/')");
    expect(SOURCE).toContain("normalized.includes('?')");
    expect(SOURCE).toContain("normalized.includes('#')");
    expect(SOURCE).toContain("segment === '..'");
    expect(SOURCE).toContain('function fileIn(dir: Directory, name: string): File | null');
    expect(SOURCE).toContain('return safeName ? new File(dir, safeName) : null;');
  });

  it('fails closed for unsafe entry index or row cache paths', () => {
    expect(SOURCE).toContain("if (!indexFile) return { state: 'integrity_failed', detail: 'entry index path is unsafe' };");
    expect(SOURCE).toContain('if (!file) return null;');
    expect(SOURCE).not.toContain('new File(dir, name)');
  });
});

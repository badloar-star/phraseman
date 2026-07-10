import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Language Factory job visibility', () => {
  test('v2 exposes a bounded server-side job read behind the content workflow', () => {
    const source = fs.readFileSync(path.join(root, 'functions', 'src', 'admin_content_factory.ts'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'admin', 'v2', 'index.html'), 'utf8');
    expect(source).toContain('export const adminListContentFactoryJobs = onCall(');
    expect(source).toContain("hasPermission(role, 'content.read')");
    expect(source).toContain('.limit(100)');
    expect(index).toContain('adminListContentFactoryJobs');
    expect(html).toContain("httpsCallable(functions, 'adminListContentFactoryJobs')");
  });
});

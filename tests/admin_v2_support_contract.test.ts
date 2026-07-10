import fs from 'node:fs';
import path from 'node:path';

const html = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'index.html'), 'utf8');

describe('Admin v2 support mail surface', () => {
  test('keeps support inside the existing control plane and exposes protected actions', () => {
    expect(html).toContain('support: { title:');
    expect(html).toContain("httpsCallable(functions, 'adminSupportList')");
    expect(html).toContain("httpsCallable(functions, 'adminSupportPull')");
    expect(html).toContain('admin/index.html#gmail-support');
  });

  test('does not reintroduce direct client reads of private support_inbox', () => {
    expect(html).not.toContain("collection(db, 'support_inbox')");
  });
});

import fs from 'node:fs';
import path from 'node:path';

const core = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const firebase = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');

describe('Admin v2 support mail surface', () => {
  test('keeps support inside the existing control plane and exposes protected actions', () => {
    expect(core).toContain("support: { title: 'Почта поддержки'");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportList')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSupportPull')");
    expect(core).toContain('admin/index.html#gmail-support');
  });

  test('does not reintroduce direct client reads of private support_inbox', () => {
    expect(firebase).not.toContain("collection(db, 'support_inbox')");
  });
});

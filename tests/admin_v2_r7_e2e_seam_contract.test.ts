import fs from 'node:fs';
import path from 'node:path';

const router = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'scripts', 'admin-router.js'), 'utf8');

describe('Admin v2 R7 E2E seam safety', () => {
  it('is impossible to activate the fake action/auth seam outside loopback', () => {
    expect(router).toContain("host === '127.0.0.1' || host === 'localhost' || host === '::1'");
    expect(router).toContain('const localE2e = loopback && globalThis.__PHRASEMAN_ADMIN_E2E__');
    expect(router).not.toContain("import { createFirebaseAdminActions } from './admin-firebase.js'");
    expect(router).toContain("import('./admin-firebase.js')");
  });
});

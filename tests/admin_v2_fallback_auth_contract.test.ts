import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 fallback authentication', () => {
  test('uses the same Firebase Hosting config in the standalone legacy admin and Admin v2 shell', () => {
    const legacy = read('admin/legacy.html');
    const v2 = read('admin/v2/scripts/admin-firebase.js');

    expect(legacy).toContain("fetch('/__/firebase/init.json'");
    expect(legacy).toContain('initializeApp(await resolveAdminFirebaseConfig())');
    expect(legacy).not.toMatch(/apiKey:\s*["']AIza/);
    expect(v2).toContain("fetch('/__/firebase/init.json'");
    expect(v2).toContain('browserLocalPersistence');
    expect(v2).toContain('await setPersistence(auth, browserLocalPersistence)');
  });
});

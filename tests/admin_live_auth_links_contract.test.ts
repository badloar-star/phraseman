import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('live admin Auth Links diagnostics', () => {
  const live = read('admin/v2/legacy.html');

  test('lives only on the Firebase-hosted legacy surface', () => {
    const firebase = JSON.parse(read('firebase.json')) as { hosting?: Array<{ target?: string; public?: string }> };
    expect(firebase.hosting?.some((entry) => entry.target === 'admin' && entry.public === 'admin/v2')).toBe(true);
    expect(live).toContain("acc('auth-links', '🔗 Auth Links'");
    for (const frozen of ['admin/legacy.html', 'admin/index.html', 'admin/full.html', 'admin/site.html']) {
      const absolute = path.join(root, frozen);
      if (fs.existsSync(absolute)) {
        expect(read(frozen)).not.toContain("acc('auth-links', '🔗 Auth Links'");
      }
    }
  });

  test('uses only protected adminGetUserProfile data for Auth Links', () => {
    expect(live).toContain("httpsCallable(functionsUs, 'adminGetUserProfile')");
    const start = live.indexOf('async function u360LoadAuthLinksDiagnostic');
    const end = live.indexOf('\n  window.u360LoadLazySection', start);
    const diagnostic = live.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(diagnostic).toContain('getAdminGetUserProfileCallable()({ uid })');
    expect(diagnostic).not.toMatch(/collection\(|getDoc\(|setDoc\(|updateDoc\(|deleteDoc\(|addDoc\(/);
    expect(diagnostic).not.toContain('adminRepairAuthLink');
    expect(diagnostic).not.toContain('adminRelinkProvider');
  });

  test('renders canonical identities, explicit link state, provenance and safe refresh', () => {
    for (const label of [
      'Canonical stable ID',
      'Firebase Auth UID',
      'Provider UID',
      'Auth Link state',
      'Provenance',
    ]) expect(live).toContain(label);
    expect(live).toContain("state: 'linked'");
    expect(live).toContain("state: 'missing'");
    expect(live).toContain("state: 'mismatch'");
    expect(live).toContain("const firebaseAuthUid = String(identity.providerUid || '').trim()");
    expect(live).toContain("const providerUid = String(auth.providerUid || '').trim()");
    expect(live).toContain('data-auth-links-refresh');
    expect(live).toContain('Обновить Auth Links диагностику');
    expect(live).toContain('Диагностика не изменяет привязки и аккаунты');
    expect(live).toContain('role="status" aria-live="polite"');
  });
});

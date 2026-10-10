import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const source = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8'));

function recoveryCredentialSource(): string {
  const start = source.indexOf('export async function acquireAuthRecoveryNativeCredential');
  // зачем (10.10): после шва account-authority вставил НЕэкспортируемую runAccountAuthorityCredentialSignIn (законно
  // зовёт getAuth) — срез «до следующего export» захватывал её. Режем ровно по концу функции шва.
  const end = source.indexOf('\n}\n', start) + 2;
  expect(start).toBeGreaterThanOrEqual(0);
  return source.slice(start, end >= 0 ? end : source.length);
}

describe('auth recovery provider credential seam', () => {
  it('exports a native-only acquisition seam with explicit platform routing', () => {
    const seam = recoveryCredentialSource();
    expect(seam).toContain("provider === 'google'");
    expect(seam).toContain("Platform.OS === 'android'");
    expect(seam).toContain('runGoogleNativeSignIn()');
    expect(seam).toContain('runAppleAndroidOAuthSignIn()');
    expect(seam).toContain('runAppleNativeSignIn()');
  });

  it('cannot mutate default Firebase, stable identity, Firestore, or cloud sync', () => {
    const seam = recoveryCredentialSource();
    for (const forbidden of [
      'getAuth(',
      'getFirestore(',
      'getStableId(',
      'setStableId(',
      'ensureAnonUser(',
      'signInWithCredential(',
      'linkWithCredential(',
      'GoogleAuthProvider.credential(',
      'AppleAuthProvider.credential(',
      'syncToCloud(',
      'restoreFromCloud(',
    ]) {
      expect(seam).not.toContain(forbidden);
    }
  });
});

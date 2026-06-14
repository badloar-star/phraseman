import { readFileSync } from 'fs';
import path from 'path';

const authIdentityPath = path.join(process.cwd(), 'functions', 'src', 'auth_identity.ts');

describe('authEnsureStableLink anon relink (post-reinstall fix)', () => {
  const source = readFileSync(authIdentityPath, 'utf8');

  test('authEnsureStableLink sets allowAnonRelink to inverse of allowProviderRelink', () => {
    // Fixes: after app reinstall, Firebase anon uid changes but stable_id stays in Keychain.
    // Without allowAnonRelink, assertStableOwner throws stable_id_mismatch → nameReserve
    // fails with "Имя не проверилось".
    expect(source).toContain('const allowAnonRelink = !allowProviderRelink;');
    expect(source).toContain('allowAnonRelink }');
  });

  test('assertStableOwner option type includes allowAnonRelink', () => {
    expect(source).toContain('allowAnonRelink?: boolean');
  });

  test('assertStableOwner allowAnonRelink guard requires no existing provider link', () => {
    // Security: accounts with a Google/Apple provider (linkedAuthUid set) are never
    // relinkable by an anonymous uid — only pure anonymous accounts can be relinked.
    const guardLine = source
      .split('\n')
      .find((l) => l.includes('allowAnonRelink') && l.includes('!linkedStableId') && l.includes('!linkedAuthUid'));
    expect(guardLine).toBeDefined();
  });
});

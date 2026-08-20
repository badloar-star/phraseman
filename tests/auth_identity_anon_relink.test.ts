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

  test('assertStableOwner relink requires a fresh claim from the previous anonymous owner', () => {
    // Security: possession of a stable id alone cannot replace its Firebase owner.
    // The old anonymous session must stamp a fresh proof before provider fallback.
    expect(source).toContain('const hasFreshPreviousOwnerProof');
    expect(source).toContain('anonClaim?.authUid === userAuthUid');
    expect(source).toMatch(
      /allowAnonRelink[\s\S]{0,220}hasFreshPreviousOwnerProof[\s\S]{0,120}!linkedAuthUid/,
    );
  });

  test('checks retired auth and linked identities before any orphan relink repair', () => {
    const start = source.indexOf('export async function ensureStableLinkForAuth');
    const end = source.indexOf('export const authEnsureStableLink', start);
    const body = source.slice(start, end);

    expect(body.indexOf('await assertAccountDeletionNotPending(db, authUid)')).toBeGreaterThan(-1);
    expect(body.indexOf('await assertAccountDeletionNotPending(db, authUid)'))
      .toBeLessThan(body.indexOf('const existingLinkSnap'));
    expect(body.indexOf('if (linkedStableId) await assertStableDeletionNotPending(db, linkedStableId)'))
      .toBeLessThan(body.indexOf('const linkedUserExists'));
    expect(source).toContain("throw new HttpsError('failed-precondition', 'identity_retired'");
    expect(source).toContain("recovery: 'create_fresh_anonymous'");
  });

  test('returns identityReady only after the exact server identity pair is ensured', () => {
    expect(source).toContain('const userRef = db.collection(USERS).doc(stableId);');
    expect(source).toContain('const authLinkRef = db.collection(AUTH_LINKS).doc(authUid);');
    expect(source).toContain('await ensureStableIdentityPair(db, authUid');
    expect(source).toContain('identityReady: true');
    expect(source).toMatch(
      /await ensureStableIdentityPair\(db, authUid,[\s\S]{0,420}return \{ ok: true, stableUid[^}]*identityReady: true \};/,
    );
  });
});

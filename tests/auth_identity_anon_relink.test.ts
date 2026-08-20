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

  // ── Хвост E: осиротевшая auth_links после удаления аккаунта ───────────────
  // Повторный вход тем же Google/Apple НЕ должен цепляться за мёртвый users-док
  // (stable_id из auth_links указывает на удалённый аккаунт). Сервер должен
  // игнорировать осиротевшую привязку и перепривязать на текущий stableId.
  test('ensureStableLinkForAuth ignores an auth_link pointing to a deleted user doc', () => {
    // Перед использованием linkedStableId проверяется существование users-дока.
    expect(source).toContain('const linkedUserExists');
    expect(source).toMatch(
      /linkedUserExists[\s\S]{0,160}collection\(USERS\)\.doc\(linkedStableId\)\.get\(\)/,
    );
    // Осиротевшая ветка логируется и НЕ привязывается к мёртвому id.
    expect(source).toContain("event: 'auth_link_orphan_ignored'");
    expect(source).toContain('if (linkedStableId && linkedStableId !== stableId && !linkedUserExists)');
    // Живая привязка по-прежнему обрабатывается (else if с тем же условием без orphan).
    expect(source).toContain('} else if (linkedStableId && linkedStableId !== stableId) {');
  });
});

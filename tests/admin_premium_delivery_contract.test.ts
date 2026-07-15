import fs from 'fs';
import path from 'path';

describe('admin premium delivery contract', () => {
  const premiumContext = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');
  const cloudSync = fs.readFileSync(path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');
  const authProvider = fs.readFileSync(path.join(process.cwd(), 'app', 'auth_provider.ts'), 'utf8');
  const premiumGuard = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_guard.ts'), 'utf8');
  const e2eScreen = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_premium_delivery_test.tsx'), 'utf8');
  const maestroFlow = fs.readFileSync(path.join(process.cwd(), 'maestro', 'flows', 'dev_only', 'admin_premium_delivery_e2e.yaml'), 'utf8');
  const externalGrantFlow = fs.readFileSync(
    path.join(process.cwd(), 'maestro', 'flows', 'dev_only', 'admin_premium_delivery_external_grant.yaml'),
    'utf8',
  );
  const authIdentityFn = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'auth_identity.ts'), 'utf8');

  it('verifies the canonical server auth link before reading admin premium from Firestore', () => {
    const restoreStart = cloudSync.indexOf('export async function restoreAndMigrateFromCloud');
    const getUserDoc = cloudSync.indexOf("db.collection('users').doc(uid).get()", restoreStart);
    const linkCall = cloudSync.indexOf('ensureStableAuthLinkForStableIdDetailed(uid)', restoreStart);
    const canonicalGuard = cloudSync.indexOf('linked.stableUid !== uid', linkCall);

    expect(restoreStart).toBeGreaterThan(-1);
    expect(linkCall).toBeGreaterThan(restoreStart);
    expect(canonicalGuard).toBeGreaterThan(linkCall);
    expect(canonicalGuard).toBeLessThan(getUserDoc);
    expect(linkCall).toBeLessThan(getUserDoc);
  });

  it('keeps force sync documents readable by stable-id owner rules', () => {
    const forceSyncStart = cloudSync.indexOf('export async function forceSyncToCloud');
    const forceSyncBody = cloudSync.slice(forceSyncStart, cloudSync.indexOf('// ── Очистка локального прогресса', forceSyncStart));

    expect(forceSyncBody).toContain('const firebaseAuthUidRow = getAuthUserId();');
    expect(forceSyncBody).toContain('firebaseAuthUid: firebaseAuthUidRow');
  });

  it('starts the live admin VIP listener only after stable auth linking and retries dead listeners', () => {
    const listenerStart = premiumContext.indexOf('Live VIP grants/revokes from admin/index.html');
    const listenerBody = premiumContext.slice(listenerStart, premiumContext.indexOf('// Reload when app comes to foreground', listenerStart));

    expect(listenerBody).toContain('ensureStableAuthLinkForStableId');
    expect(listenerBody.indexOf('ensureStableAuthLinkForStableId(uid)')).toBeLessThan(listenerBody.indexOf('.onSnapshot('));
    expect(listenerBody).toContain('scheduleRetry');
    expect(listenerBody).toContain('2_500');
  });

  it('lets PremiumProvider use the cloud-backed access guard before showing no-access state', () => {
    const reloadStart = premiumContext.indexOf('const runReload = useCallback');
    const reloadBody = premiumContext.slice(reloadStart, premiumContext.indexOf('const reload = useCallback', reloadStart));

    expect(premiumContext).toContain('getVerifiedPremiumAccessStatus');
    expect(reloadBody).toContain('if (!realPremium && !vip)');
    expect(reloadBody).toContain('getVerifiedPremiumAccessStatus().catch');
    expect(reloadBody).toContain('if (accessAfterCloud)');
    expect(reloadBody).toContain('getVerifiedRealPremiumStatus().catch');
    expect(reloadBody).toContain('getVerifiedVipStatus().catch');
  });

  it('does not redirect a direct AI-dialog entry before entitlement resolution finishes', () => {
    const dialogSession = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_session.tsx'), 'utf8');
    const redirectStart = dialogSession.indexOf("source: 'ai_dialog_direct_entry'");
    const redirectEffect = dialogSession.slice(Math.max(0, redirectStart - 260), redirectStart + 260);

    expect(premiumContext).toContain('accessResolved: boolean;');
    expect(premiumContext).toContain('const [accessResolved, setAccessResolved] = useState(false);');
    expect(premiumContext).toContain('setAccessResolved(true);');
    expect(dialogSession).toContain('const { hasPremiumAccess, accessResolved } = usePremium();');
    expect(redirectEffect).toContain('if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;');
    expect(redirectEffect).toContain('[accessResolved, aiDialogGateOpen, dialogAccess, router]');
  });

  it('restarts the VIP listener after provider login or stable-id merge', () => {
    expect(premiumContext).toContain("onAppEvent('auth_provider_linked'");
    expect(premiumContext).toContain('setPremiumListenerRevision');
    expect(authProvider).toContain('emitAuthProviderLinked');
    expect(authProvider).toContain("emitAppEvent('auth_provider_linked')");
  });

  it('keeps admin grants as VIP access while real Premium stays separate', () => {
    const vipBranch = premiumGuard.indexOf('getVerifiedVipStatus');
    const realBranch = premiumGuard.indexOf('getVerifiedRealPremiumStatus');
    const noPremiumBranch = premiumGuard.indexOf("noPremium === 'true'");
    expect(vipBranch).toBeGreaterThan(-1);
    expect(realBranch).toBeGreaterThan(-1);
    expect(noPremiumBranch).toBeGreaterThan(-1);
  });

  it('keeps a Maestro E2E that writes the admin/index VIP payload and waits for app delivery', () => {
    expect(e2eScreen).toContain("'progress.vip_active': 'true'");
    expect(e2eScreen).toContain("'progress.vip_plan': 'admin_vip'");
    expect(e2eScreen).toContain("'progress.vip_until': expiry");
    expect(e2eScreen).toContain("'progress.vip_admin_grant_at': grantAt");
    expect(e2eScreen).toContain("linkedAuth");
    expect(e2eScreen).toContain("switchToFreshE2EIdentity");
    expect(e2eScreen).toContain("setStoredStableId");
    expect(e2eScreen).toContain("after-signout-new-account");
    expect(e2eScreen).toContain("'progress.vip_active': 'false'");
    expect(e2eScreen).toContain('admin-premium-e2e-auth-matrix');
    expect(e2eScreen).toContain('PASS auth matrix');
    expect(e2eScreen).toContain('admin-premium-e2e-pass');
    expect(e2eScreen).toContain('admin-premium-e2e-reset');
    expect(e2eScreen).toContain('admin-premium-e2e-ready');
    expect(maestroFlow).toContain('phraseman:///admin_premium_delivery_test');
    expect(maestroFlow).toContain('admin-premium-e2e-auth-matrix');
    expect(maestroFlow).toContain('admin-premium-e2e-pass');
    expect(maestroFlow).toContain('admin-premium-e2e-auth-matrix-pass');
  });

  it('keeps a Maestro E2E for real Admin Panel VIP delivery without client self-grant', () => {
    expect(externalGrantFlow).toContain('Admin Panel VIP tab');
    expect(externalGrantFlow).toContain('admin-premium-e2e-ready');
    expect(externalGrantFlow).toContain('admin-premium-e2e-pass');
    expect(externalGrantFlow).not.toContain('admin-premium-e2e-auth-matrix');
    expect(externalGrantFlow).not.toContain('tapOn');
  });

  it('preserves provider-linked ownership without allowing unknown auth mismatches', () => {
    expect(authIdentityFn).toContain('const hasProviderLink');
    expect(authIdentityFn).toContain('if (!canonicalLinkConflicts && linkedAuthUid === authUid) return;');
    expect(authIdentityFn).not.toContain('if (!hasProviderLink) return;');
    expect(authIdentityFn).toContain("throw new HttpsError('permission-denied', 'stable_id_mismatch')");
  });
});

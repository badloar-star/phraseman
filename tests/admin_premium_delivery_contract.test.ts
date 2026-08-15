import fs from 'fs';
import path from 'path';

describe('admin premium delivery contract', () => {
  const premiumContext = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');
  const cloudSync = fs.readFileSync(path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');
  const authProvider = fs.readFileSync(path.join(process.cwd(), 'app', 'auth_provider.ts'), 'utf8');
  const premiumGuard = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_guard.ts'), 'utf8');
  const authIdentityFn = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'auth_identity.ts'), 'utf8');

  it('links stable users to Firebase auth before reading admin premium from Firestore', () => {
    const restoreStart = cloudSync.indexOf('async function restoreAndMigrateFromCloudResult');
    const getUserDoc = cloudSync.indexOf("db.collection('users').doc(uid).get()", restoreStart);
    const linkCall = cloudSync.indexOf('ensureStableAuthLinkForStableIdDetailed(uid)', restoreStart);

    expect(restoreStart).toBeGreaterThan(-1);
    expect(linkCall).toBeGreaterThan(restoreStart);
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

    expect(listenerBody).toContain('ensureStableAuthLinkForStableIdDetailed');
    expect(listenerBody.indexOf('ensureStableAuthLinkForStableIdDetailed(uid)')).toBeLessThan(listenerBody.indexOf('.onSnapshot('));
    expect(listenerBody).toContain("stableLink?.failure === 'stable_id_mismatch'");
    expect(listenerBody.indexOf('stableLink.stableUid !== uid')).toBeLessThan(listenerBody.indexOf('.onSnapshot('));
    expect(listenerBody).toContain('scheduleRetry');
    expect(premiumContext).toContain('const PREMIUM_LISTENER_RETRY_BACKOFF_MS = [2_500, 10_000, 30_000');
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
    const noPremiumBranch = premiumGuard.indexOf('resolveTesterNoPremiumOverride(noPremium)');
    expect(vipBranch).toBeGreaterThan(-1);
    expect(realBranch).toBeGreaterThan(-1);
    expect(noPremiumBranch).toBeGreaterThan(-1);
  });

  it('preserves provider-linked ownership without allowing unknown auth mismatches', () => {
    expect(authIdentityFn).toContain('const hasProviderLink');
    expect(authIdentityFn).toContain('if (!canonicalLinkConflicts && userAuthUid === authUid)');
    expect(authIdentityFn).not.toContain('if (!hasProviderLink) return;');
    expect(authIdentityFn).toContain("throw new HttpsError('permission-denied', 'stable_id_mismatch')");
  });
});

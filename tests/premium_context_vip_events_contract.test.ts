import fs from 'fs';
import path from 'path';

describe('PremiumContext VIP event contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');

  it('updates VIP access immediately when admin activation emits vip_activated', () => {
    const start = source.indexOf("onAppEvent('vip_activated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('vip_deactivated'", start));

    expect(body).toContain('setIsVip(true)');
    expect(body).toContain('setHasPremiumAccess(true)');
    expect(body).toContain('invalidatePremiumCache()');
    expect(body).toContain("syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true })");
  });

  it('keeps real Premium access when VIP is revoked', () => {
    const start = source.indexOf("onAppEvent('vip_deactivated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('return () =>', start));

    expect(body).toContain('setIsVip(false)');
    expect(body).toContain('setHasPremiumAccess(isPremium)');
    expect(body).toContain("syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium })");
  });

  it('exposes intro full access separately from real Premium and VIP', () => {
    expect(source).toContain('isIntroFullAccess');
    expect(source).toContain('introFullAccessEndsAt');
    expect(source).toContain('getIntroFullAccessState');
    // Доступ собирается из real/vip/intro.
    expect(source).toContain('setHasPremiumAccess(effectivePremium || effectiveVip || introState.active)');
    expect(source).toContain("onAppEvent('intro_full_access_changed'");
  });

  it('treats non-store tester_no_limits as Premium while tester_no_premium still wins', () => {
    expect(source).toContain("AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])");
    expect(source).toContain("noLimitsRaw === 'true' && !IS_STORE_RELEASE");
    expect(source).toContain('const effectivePremium = !noPremiumTester && (realPremium || testerNoLimits);');
    expect(source).toContain('const effectiveVip = !noPremiumTester && vip;');
    expect(source).toContain('setIsPremium(effectivePremium)');
  });

  it('does not let the optimistic premium event bypass tester precedence or the store fuse', () => {
    const start = source.indexOf("onAppEvent('premium_activated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('vip_activated'", start));

    expect(body).toContain("AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])");
    expect(body).toContain('activationNoPremium || (activationNoLimits && IS_STORE_RELEASE)');
    expect(body.indexOf('activationNoPremium || (activationNoLimits && IS_STORE_RELEASE)'))
      .toBeLessThan(body.indexOf('setIsPremium(true)'));
  });

  it('clears in-memory entitlement state immediately when account deletion completes locally', () => {
    const start = source.indexOf("onAppEvent('account_deleted'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('premium_deactivated'", start));
    const resetStart = source.indexOf('const resetPremiumUiForAccountTransition');
    const resetBody = source.slice(resetStart, source.indexOf('const reloadTrialEligible', resetStart));

    expect(body).toContain('beginPremiumAccountTransition()');
    expect(resetBody).toContain('vipSnapshotStateRef.current = false');
    expect(resetBody).toContain('setIsPremium(false)');
    expect(resetBody).toContain('setIsVip(false)');
    expect(resetBody).toContain('setHasPremiumAccess(false)');
    expect(resetBody).toContain('setAccessResolved(false)');
    expect(body).not.toContain('setAccessResolved(true)');
    expect(resetBody).toContain('setIsIntroFullAccess(false)');
    expect(body).toContain("emitAppEvent('premium_access_changed', { active: false, source: 'none' })");
  });

  it('fails closed immediately on the reusable account transition event', () => {
    expect(source).toContain('onPremiumAccountTransition');
    const listenerStart = source.indexOf('onPremiumAccountTransition(');
    const listenerBody = source.slice(listenerStart, source.indexOf('return () =>', listenerStart));
    const resetStart = source.indexOf('const resetPremiumUiForAccountTransition');
    const body = source.slice(resetStart, source.indexOf('const reloadTrialEligible', resetStart));

    expect(listenerBody).toContain('resetPremiumUiForAccountTransition()');
    expect(listenerBody).toContain('premiumAccountTransitionActiveRef.current = true');
    expect(listenerBody).toContain('setPremiumListenerRevision((v) => v + 1)');
    expect(body).toContain('setIsPremium(false)');
    expect(body).toContain('setIsVip(false)');
    expect(body).toContain('setHasPremiumAccess(false)');
    expect(body).toContain('setAccessResolved(false)');
    expect(body).toContain('premiumReloadEpochRef.current += 1');
  });

  it('guards delayed VIP snapshot writes and state commits with the transition epoch', () => {
    const listenerStart = source.indexOf('Live VIP grants/revokes from admin/index.html');
    const listenerBody = source.slice(listenerStart, source.indexOf('// Reload when app comes to foreground', listenerStart));

    expect(listenerBody).toContain('runPremiumAccountScopedWork');
    expect(listenerBody).toContain('const listenerEpoch = getPremiumAccountTransitionEpoch()');
    expect(listenerBody).toContain('if (!isListenerCurrent()) return;');
    expect(listenerBody).toContain('const listenerGeneration = captureAccountGeneration()');
    expect(listenerBody).toContain('const listenerStableId = listenerGeneration.stableId');
    expect(listenerBody).toContain('isCurrentAccountGeneration(listenerGeneration, listenerStableId)');
    expect(listenerBody).toContain('writeVipSnapshotForAccount(listenerStableId,');
    expect(listenerBody.indexOf('if (!isListenerCurrent()) return;')).toBeLessThan(
      listenerBody.indexOf('writeVipSnapshotForAccount(listenerStableId,'),
    );
    expect(listenerBody).toContain('premiumAccountTransitionActiveRef.current');
  });

  it('discards stale reload completion and resolves access only after RevenueCat confirms the new identity', () => {
    const reloadStart = source.indexOf('const runReload = useCallback');
    const reloadBody = source.slice(reloadStart, source.indexOf('const reload = useCallback', reloadStart));
    const publicReloadBody = source.slice(
      source.indexOf('const reload = useCallback', reloadStart),
      source.indexOf('const runReloadAfterCloudRefresh', reloadStart),
    );

    expect(reloadBody).toContain('const reloadEpoch = premiumReloadEpochRef.current');
    expect(reloadBody).toContain('isReloadCurrent');
    expect(reloadBody).toContain('syncRevenueCatIdentity(isReloadCurrent)');
    expect(reloadBody).toContain('if (!identityReady || !isReloadCurrent()) return;');
    expect(reloadBody).toContain('resolvedReloadEpochRef.current = reloadEpoch');
    expect(publicReloadBody).toContain('resolvedReloadEpochRef.current === requestedEpoch');
    expect(publicReloadBody).toContain('setAccessResolved(true)');
  });
});

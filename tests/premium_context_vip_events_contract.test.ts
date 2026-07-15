import fs from 'fs';
import path from 'path';

describe('PremiumContext VIP event contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');

  it('treats unscoped VIP activation events as account-scoped refresh hints, not grants', () => {
    const start = source.indexOf("onAppEvent('vip_activated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('vip_deactivated'", start));

    expect(body).toContain('refreshEntitlementsFromUnscopedEvent()');
    expect(body).not.toContain('setIsVip(true)');
    expect(body).not.toContain('setHasPremiumAccess(true)');
    expect(body).not.toContain('syncPublicProfileSnapshot');
  });

  it('treats unscoped VIP revocation events as refresh hints instead of mutating another account', () => {
    const start = source.indexOf("onAppEvent('vip_deactivated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('return () =>', start));

    expect(body).toContain('refreshEntitlementsFromUnscopedEvent()');
    expect(body).not.toContain('setIsVip(false)');
    expect(body).not.toContain('setHasPremiumAccess(isPremium)');
    expect(body).not.toContain('syncPublicProfileSnapshot');
  });

  it('exposes intro full access separately from real Premium and VIP', () => {
    expect(source).toContain('isIntroFullAccess');
    expect(source).toContain('introFullAccessEndsAt');
    expect(source).toContain('getIntroFullAccessState');
    // Доступ собирается из real/vip/intro и подарка лояльности (loyaltyState.active).
    expect(source).toContain('setHasPremiumAccess(realPremium || vip || introState.active || loyaltyState.active)');
    expect(source).toContain("onAppEvent('intro_full_access_changed'");
  });

  it('exposes loyalty gift as a separate derived access source', () => {
    expect(source).toContain('getLoyaltyGiftState');
    expect(source).toContain("onAppEvent('loyalty_gift_changed'");
  });

  it('handles every fire-and-forget public profile write rejection', () => {
    const callCount = source.match(/syncPublicProfileSnapshot\(/g)?.length ?? 0;
    const caughtCallCount = source.match(
      /await syncPublicProfileSnapshot\([\s\S]*?\)\.catch\(\(\) => \{\}\);/g,
    )?.length ?? 0;
    expect(callCount).toBeGreaterThan(0);
    expect(caughtCallCount).toBe(callCount);
  });

  it('clears in-memory entitlement state immediately when account deletion completes locally', () => {
    const start = source.indexOf("onAppEvent('account_deleted'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('loyalty_gift_changed'", start));

    expect(body).toContain('invalidatePremiumCache()');
    expect(body).toContain('vipSnapshotStateRef.current = false');
    expect(body).toContain('setIsPremium(false)');
    expect(body).toContain('setIsVip(false)');
    expect(body).toContain('setHasPremiumAccess(false)');
    expect(body).toContain('setIsIntroFullAccess(false)');
    expect(body).toContain("emitAppEvent('premium_access_changed', { active: false, source: 'none' })");
  });

  it('uses account generation as a synchronous privacy boundary', () => {
    expect(source).toContain('subscribeAccountGeneration(handleAccountGeneration)');
    const start = source.indexOf("if (token.phase === 'transitioning')");
    const end = source.indexOf('accountTransitionRef.current = false;', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);

    expect(body).toContain('invalidatePremiumCache()');
    expect(body).toContain('setIsPremium(false)');
    expect(body).toContain('setIsVip(false)');
    expect(body).toContain('setHasPremiumAccess(false)');
    expect(body).toContain('setAccessResolved(false)');
    expect(body).toContain('setIsIntroFullAccess(false)');
    expect(body).toContain('setTrialEligible(false)');
  });

  it('never commits an old reload or treats a failed entitlement read as Free', () => {
    expect(source).toContain('accountGenerationRef.current === generation');
    expect(source).toContain('A storage/runtime failure is not proof of Free access.');
    expect(source).toContain('runBoundedPremiumRetrySequence');
    expect(source).toContain('reloadSequencePromiseRef.current');
    expect(source).toContain('if (reloadSequenceGenerationRef.current === generation) return existing;');
    expect(source).toContain('cancelReloadRetryWait()');
    expect(source).toContain("appStateRef.current === 'active'");
    expect(source).toContain('attempt: () => withAccountTransitionLock(async () => {');
    expect(source).toContain('&& !accountTransitionRef.current');
    expect(source).not.toContain('} finally {\n      // A false entitlement is actionable');
  });

  it('listens to the canonical uid returned by the server and rejects stale callbacks', () => {
    expect(source).toContain('ensureStableAuthLinkForStableIdDetailed(uid)');
    expect(source).toContain("db.collection('users').doc(listenerStableUid).onSnapshot");
    expect(source).toContain('if (!listenerIsCurrent()) return;');
  });

  it('serializes VIP persistence with account wipe and rejects a crossed account write', () => {
    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('const persistedForCurrentAccount = await withAccountTransitionLock(async () => {');
    const lockStart = source.indexOf('const persistedForCurrentAccount = await withAccountTransitionLock(async () => {');
    const lockEnd = source.indexOf('if (!persistedForCurrentAccount) return;', lockStart);
    expect(source.slice(lockStart, lockEnd)).toContain('processVipGrantForCelebration');
    expect(source).toContain('if (!persistedForCurrentAccount) return;');
  });

  it('bounds transient listener retries, stops permanent mismatch, and prevents concurrent starts', () => {
    expect(source).toContain('getPremiumListenerLinkAction(linked, listenerRetryAttempt)');
    expect(source).toContain("if (linkAction === 'stop') return;");
    expect(source).toContain('listenerRetryAttempt >= PREMIUM_LISTENER_MAX_RETRY_ATTEMPTS');
    expect(source).toContain('premiumRetryDelayMs(');
    expect(source).toContain('if (startInFlight) return startInFlight;');
    expect(source).toContain("appStateRef.current === 'active'");
  });

  it('retries unresolved access on the shared online signal without adding a probe or resolved load', () => {
    expect(source).toContain("import { subscribeNetStatus } from '../app/net_status';");
    expect(source).toContain('if (accessResolved) return;');
    expect(source).toContain('const unsubscribe = subscribeNetStatus((online) => {');
    expect(source).toContain('shouldRetryUnresolvedPremiumOnNetworkSignal({');
    expect(source).not.toContain('checkOnlineNow');
  });

  it('does not let unscoped premium events grant or revoke current-account access directly', () => {
    const activatedStart = source.indexOf("onAppEvent('premium_activated'");
    const activatedBody = source.slice(activatedStart, source.indexOf('return () => sub.remove()', activatedStart));
    expect(activatedBody).toContain('refreshEntitlementsFromUnscopedEvent');
    expect(activatedBody).not.toContain('setIsPremium(true)');
    expect(activatedBody).not.toContain('setHasPremiumAccess(true)');

    const deactivatedStart = source.indexOf("onAppEvent('premium_deactivated'");
    const deactivatedBody = source.slice(deactivatedStart, source.indexOf('return () => sub.remove()', deactivatedStart));
    expect(deactivatedBody).toContain('refreshEntitlementsFromUnscopedEvent');
    expect(deactivatedBody).not.toContain('setIsPremium(false)');
    expect(deactivatedBody).not.toContain('setHasPremiumAccess(isVip)');
  });
});

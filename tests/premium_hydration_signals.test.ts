import fs from 'fs';
import path from 'path';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  ensureAccountGeneration,
} from '../app/account_generation';
import {
  patchAppSnapshot,
  resetAppSnapshotForAccountSwitch,
} from '../app/app_snapshot_store';
import {
  applyPremiumHydrationSignal,
  subscribePremiumHydrationSignals,
} from '../app/premium_hydration_signals';

describe('premium hydration signals', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetAppSnapshotForAccountSwitch();
  });

  it('notifies a mounted provider when account generation becomes active', () => {
    const onSignal = jest.fn();
    const subscription = subscribePremiumHydrationSignals(onSignal);
    onSignal.mockClear();

    beginAccountGeneration('paid-account');

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
      initial: false,
      accountToken: expect.objectContaining({
        phase: 'active',
        stableId: 'paid-account',
      }),
    }));
    subscription.remove();
  });

  it('notifies after entitlement snapshot hydration and ignores unrelated profile patches', () => {
    beginAccountGeneration('paid-account');
    const onSignal = jest.fn();
    const subscription = subscribePremiumHydrationSignals(onSignal);
    onSignal.mockClear();

    const profile = {
      source: 'storage' as const,
      updatedAt: 100,
      name: 'Ada',
      avatar: '1',
      frame: '',
      totalXp: 10,
      level: 1,
      premiumActive: true,
      premiumPlan: 'monthly',
      vipActive: false,
    };
    patchAppSnapshot({ profile });
    patchAppSnapshot({ profile: { ...profile, updatedAt: 101, name: 'Ada Lovelace' } });

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
      initial: false,
      entitlementProfile: expect.objectContaining({
        premiumActive: true,
        premiumPlan: 'monthly',
        vipActive: false,
      }),
    }));
    subscription.remove();
  });

  it('coalesces already-active identity and hydrated entitlement into one initial signal', () => {
    ensureAccountGeneration('already-ready');
    patchAppSnapshot({
      profile: {
        source: 'storage',
        updatedAt: 100,
        name: 'Ada',
        avatar: '1',
        frame: '',
        totalXp: 10,
        level: 1,
        premiumActive: false,
        vipActive: true,
        vipLifetime: true,
      },
    });
    const onSignal = jest.fn();
    const subscription = subscribePremiumHydrationSignals(onSignal);

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
      initial: true,
      accountToken: expect.objectContaining({ stableId: 'already-ready' }),
      entitlementProfile: expect.objectContaining({ vipActive: true }),
    }));

    // Idempotent identity reads and entitlement-equivalent profile updates do
    // not schedule another provider reload or listener restart.
    ensureAccountGeneration('already-ready');
    patchAppSnapshot({
      profile: {
        ...getProfile(),
        updatedAt: 101,
        name: 'Ada Lovelace',
      },
    });
    expect(onSignal).toHaveBeenCalledTimes(1);
    subscription.remove();
  });

  it('applies one startup invalidation and reload without restarting the listener', () => {
    const actions = {
      invalidateStartup: jest.fn(),
      resetForAccountTransition: jest.fn(),
      invalidateForSnapshot: jest.fn(),
      restartListener: jest.fn(),
      reload: jest.fn(),
    };

    applyPremiumHydrationSignal({
      initial: true,
      accountToken: beginAccountGeneration('already-ready'),
      entitlementProfile: getProfile(),
    }, actions);

    expect(actions.invalidateStartup).toHaveBeenCalledTimes(1);
    expect(actions.resetForAccountTransition).not.toHaveBeenCalled();
    expect(actions.invalidateForSnapshot).not.toHaveBeenCalled();
    expect(actions.restartListener).not.toHaveBeenCalled();
    expect(actions.reload).toHaveBeenCalledTimes(1);
  });

  it('keeps access unresolved until account generation is active with a stable id', () => {
    const actions = {
      invalidateStartup: jest.fn(),
      resetForAccountTransition: jest.fn(),
      invalidateForSnapshot: jest.fn(),
      restartListener: jest.fn(),
      reload: jest.fn(),
    };
    const subscription = subscribePremiumHydrationSignals((signal) => {
      applyPremiumHydrationSignal(signal, actions);
    });

    expect(actions.invalidateStartup).not.toHaveBeenCalled();
    expect(actions.reload).not.toHaveBeenCalled();

    patchAppSnapshot({ profile: getProfile() });
    expect(actions.invalidateForSnapshot).not.toHaveBeenCalled();
    expect(actions.reload).not.toHaveBeenCalled();

    beginAccountGeneration('paid-account');
    expect(actions.resetForAccountTransition).toHaveBeenCalledTimes(1);
    expect(actions.restartListener).toHaveBeenCalledTimes(1);
    expect(actions.reload).toHaveBeenCalledTimes(1);

    patchAppSnapshot({ profile: { ...getProfile(), updatedAt: 101, name: 'Ada Lovelace' } });
    expect(actions.reload).toHaveBeenCalledTimes(1);
    subscription.remove();
  });

  it('wires both signals to fresh PremiumProvider verification', () => {
    const context = fs.readFileSync(
      path.join(process.cwd(), 'components', 'PremiumContext.tsx'),
      'utf8',
    );
    const subscriptionStart = context.indexOf('subscribePremiumHydrationSignals((signal) => {');
    const subscriptionBlock = context.slice(subscriptionStart, subscriptionStart + 2400);

    expect(subscriptionStart).toBeGreaterThan(-1);
    expect(subscriptionBlock).toContain('applyPremiumHydrationSignal(signal, {');
    expect(subscriptionBlock).toContain('restartListener: () =>');
    expect(subscriptionBlock).toContain('setPremiumListenerRevision');
    expect(subscriptionBlock).toContain('invalidateStartup: () =>');
    expect(subscriptionBlock).toContain('reload: () =>');
  });
});

function getProfile() {
  return {
    source: 'storage' as const,
    updatedAt: 100,
    name: 'Ada',
    avatar: '1',
    frame: '',
    totalXp: 10,
    level: 1,
    premiumActive: false,
    vipActive: true,
    vipLifetime: true,
  };
}

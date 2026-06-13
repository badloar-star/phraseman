import {
  hasOtherWaiters,
  resolveNextOverlay,
  resolveNextOverlayExcluding,
  type OverlayKey,
} from '../components/overlay_arbiter_core';

function wants(...keys: OverlayKey[]): Partial<Record<OverlayKey, boolean>> {
  return Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<OverlayKey, boolean>>;
}

describe('OverlayArbiter queue resolution', () => {
  it('uses priority when no overlay owns the slot yet', () => {
    expect(resolveNextOverlay(null, wants('actionToast', 'achievementToast', 'update'))).toBe('update');
    expect(resolveNextOverlay(null, wants('actionToast', 'achievementToast'))).toBe('achievementToast');
  });

  it('does not preempt an active overlay while it still wants the slot', () => {
    expect(resolveNextOverlay('achievementToast', wants('achievementToast', 'update'))).toBe('achievementToast');
    expect(resolveNextOverlay('actionToast', wants('actionToast', 'themedAlert'))).toBe('actionToast');
  });

  it('advances to the next waiting overlay after the active one releases', () => {
    expect(resolveNextOverlay('achievementToast', wants('actionToast', 'themedAlert'))).toBe('themedAlert');
  });

  it('can route match-found toast through the screen host without sharing root state', () => {
    expect(resolveNextOverlay(null, wants('matchFoundToast', 'matchFoundToastScreen'))).toBe('matchFoundToastScreen');
  });

  it('returns null when nothing is waiting', () => {
    expect(resolveNextOverlay('achievementToast', {})).toBeNull();
    expect(resolveNextOverlay(null, {})).toBeNull();
  });

  it('slots entitlementExpired below streakRevive but above toasts', () => {
    expect(resolveNextOverlay(null, wants('entitlementExpired', 'streakRevive'))).toBe('streakRevive');
    expect(resolveNextOverlay(null, wants('entitlementExpired', 'actionToast', 'achievementToast'))).toBe('entitlementExpired');
    expect(resolveNextOverlay('entitlementExpired', wants('entitlementExpired', 'update'))).toBe('entitlementExpired');
  });
});

describe('OverlayArbiter starvation watchdog (H-ARBITER)', () => {
  it('hasOtherWaiters is false when only the active overlay wants the slot', () => {
    expect(hasOtherWaiters('update', wants('update'))).toBe(false);
    expect(hasOtherWaiters('update', {})).toBe(false);
    expect(hasOtherWaiters(null, {})).toBe(false);
  });

  it('hasOtherWaiters is true when something else is queued behind the holder', () => {
    expect(hasOtherWaiters('update', wants('update', 'achievementToast'))).toBe(true);
    // даже если активного нет, но кто-то ждёт — это «другие желающие»
    expect(hasOtherWaiters(null, wants('achievementToast'))).toBe(true);
  });

  it('resolveNextOverlayExcluding hands the slot to the next waiter past a stuck holder', () => {
    // update залип, но в очереди ждут achievementToast и actionToast → берём по приоритету
    expect(resolveNextOverlayExcluding('update', wants('update', 'achievementToast', 'actionToast'))).toBe('achievementToast');
  });

  it('resolveNextOverlayExcluding returns null when the holder is the only waiter', () => {
    // форсить нечего — владельца не трогаем (solo-модалку юзер просто долго читает)
    expect(resolveNextOverlayExcluding('update', wants('update'))).toBeNull();
    expect(resolveNextOverlayExcluding('update', {})).toBeNull();
  });
});

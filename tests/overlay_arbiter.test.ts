import { resolveNextOverlay, type OverlayKey } from '../components/overlay_arbiter_core';

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
});

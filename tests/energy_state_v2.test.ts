import {
  migrateLegacyEnergyState,
  settleEnergyAcrossRateSegments,
  settleEnergyState,
  timeUntilEnergyAtLeast,
} from '../app/energy_state_v2';

const NOW = 1_800_000_000_000;

describe('energy state v2', () => {
  it('migrates whole and partial legacy slots without losing progress', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 15 * 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 70, recoveryCreditMicrounits: 0 });
  });

  it('carries a non-integer legacy fraction into microunits', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 60, recoveryCreditMicrounits: 666_666 });
  });

  it('settles +1 every six minutes and stops at the active cap', () => {
    const settled = settleEnergyState({
      schemaVersion: 2,
      current: 86,
      lastSettledAt: NOW,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, {
      nowMs: NOW + 14 * 6 * 60_000,
      unitMs: 6 * 60_000,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    });
    expect(settled.state.current).toBe(100);
  });

  it('recovers into the permanent capacity unlocked by a profile card', () => {
    const settled = settleEnergyState({
      schemaVersion: 2,
      current: 100,
      lastSettledAt: NOW,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, {
      nowMs: NOW + 10 * 6 * 60_000,
      unitMs: 6 * 60_000,
      maxEnergy: 110,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    });
    expect(settled.state.current).toBe(110);
  });

  it('calculates exact time to an activity threshold', () => {
    expect(timeUntilEnergyAtLeast({
      current: 8,
      required: 20,
      unitMs: 360_000,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    })).toBe(12 * 360_000);
  });

  it('preserves fractional credit when the recovery rate changes', () => {
    const opening = {
      state: {
        schemaVersion: 2 as const,
        current: 0,
        lastSettledAt: NOW,
        recoveryCreditMicrounits: 0,
        recoveryDivisionRemainder: 0,
      },
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    };
    const settled = settleEnergyAcrossRateSegments(opening, [
      { endAtMs: NOW + 3 * 60_000, unitMs: 6 * 60_000 },
      { endAtMs: NOW + 3 * 60_000 + 18_000, unitMs: 36_000 },
    ]);
    expect(settled.state.current).toBe(1);
  });
});

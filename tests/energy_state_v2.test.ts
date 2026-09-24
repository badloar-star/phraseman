import {
  coerceEnergyStateV2,
  migrateLegacyEnergyState,
  settleEnergyAcrossRateSegments,
  settleEnergyState,
  timeUntilEnergyAtLeast,
} from '../app/energy_state_v2';

const NOW = 1_800_000_000_000;

describe('ene  // PM-081 (BIBLE «Энергия: 5, −1, +1/10мин»; D06): старая шкала 1..5
  // совпадает с новой 0..5 — множитель 1, прошлые ×20 под запас 100 отменены.
  it('migrates whole and partial legacy slots onto the 0..5 scale without losing progress', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 45 * 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 4, recoveryCreditMicrounits: 500_000 });
  });

  it('carries a non-integer legacy fraction into microunits', () => {
    expect(migrateLegacyEnergyState({ current: 3, lastRecoveryTime: NOW - 60_000 }, NOW))
      .toMatchObject({ schemaVersion: 2, current: 3, recoveryCreditMicrounits: 33_333 });
  });

  it('settles recovery and stops at the capacity of 5', () => {
    const settled = settleEnergyState({
      schemaVersion: 2,
      current: 2,
      lastSettledAt: NOW,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, {
      nowMs: NOW + 14 * 10 * 60_000,
      unitMs: 10 * 60_000,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    });
    expect(settled.state.current).toBe(5);
    expect(settled.state.recoveryCreditMicrounits).toBe(0);
  });

  // PM-081 (D07): карточка профиля и лига больше не расширяют запас — даже
  // если вызывающий передаст старый потолок 110, он срезается до 5.
  it('never recovers above 5 even if a caller passes a legacy expanded capacity', () => {
    const settled = settleEnergyState({
      schemaVersion: 2,
      current: 5,
      lastSettledAt: NOW,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, {
      nowMs: NOW + 10 * 10 * 60_000,
      unitMs: 10 * 60_000,
      maxEnergy: 110,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    });
    expect(settled.state.current).toBe(5);
  });

  it('reads a stored pre-2.0 balance above 5 as a full 5 and keeps 0..5 as is', () => {
    const stored = (current: number) => ({
      schemaVersion: 2,
      current,
      lastSettledAt: NOW - 1_000,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    });
    expect(coerceEnergyStateV2(stored(80), NOW)).toMatchObject({ current: 5, lastSettledAt: NOW });
    expect(coerceEnergyStateV2(stored(260), NOW)).toMatchObject({ current: 5 });
    expect(coerceEnergyStateV2(stored(3), NOW)).toMatchObject({ current: 3, lastSettledAt: NOW - 1_000 });
    expect(coerceEnergyStateV2(stored(0), NOW)).toMatchObject({ current: 0 });
  });

ent).toBe(110);
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

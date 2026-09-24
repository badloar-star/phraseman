import { ENERGY_PASSIVE_UNIT_MS } from '../app/energy_contract';
import {
  coerceEnergyStateV2,
  migrateLegacyEnergyState,
  settleEnergyAcrossRateSegments,
  settleEnergyState,
  timeUntilEnergyAtLeast,
} from '../app/energy_state_v2';

const NOW = 1_800_000_000_000;

describe('energy state v2', () => {
  // PM-081 (BIBLE «Энергия: 5, −1, +1/10мин»; D06): старая шкала 1..5
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

  // PM-083 (BIBLE «+1 за 10 минут»; D06): ленивый пересчёт по времени
  // последнего сохранения. Граница 599/600 секунд, остаток интервала,
  // полный запас без «копилки», перевод часов назад и долгий офлайн.
  describe('PM-083 time-based recovery at +1 per 10 minutes', () => {
    const at = (current: number, credit = 0) => ({
      schemaVersion: 2 as const,
      current,
      lastSettledAt: NOW,
      recoveryCreditMicrounits: credit,
      recoveryDivisionRemainder: 0,
    });
    const settle = (state: ReturnType<typeof at>, elapsedMs: number) => settleEnergyState(state, {
      nowMs: NOW + elapsedMs,
      unitMs: ENERGY_PASSIVE_UNIT_MS,
      bonusEnergy: 0,
      bonusCapacity: 0,
      bonusExpiresAt: 0,
    }).state;

    it('uses a 10-minute unit', () => {
      expect(ENERGY_PASSIVE_UNIT_MS).toBe(600_000);
    });

    it('adds nothing at 599 seconds and exactly +1 at 600 seconds', () => {
      expect(settle(at(0), 599_000).current).toBe(0);
      expect(settle(at(0), 600_000).current).toBe(1);
    });

    it('keeps the remainder of the interval instead of rounding it away', () => {
      const after = settle(at(1), 15 * 60_000);
      expect(after.current).toBe(2);
      expect(after.recoveryCreditMicrounits).toBe(500_000);
      expect(timeUntilEnergyAtLeast({
        current: after.current,
        required: after.current + 1,
        unitMs: ENERGY_PASSIVE_UNIT_MS,
        recoveryCreditMicrounits: after.recoveryCreditMicrounits,
        recoveryDivisionRemainder: after.recoveryDivisionRemainder,
      })).toBe(5 * 60_000);
    });

    it('goes from 0 to 5 in 50 minutes and does not bank credit while full', () => {
      expect(settle(at(0), 49 * 60_000).current).toBe(4);
      const full = settle(at(0), 50 * 60_000);
      expect(full.current).toBe(5);
      const later = settle(at(0), 8 * 60 * 60_000);
      expect(later).toMatchObject({ current: 5, recoveryCreditMicrounits: 0, recoveryDivisionRemainder: 0 });
    });

    it('recovers after a long offline gap but never above 5', () => {
      expect(settle(at(2), 3 * 24 * 60 * 60_000).current).toBe(5);
    });

    it('never grants or removes energy when the clock moves backwards', () => {
      const back = settleEnergyState(at(2, 250_000), {
        nowMs: NOW - 60 * 60_000,
        unitMs: ENERGY_PASSIVE_UNIT_MS,
        bonusEnergy: 0,
        bonusCapacity: 0,
        bonusExpiresAt: 0,
      }).state;
      expect(back).toMatchObject({ current: 2, lastSettledAt: NOW, recoveryCreditMicrounits: 250_000 });
    });
  });
});

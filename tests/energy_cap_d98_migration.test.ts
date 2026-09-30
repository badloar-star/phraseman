import { ENERGY_BASE_CAPACITY } from '../app/energy_contract';
import { coerceEnergyStateV2 } from '../app/energy_state_v2';

// D98 (PM-089): запас энергии > 5 при обновлении обрезается до 5 — один раз,
// идемпотентно, с логом [ENERGY-CAP].
describe('D98: energy above the cap is clamped to 5 on update', () => {
  const now = 1_800_000_000_000;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warnSpy.mockRestore());

  it.each([6, 100, 260])('stored %i becomes exactly 5 and is logged', (stored) => {
    const migrated = coerceEnergyStateV2({
      schemaVersion: 2,
      current: stored,
      lastSettledAt: now - 60_000,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, now);

    expect(migrated.current).toBe(ENERGY_BASE_CAPACITY);
    expect(warnSpy.mock.calls.some(([line]) => String(line).includes('[ENERGY-CAP] D98 migration'))).toBe(true);
  });

  it('is idempotent: the migrated state reads back unchanged and without a migration log', () => {
    const migrated = coerceEnergyStateV2({
      schemaVersion: 2,
      current: 100,
      lastSettledAt: now - 60_000,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    }, now);
    warnSpy.mockClear();

    const again = coerceEnergyStateV2(JSON.parse(JSON.stringify(migrated)), now + 1_000);

    expect(again).toEqual(migrated);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('keeps values 0..5 exactly as stored (no free refill)', () => {
    for (const stored of [0, 1, 3, 5]) {
      const state = coerceEnergyStateV2({
        schemaVersion: 2,
        current: stored,
        lastSettledAt: now - 60_000,
        recoveryCreditMicrounits: 0,
        recoveryDivisionRemainder: 0,
      }, now);
      expect(state.current).toBe(stored);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

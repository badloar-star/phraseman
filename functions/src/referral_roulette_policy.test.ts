import {
  REFERRAL_LEDGER_ROLLOUT_AT_MS,
  SEVEN_DAYS_MS,
  THIRTY_DAYS_MS,
  attributionDeadlineMs,
  canConsumeCreditSource,
  canCreateNewReferral,
  canQualifyAt,
  existingQualifiedDrainEligible,
  legacyCreditExpiryMs,
  referralRoulettePolicyFromData,
} from './referral_roulette_policy';

const CREATED = Date.parse('2026-07-20T12:00:00.000Z');
const OFF = Date.parse('2026-07-22T12:00:00.000Z');

describe('referral roulette soft-sunset policy', () => {
  test('uses compatibility defaults for missing flags', () => {
    expect(referralRoulettePolicyFromData({ numbers: {} })).toEqual({
      softEnabled: true,
      emergencyStop: false,
      softOffAtMs: 0,
    });
  });

  test('parses explicit soft off and emergency stop independently', () => {
    expect(referralRoulettePolicyFromData({
      numbers: {
        referral_roulette_enabled: false,
        referral_roulette_emergency_stop: true,
        referral_roulette_soft_off_at_ms: String(OFF),
      },
    })).toEqual({ softEnabled: false, emergencyStop: true, softOffAtMs: OFF });
  });

  test('soft off closes new referral admission', () => {
    expect(canCreateNewReferral({ softEnabled: false, emergencyStop: false, softOffAtMs: OFF })).toBe(false);
    expect(canCreateNewReferral({ softEnabled: true, emergencyStop: false, softOffAtMs: 0 })).toBe(true);
  });

  test('grandfather qualification includes the exact seven-day deadline', () => {
    const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
    expect(canQualifyAt(policy, CREATED, CREATED + SEVEN_DAYS_MS)).toBe(true);
    expect(canQualifyAt(policy, CREATED, CREATED + SEVEN_DAYS_MS + 1)).toBe(false);
    expect(attributionDeadlineMs(CREATED)).toBe(CREATED + SEVEN_DAYS_MS);
  });

  test('soft off does not grandfather attributions created after cutoff', () => {
    const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
    expect(canQualifyAt(policy, OFF + 1, OFF + 2)).toBe(false);
  });

  test('emergency stop blocks qualification even while soft switch is on', () => {
    expect(canQualifyAt(
      { softEnabled: true, emergencyStop: true, softOffAtMs: 0 },
      CREATED,
      CREATED + 1,
    )).toBe(false);
  });

  test('already-qualified rows drain if earned before off or within grandfather deadline', () => {
    const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
    expect(existingQualifiedDrainEligible({ createdAtMs: CREATED, qualifiedAtMs: OFF - 1 }, policy)).toBe(true);
    expect(existingQualifiedDrainEligible({ createdAtMs: CREATED, qualifiedAtMs: CREATED + SEVEN_DAYS_MS }, policy)).toBe(true);
    expect(existingQualifiedDrainEligible({ createdAtMs: CREATED, qualifiedAtMs: CREATED + SEVEN_DAYS_MS + 1 }, policy)).toBe(false);
    expect(existingQualifiedDrainEligible({ createdAtMs: CREATED, qualifiedAtMs: 0 }, policy)).toBe(true);
  });

  test('legacy aggregate grace has one rollout anchor, never first-touch time', () => {
    expect(REFERRAL_LEDGER_ROLLOUT_AT_MS).toBe(Date.parse('2026-07-22T00:00:00.000Z'));
    expect(legacyCreditExpiryMs()).toBe(REFERRAL_LEDGER_ROLLOUT_AT_MS + THIRTY_DAYS_MS);
  });

  test('dev credits cannot create production drain rights after soft off', () => {
    expect(canConsumeCreditSource(true, 'dev_grant')).toBe(true);
    expect(canConsumeCreditSource(false, 'dev_grant')).toBe(false);
    expect(canConsumeCreditSource(false, 'referral')).toBe(true);
    expect(canConsumeCreditSource(false, 'legacy_aggregate')).toBe(true);
  });
});

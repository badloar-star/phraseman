import { DAY_MS, type ReferralRoulettePolicy } from './referral_roulette_policy';
import { summarizeReferralAdminDrain } from './referral_admin_drain_metrics';
import {
  referralSoftToggleReplayResult,
  resolveReferralSoftOffAtMs,
} from './referral_admin_soft_toggle';

describe('referral admin drain metrics', () => {
  test('soft-toggle replay returns the stored result byte-for-byte and never recomputes its cutoff', () => {
    const stored = {
      enabled: false,
      softOffAtMs: 1_234_567,
      auditId: 'audit-original',
    };
    expect(referralSoftToggleReplayResult(stored)).toEqual({
      ok: true,
      enabled: false,
      softOffAtMs: 1_234_567,
      auditId: 'audit-original',
      replayed: true,
    });
    expect(resolveReferralSoftOffAtMs({
      enabled: false,
      beforeEnabled: false,
      beforeSoftOffAtMs: 1_234_567,
      nowMs: 9_999_999,
    })).toBe(1_234_567);
  });

  test('soft-off health counts only live grandfather obligations and production credits', () => {
    const nowMs = 12 * DAY_MS;
    const policy: ReferralRoulettePolicy = {
      softEnabled: false,
      emergencyStop: false,
      softOffAtMs: 10 * DAY_MS,
    };

    const result = summarizeReferralAdminDrain({
      policy,
      nowMs,
      attributions: [
        { status: 'pending', createdAtMs: 6 * DAY_MS },
        { status: 'pending', createdAtMs: 1 * DAY_MS },
        { status: 'pending', createdAtMs: 11 * DAY_MS },
        { status: 'qualified', createdAtMs: 6 * DAY_MS, qualifiedAtMs: 11 * DAY_MS },
        { status: 'qualified', createdAtMs: 6 * DAY_MS, qualifiedAtMs: 14 * DAY_MS },
        { status: 'skipped_referrer_cap', createdAtMs: 7 * DAY_MS, qualifiedAtMs: 0 },
        { status: 'qualified', createdAtMs: 11 * DAY_MS, qualifiedAtMs: 11 * DAY_MS },
      ],
      credits: [
        { status: 'available', source: 'referral', expiresAtMs: nowMs + DAY_MS },
        { status: 'available', source: 'legacy_aggregate', expiresAtMs: nowMs + 2 * DAY_MS },
        { status: 'available', source: 'dev_grant', expiresAtMs: nowMs + DAY_MS },
        { status: 'available', source: 'referral', expiresAtMs: nowMs },
        { status: 'consumed', source: 'referral', expiresAtMs: nowMs + DAY_MS },
      ],
    });

    expect(result).toEqual({
      pendingAttributions: 1,
      qualifiedAwaitingCredit: 2,
      availableLedgerCredits: 3,
      latestGrandfatherDeadlineMs: 13 * DAY_MS,
      earliestCreditExpiryMs: nowMs,
    });
  });
});

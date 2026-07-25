"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_admin_drain_metrics_1 = require("./referral_admin_drain_metrics");
const referral_admin_soft_toggle_1 = require("./referral_admin_soft_toggle");
describe('referral admin drain metrics', () => {
    test('soft-toggle replay returns the stored result byte-for-byte and never recomputes its cutoff', () => {
        const stored = {
            enabled: false,
            softOffAtMs: 1234567,
            auditId: 'audit-original',
        };
        expect((0, referral_admin_soft_toggle_1.referralSoftToggleReplayResult)(stored)).toEqual({
            ok: true,
            enabled: false,
            softOffAtMs: 1234567,
            auditId: 'audit-original',
            replayed: true,
        });
        expect((0, referral_admin_soft_toggle_1.resolveReferralSoftOffAtMs)({
            enabled: false,
            beforeEnabled: false,
            beforeSoftOffAtMs: 1234567,
            nowMs: 9999999,
        })).toBe(1234567);
    });
    test('soft-off health counts only live grandfather obligations and production credits', () => {
        const nowMs = 12 * referral_roulette_policy_1.DAY_MS;
        const policy = {
            softEnabled: false,
            emergencyStop: false,
            softOffAtMs: 10 * referral_roulette_policy_1.DAY_MS,
        };
        const result = (0, referral_admin_drain_metrics_1.summarizeReferralAdminDrain)({
            policy,
            nowMs,
            attributions: [
                { status: 'pending', createdAtMs: 6 * referral_roulette_policy_1.DAY_MS },
                { status: 'pending', createdAtMs: 1 * referral_roulette_policy_1.DAY_MS },
                { status: 'pending', createdAtMs: 11 * referral_roulette_policy_1.DAY_MS },
                { status: 'qualified', createdAtMs: 6 * referral_roulette_policy_1.DAY_MS, qualifiedAtMs: 11 * referral_roulette_policy_1.DAY_MS },
                { status: 'qualified', createdAtMs: 6 * referral_roulette_policy_1.DAY_MS, qualifiedAtMs: 14 * referral_roulette_policy_1.DAY_MS },
                { status: 'skipped_referrer_cap', createdAtMs: 7 * referral_roulette_policy_1.DAY_MS, qualifiedAtMs: 0 },
                { status: 'qualified', createdAtMs: 11 * referral_roulette_policy_1.DAY_MS, qualifiedAtMs: 11 * referral_roulette_policy_1.DAY_MS },
            ],
            credits: [
                { status: 'available', source: 'referral', expiresAtMs: nowMs + referral_roulette_policy_1.DAY_MS },
                { status: 'available', source: 'legacy_aggregate', expiresAtMs: nowMs + 2 * referral_roulette_policy_1.DAY_MS },
                { status: 'available', source: 'dev_grant', expiresAtMs: nowMs + referral_roulette_policy_1.DAY_MS },
                { status: 'available', source: 'referral', expiresAtMs: nowMs },
                { status: 'consumed', source: 'referral', expiresAtMs: nowMs + referral_roulette_policy_1.DAY_MS },
            ],
        });
        expect(result).toEqual({
            pendingAttributions: 1,
            qualifiedAwaitingCredit: 2,
            availableLedgerCredits: 3,
            latestGrandfatherDeadlineMs: 13 * referral_roulette_policy_1.DAY_MS,
            earliestCreditExpiryMs: nowMs,
        });
    });
});
//# sourceMappingURL=referral_admin_drain_metrics.test.js.map
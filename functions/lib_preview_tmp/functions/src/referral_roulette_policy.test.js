"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const CREATED = Date.parse('2026-07-20T12:00:00.000Z');
const OFF = Date.parse('2026-07-22T12:00:00.000Z');
describe('referral roulette soft-sunset policy', () => {
    test('uses compatibility defaults for missing flags', () => {
        expect((0, referral_roulette_policy_1.referralRoulettePolicyFromData)({ numbers: {} })).toEqual({
            softEnabled: true,
            emergencyStop: false,
            softOffAtMs: 0,
        });
    });
    test('parses explicit soft off and emergency stop independently', () => {
        expect((0, referral_roulette_policy_1.referralRoulettePolicyFromData)({
            numbers: {
                referral_roulette_enabled: false,
                referral_roulette_emergency_stop: true,
                referral_roulette_soft_off_at_ms: String(OFF),
            },
        })).toEqual({ softEnabled: false, emergencyStop: true, softOffAtMs: OFF });
    });
    test('soft off closes new referral admission', () => {
        expect((0, referral_roulette_policy_1.canCreateNewReferral)({ softEnabled: false, emergencyStop: false, softOffAtMs: OFF })).toBe(false);
        expect((0, referral_roulette_policy_1.canCreateNewReferral)({ softEnabled: true, emergencyStop: false, softOffAtMs: 0 })).toBe(true);
    });
    test('grandfather qualification includes the exact seven-day deadline', () => {
        const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
        expect((0, referral_roulette_policy_1.canQualifyAt)(policy, CREATED, CREATED + referral_roulette_policy_1.SEVEN_DAYS_MS)).toBe(true);
        expect((0, referral_roulette_policy_1.canQualifyAt)(policy, CREATED, CREATED + referral_roulette_policy_1.SEVEN_DAYS_MS + 1)).toBe(false);
        expect((0, referral_roulette_policy_1.attributionDeadlineMs)(CREATED)).toBe(CREATED + referral_roulette_policy_1.SEVEN_DAYS_MS);
    });
    test('soft off does not grandfather attributions created after cutoff', () => {
        const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
        expect((0, referral_roulette_policy_1.canQualifyAt)(policy, OFF + 1, OFF + 2)).toBe(false);
    });
    test('emergency stop blocks qualification even while soft switch is on', () => {
        expect((0, referral_roulette_policy_1.canQualifyAt)({ softEnabled: true, emergencyStop: true, softOffAtMs: 0 }, CREATED, CREATED + 1)).toBe(false);
    });
    test('already-qualified rows drain if earned before off or within grandfather deadline', () => {
        const policy = { softEnabled: false, emergencyStop: false, softOffAtMs: OFF };
        expect((0, referral_roulette_policy_1.existingQualifiedDrainEligible)({ createdAtMs: CREATED, qualifiedAtMs: OFF - 1 }, policy)).toBe(true);
        expect((0, referral_roulette_policy_1.existingQualifiedDrainEligible)({ createdAtMs: CREATED, qualifiedAtMs: CREATED + referral_roulette_policy_1.SEVEN_DAYS_MS }, policy)).toBe(true);
        expect((0, referral_roulette_policy_1.existingQualifiedDrainEligible)({ createdAtMs: CREATED, qualifiedAtMs: CREATED + referral_roulette_policy_1.SEVEN_DAYS_MS + 1 }, policy)).toBe(false);
        expect((0, referral_roulette_policy_1.existingQualifiedDrainEligible)({ createdAtMs: CREATED, qualifiedAtMs: 0 }, policy)).toBe(true);
    });
    test('legacy aggregate grace has one rollout anchor, never first-touch time', () => {
        expect(referral_roulette_policy_1.REFERRAL_LEDGER_ROLLOUT_AT_MS).toBe(Date.parse('2026-07-22T00:00:00.000Z'));
        expect((0, referral_roulette_policy_1.legacyCreditExpiryMs)()).toBe(referral_roulette_policy_1.REFERRAL_LEDGER_ROLLOUT_AT_MS + referral_roulette_policy_1.THIRTY_DAYS_MS);
    });
    test('dev credits cannot create production drain rights after soft off', () => {
        expect((0, referral_roulette_policy_1.canConsumeCreditSource)(true, 'dev_grant')).toBe(true);
        expect((0, referral_roulette_policy_1.canConsumeCreditSource)(false, 'dev_grant')).toBe(false);
        expect((0, referral_roulette_policy_1.canConsumeCreditSource)(false, 'referral')).toBe(true);
        expect((0, referral_roulette_policy_1.canConsumeCreditSource)(false, 'legacy_aggregate')).toBe(true);
    });
});
//# sourceMappingURL=referral_roulette_policy.test.js.map
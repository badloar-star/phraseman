"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
function row(id, earnedAtMs, expiresAtMs, source = 'referral') {
    return { id, ownerStableId: 'owner', source, earnedAtMs, expiresAtMs, status: 'available' };
}
describe('referral spin credit ledger', () => {
    test('keeps a credit available through its exact expiry millisecond', () => {
        const result = (0, referral_spin_ledger_1.reconcileLedgerRows)([
            row('boundary-valid', 10, 50),
            row('new-valid', 40, 110),
            row('old-valid', 30, 100),
            { ...row('already-used', 5, 200), status: 'consumed' },
        ], 50, { softEnabled: true });
        expect(result.expiredIds).toEqual([]);
        expect(result.oldestValid?.id).toBe('boundary-valid');
        expect(result.availableCount).toBe(3);
        expect(result.earliestExpiryMs).toBe(50);
    });
    test('expires and retains a credit for audit one millisecond after expiry', () => {
        const result = (0, referral_spin_ledger_1.reconcileLedgerRows)([
            row('just-expired', 10, 50),
            row('valid', 20, 100),
        ], 51, { softEnabled: true });
        expect(result.expiredIds).toEqual(['just-expired']);
        expect(result.oldestValid?.id).toBe('valid');
        expect(result.availableCount).toBe(1);
    });
    test('excludes dev grants from soft-off drain without expiring them', () => {
        const result = (0, referral_spin_ledger_1.reconcileLedgerRows)([
            row('dev-oldest', 10, 100, 'dev_grant'),
            row('referral-next', 20, 110, 'referral'),
        ], 50, { softEnabled: false });
        expect(result.expiredIds).toEqual([]);
        expect(result.oldestValid?.id).toBe('referral-next');
        expect(result.availableCount).toBe(1);
    });
    test('reconciles an expired row before adding a newly earned claim credit', () => {
        const result = (0, referral_spin_ledger_1.reconcileLedgerRowsForClaim)([
            row('expired-before-claim', 10, 50),
            row('still-available', 20, 120),
        ], 51, { softEnabled: true }, 1);
        expect(result.expiredIds).toEqual(['expired-before-claim']);
        expect(result.availableCountAfterClaim).toBe(2);
    });
    test('uses a deterministic credit id for claim replay', () => {
        expect((0, referral_spin_ledger_1.referralCreditId)('invite-a')).toBe((0, referral_spin_ledger_1.referralCreditId)('invite-a'));
        expect((0, referral_spin_ledger_1.referralCreditId)('invite-a')).not.toBe((0, referral_spin_ledger_1.referralCreditId)('invite-b'));
        expect((0, referral_spin_ledger_1.referralCreditId)('invite-a')).toMatch(/^referral_[a-f0-9]{40}$/);
    });
    test('builds a 30-day referral credit from server-earned time', () => {
        expect((0, referral_spin_ledger_1.buildAvailableCredit)({
            id: 'credit-a',
            ownerStableId: 'owner',
            source: 'referral',
            attributionId: 'invite-a',
            earnedAtMs: 1000,
        })).toMatchObject({
            id: 'credit-a',
            ownerStableId: 'owner',
            source: 'referral',
            attributionId: 'invite-a',
            earnedAtMs: 1000,
            expiresAtMs: 1000 + referral_roulette_policy_1.THIRTY_DAYS_MS,
            status: 'available',
        });
    });
    test('anchors all migrated aggregate credits to rollout rather than first touch', () => {
        const firstTouchA = (0, referral_spin_ledger_1.buildLegacyCreditRows)('owner', 2);
        const firstTouchB = (0, referral_spin_ledger_1.buildLegacyCreditRows)('owner', 2);
        expect(firstTouchA).toEqual(firstTouchB);
        expect(firstTouchA.map((credit) => credit.expiresAtMs)).toEqual([
            referral_roulette_policy_1.REFERRAL_LEDGER_ROLLOUT_AT_MS + referral_roulette_policy_1.THIRTY_DAYS_MS,
            referral_roulette_policy_1.REFERRAL_LEDGER_ROLLOUT_AT_MS + referral_roulette_policy_1.THIRTY_DAYS_MS,
        ]);
        expect(firstTouchA.map((credit) => credit.id)).toEqual(['legacy_000001', 'legacy_000002']);
    });
    test('fails explicitly instead of truncating a migration too large for one transaction', () => {
        expect(() => (0, referral_spin_ledger_1.buildLegacyCreditRows)('owner', referral_spin_ledger_1.MAX_LEGACY_CREDITS_PER_TRANSACTION + 1))
            .toThrow('LEGACY_CREDIT_MIGRATION_TOO_LARGE');
    });
    test('server-owned ledger state, not a downgradeable progress marker, decides migration', () => {
        expect((0, referral_spin_ledger_1.shouldMigrateLegacyAggregate)({
            migrationMarkerExists: true,
            anyLedgerDocumentExists: true,
        })).toBe(false);
        expect((0, referral_spin_ledger_1.shouldMigrateLegacyAggregate)({
            migrationMarkerExists: false,
            anyLedgerDocumentExists: true,
        })).toBe(false);
        expect((0, referral_spin_ledger_1.shouldMigrateLegacyAggregate)({
            migrationMarkerExists: false,
            anyLedgerDocumentExists: false,
        })).toBe(true);
    });
});
//# sourceMappingURL=referral_spin_ledger.test.js.map
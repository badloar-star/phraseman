"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const https_1 = require("firebase-functions/v2/https");
const referral_dev_grant_policy_1 = require("./referral_dev_grant_policy");
describe('referral dev grant acquisition policy', () => {
    test('keeps DEV grants unlimited without weakening server authorization gates', () => {
        const source = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'referral_dev_grant.ts'), 'utf8');
        const client = node_fs_1.default.readFileSync(node_path_1.default.resolve(__dirname, '..', '..', 'app', 'roulette_spin_client.ts'), 'utf8');
        const screen = node_fs_1.default.readFileSync(node_path_1.default.resolve(__dirname, '..', '..', 'app', 'referrals.tsx'), 'utf8');
        const transactionBody = source.slice(source.indexOf('return db.runTransaction(async (tx)'));
        const transactionalDevGate = transactionBody.indexOf('configData?.numbers?.referral_dev_grant_enabled !== true');
        const firstWrite = transactionBody.indexOf('tx.create(');
        expect(source).toContain("throw new HttpsError('unauthenticated', 'Auth required')");
        expect(source).toContain('await assertAuthStableLink(db, authUid, stableId)');
        expect(source).toContain('await isDevGrantEnabled(db)');
        expect(transactionalDevGate).toBeGreaterThan(0);
        expect(firstWrite).toBeGreaterThan(transactionalDevGate);
        expect(source).not.toContain('MAX_GRANTS_PER_DAY');
        expect(source).not.toContain('referral_dev_grants_daily');
        expect(source).not.toContain('DEV_GRANT_DAILY_LIMIT');
        expect(client).not.toContain("reason: 'daily_limit'");
        expect(client).not.toContain('DEV_GRANT_DAILY_LIMIT');
        expect(screen).not.toContain("res.reason === 'daily_limit'");
        expect(screen).not.toContain('лимит 10 ключей в сутки');
    });
    test('allows issuance only while roulette acquisition is enabled', () => {
        expect(() => (0, referral_dev_grant_policy_1.assertReferralDevGrantAcquisitionAllowed)({
            softEnabled: true,
            emergencyStop: false,
        })).not.toThrow();
    });
    test('fails closed during emergency stop', () => {
        let thrown;
        try {
            (0, referral_dev_grant_policy_1.assertReferralDevGrantAcquisitionAllowed)({ softEnabled: true, emergencyStop: true });
        }
        catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(https_1.HttpsError);
        expect(thrown).toMatchObject({
            code: 'failed-precondition',
            message: 'REFERRAL_ROULETTE_EMERGENCY_STOP',
        });
    });
    test('fails closed under soft sunset even when the separate dev flag is enabled', () => {
        let thrown;
        try {
            (0, referral_dev_grant_policy_1.assertReferralDevGrantAcquisitionAllowed)({ softEnabled: false, emergencyStop: false });
        }
        catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(https_1.HttpsError);
        expect(thrown).toMatchObject({
            code: 'failed-precondition',
            message: 'REFERRAL_ROULETTE_SOFT_SUNSET',
        });
    });
    test('expires existing rows and derives the post-grant aggregate from the ledger', () => {
        const result = (0, referral_dev_grant_policy_1.reconcileDevGrantLedger)([
            {
                id: 'expired', ownerStableId: 'owner', source: 'referral', status: 'available',
                earnedAtMs: 1, expiresAtMs: 49,
            },
            {
                id: 'boundary', ownerStableId: 'owner', source: 'dev_grant', status: 'available',
                earnedAtMs: 2, expiresAtMs: 50,
            },
            {
                id: 'used', ownerStableId: 'owner', source: 'referral', status: 'consumed',
                earnedAtMs: 3, expiresAtMs: 100,
            },
        ], 50);
        expect(result.expiredIds).toEqual(['expired']);
        expect(result.spinsTotalAfterGrant).toBe(2);
    });
});
//# sourceMappingURL=referral_dev_grant_policy.test.js.map
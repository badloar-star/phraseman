"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const referral_dev_grant_policy_1 = require("./referral_dev_grant_policy");
describe('referral dev grant acquisition policy', () => {
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_grant_1 = require("./admin_grant");
const validInput = {
    uid: 'stable-user_1',
    type: 'shards',
    amount: 25,
    reason: 'Компенсация после подтверждённой ошибки',
    comment: 'Репорт app_errors/123',
    idempotencyKey: 'admin-reward-1',
    requestId: 'request-1',
};
describe('admin grant reward command contract', () => {
    it('normalizes a bounded command and fingerprints every material field', () => {
        const input = (0, admin_grant_1.normalizeAdminGrantRewardInput)(validInput);
        expect(input).toEqual(validInput);
        expect((0, admin_grant_1.adminGrantRewardFingerprint)(input)).toBe(JSON.stringify({
            action: 'grant_reward',
            uid: validInput.uid,
            type: validInput.type,
            amount: validInput.amount,
            reason: validInput.reason,
            comment: validInput.comment,
        }));
    });
    it('requires canonical-looking ids, a reason and idempotency fields', () => {
        for (const input of [
            { ...validInput, uid: '../users' },
            { ...validInput, type: 'premium' },
            { ...validInput, amount: 0 },
            { ...validInput, amount: 10001 },
            { ...validInput, reason: '' },
            { ...validInput, idempotencyKey: '../reuse' },
            { ...validInput, requestId: '' },
        ]) {
            expect(() => (0, admin_grant_1.normalizeAdminGrantRewardInput)(input)).toThrow(https_1.HttpsError);
        }
    });
    it('ignores an amount for fixed rewards', () => {
        expect((0, admin_grant_1.normalizeAdminGrantRewardInput)({
            ...validInput,
            type: 'xp_boost_2x_24h',
            amount: 999,
        })).toMatchObject({ type: 'xp_boost_2x_24h', amount: 0 });
    });
    it('accepts an exact replay and rejects key reuse by another payload or actor', () => {
        const fingerprint = (0, admin_grant_1.adminGrantRewardFingerprint)((0, admin_grant_1.normalizeAdminGrantRewardInput)(validInput));
        expect(() => (0, admin_grant_1.assertAdminRewardReplay)({
            action: 'grant_reward',
            requestFingerprint: fingerprint,
            actorUid: 'admin-1',
        }, fingerprint, 'admin-1')).not.toThrow();
        expect(() => (0, admin_grant_1.assertAdminRewardReplay)({
            action: 'grant_reward',
            requestFingerprint: 'different',
            actorUid: 'admin-1',
        }, fingerprint, 'admin-1')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_grant_1.assertAdminRewardReplay)({
            action: 'grant_reward',
            requestFingerprint: fingerprint,
            actorUid: 'admin-2',
        }, fingerprint, 'admin-1')).toThrow(https_1.HttpsError);
    });
    it('builds the shard balance, log and projected audit values atomically', () => {
        const mutation = (0, admin_grant_1.buildAdminRewardMutation)({ shards: 40 }, 'shards', 25, 1720000000000);
        expect(mutation.updates).toMatchObject({
            shards: 65,
            shards_updated_op: 'earn',
            shards_updated_reason: 'admin_grant',
        });
        expect(mutation.shardLog).toMatchObject({
            type: 'earn',
            amount: 25,
            balanceBefore: 40,
            balanceAfter: 65,
        });
        expect(mutation.before).toEqual({ shards: 40 });
        expect(mutation.after).toEqual({ shards: 65 });
    });
    it('preserves the existing fixed-reward semantics', () => {
        const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
        const boost = (0, admin_grant_1.buildAdminRewardMutation)({}, 'xp_boost_2x_24h', 0, nowMs);
        expect(JSON.parse(String(boost.updates.gift_xp_multiplier))).toEqual({
            multiplier: 2,
            expiresAt: nowMs + 24 * 3600000,
        });
        const shield = (0, admin_grant_1.buildAdminRewardMutation)({
            chain_shield: JSON.stringify({ daysLeft: 2, grantedAt: '2026-07-16' }),
        }, 'chain_shield_3', 0, nowMs);
        expect(JSON.parse(String(shield.updates.chain_shield))).toEqual({
            daysLeft: 5,
            grantedAt: '2026-07-17',
        });
    });
});
//# sourceMappingURL=admin_grant.test.js.map
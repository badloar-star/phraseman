"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_remote_config_1 = require("./admin_remote_config");
describe('parseRemoteConfigRequest', () => {
    it('accepts the compatible remote-config shape', () => {
        expect((0, admin_remote_config_1.parseRemoteConfigRequest)({
            nextConfig: { bools: { maintenance: false }, version: 2 },
            expectedRevision: 3,
            idempotencyKey: 'op-3',
            reason: 'Enable the reviewed release flag',
            requestId: 'req-3',
        })).toMatchObject({ expectedRevision: 3, idempotencyKey: 'op-3' });
    });
    it('rejects arbitrary document fields and stale revision values', () => {
        expect(() => (0, admin_remote_config_1.parseRemoteConfigRequest)({
            nextConfig: { secret: 'nope' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
        })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_remote_config_1.parseRemoteConfigRequest)({
            nextConfig: { bools: {} }, expectedRevision: 1.5, idempotencyKey: 'op', reason: 'x', requestId: 'r',
        })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_remote_config_1.parseRemoteConfigRequest)({
            nextConfig: { bools: 'not-an-object' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
        })).toThrow(https_1.HttpsError);
    });
    it('merges typed branches without deleting keys outside the submitted patch', () => {
        expect((0, admin_remote_config_1.mergeRemoteConfigBranches)({ revision: 4, bools: { maintenance: false, referrals: true }, numbers: { freeLessons: 3 }, texts: { banner: 'old' }, untouched: 'keep' }, { bools: { maintenance: true }, texts: { banner: 'new' } })).toEqual({
            revision: 4,
            bools: { maintenance: true, referrals: true },
            numbers: { freeLessons: 3 },
            texts: { banner: 'new' },
            untouched: 'keep',
        });
    });
});
//# sourceMappingURL=admin_remote_config.test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_access_controls_1 = require("./admin_access_controls");
const base = { uid: 'stable-user_1', durationDays: 30, reason: 'support compensation', requestId: 'request-1', idempotencyKey: 'op-1' };
describe('admin access controls', () => {
    it('bounds and fingerprints premium/VIP access grants', () => {
        const input = (0, admin_access_controls_1.normalizeAdminAccessInput)({ ...base, kind: 'premium' });
        expect(input.kind).toBe('premium');
        expect((0, admin_access_controls_1.adminAccessFingerprint)(input)).toContain('stable-user_1');
        expect((0, admin_access_controls_1.buildAdminAccessPatch)({ progress: {} }, input, 1000).updates).toMatchObject({ 'progress.premium_plan': 'admin_grant', 'progress.admin_premium_override': 'true' });
        expect((0, admin_access_controls_1.buildAdminAccessPatch)({ progress: {} }, { ...input, kind: 'vip', durationDays: 0 }, 1000).after).toMatchObject({ vip_plan: 'admin_grant', vip_until: '0' });
    });
    it('rejects unsafe access commands and ban commands', () => {
        expect(() => (0, admin_access_controls_1.normalizeAdminAccessInput)({ ...base, kind: 'store', durationDays: 3651 })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_access_controls_1.normalizeAdminBanInput)({ uid: '../users', banned: true, reason: 'x', requestId: 'r', idempotencyKey: 'k' })).toThrow(https_1.HttpsError);
        expect((0, admin_access_controls_1.normalizeAdminBanInput)({ uid: 'stable-user_1', banned: true, reason: 'abuse report', requestId: 'r-1', idempotencyKey: 'k-1' }).banned).toBe(true);
    });
});
//# sourceMappingURL=admin_access_controls.test.js.map
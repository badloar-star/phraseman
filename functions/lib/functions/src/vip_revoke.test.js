"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vip_revoke_1 = require("./vip_revoke");
describe('vipRevokeProgressFields', () => {
    const NOW = 1765432100000;
    const fields = (0, vip_revoke_1.vipRevokeProgressFields)(NOW);
    it('mirrors the admin/index.html VIP revoke payload exactly', () => {
        expect(fields).toEqual({
            vip_active: 'false',
            vip_admin_override: 'false',
            vip_until: String(NOW),
            vip_revoked_at: String(NOW),
        });
    });
    it('writes only string values (users/{id}.progress schema convention)', () => {
        for (const value of Object.values(fields)) {
            expect(typeof value).toBe('string');
        }
    });
    it('never touches real RevenueCat premium fields', () => {
        const keys = Object.keys(fields);
        expect(keys.some((k) => k.startsWith('premium'))).toBe(false);
        expect(keys).not.toContain('had_premium_ever');
    });
});
//# sourceMappingURL=vip_revoke.test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("./permissions");
describe('verified callable admin permissions', () => {
    it('accepts Firebase callable auth with the required role permission', () => {
        expect((0, permissions_1.hasVerifiedCallablePermission)({
            uid: 'admin-user',
            token: { admin: true, adminRole: 'analyst' },
        }, 'money.read')).toBe(true);
    });
    it('rejects a raw decoded-looking token that is not callable request.auth', () => {
        expect((0, permissions_1.hasVerifiedCallablePermission)({ admin: true, adminRole: 'owner' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasVerifiedCallablePermission)({
            uid: 'ordinary-user',
            token: { admin: false, adminRole: 'owner' },
        }, 'money.read')).toBe(false);
    });
    it('rejects missing uid, missing claims, and unauthorized roles', () => {
        expect((0, permissions_1.hasVerifiedCallablePermission)({ uid: '', token: { admin: true, adminRole: 'owner' } }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasVerifiedCallablePermission)({ uid: 'admin-user' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasVerifiedCallablePermission)({
            uid: 'support-user',
            token: { admin: true, adminRole: 'support' },
        }, 'money.read')).toBe(false);
    });
});
//# sourceMappingURL=permissions.test.js.map
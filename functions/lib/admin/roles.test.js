"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roles_1 = require("./roles");
describe('admin roles', () => {
    it('contains the least-privilege roles required by the admin design', () => {
        expect(roles_1.ADMIN_ROLES).toEqual(expect.arrayContaining([
            'owner', 'admin', 'support', 'content_editor', 'moderator', 'analyst', 'developer',
        ]));
    });
    it('rejects unknown roles', () => {
        expect((0, roles_1.hasAdminRole)('intruder')).toBe(false);
        expect((0, roles_1.hasAdminRole)('support')).toBe(true);
    });
});
//# sourceMappingURL=roles.test.js.map
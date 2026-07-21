"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("./permissions");
describe('admin permission matrix', () => {
    it('allows content editors to manage drafts but not billing', () => {
        expect((0, permissions_1.hasPermission)('content_editor', 'content.draft.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('content_editor', 'money.manual_access.write')).toBe(false);
    });
    it('allows support to inspect users but not mutate entitlements', () => {
        expect((0, permissions_1.hasPermission)('support', 'users.read')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'money.manual_access.write')).toBe(false);
    });
    it('separates briefing and report read/write roles', () => {
        expect((0, permissions_1.hasPermission)('analyst', 'briefing.read')).toBe(true);
        expect((0, permissions_1.hasPermission)('analyst', 'briefing.generate')).toBe(false);
        expect((0, permissions_1.hasPermission)('support', 'reports.read')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'reports.status.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('moderator', 'reports.status.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('developer', 'diagnostics.status.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('content_editor', 'reports.read')).toBe(false);
    });
    it('allows support operators to work the inbox but not resolve ambiguous delivery', () => {
        expect((0, permissions_1.hasPermission)('support', 'support.inbox.read')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.inbox.pull')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.draft.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.reply.send')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.archive')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.settings.write')).toBe(true);
        expect((0, permissions_1.hasPermission)('support', 'support.reply.resolve_ambiguous')).toBe(false);
        expect((0, permissions_1.hasPermission)('owner', 'support.reply.resolve_ambiguous')).toBe(true);
        expect((0, permissions_1.hasPermission)('admin', 'support.reply.resolve_ambiguous')).toBe(true);
    });
    it('allows owners to use every defined permission', () => {
        const permissions = [
            'users.read', 'users.write', 'money.read', 'money.manual_access.write',
            'content.read', 'content.draft.write', 'content.publish', 'application.config.write',
            'diagnostics.read', 'community.moderate', 'admin.roles.write',
            'support.inbox.read', 'support.inbox.pull', 'support.draft.write',
            'support.reply.send', 'support.archive', 'support.settings.write',
            'support.reply.resolve_ambiguous',
            'briefing.read', 'briefing.generate', 'reports.read', 'reports.status.write',
            'reports.reply.draft', 'reports.reply.send', 'diagnostics.status.write',
        ];
        permissions.forEach(permission => expect((0, permissions_1.hasPermission)('owner', permission)).toBe(true));
    });
});
describe('claimed admin permissions', () => {
    it('allows money analytics only to claimed roles with money.read', () => {
        expect((0, permissions_1.hasClaimedPermission)({ admin: true, adminRole: 'owner' }, 'money.read')).toBe(true);
        expect((0, permissions_1.hasClaimedPermission)({ admin: true, adminRole: 'analyst' }, 'money.read')).toBe(true);
        expect((0, permissions_1.hasClaimedPermission)({ admin: true, adminRole: 'support' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasClaimedPermission)({ admin: true, adminRole: 'moderator' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasClaimedPermission)({ admin: true, adminRole: 'developer' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasClaimedPermission)({ admin: false, adminRole: 'owner' }, 'money.read')).toBe(false);
        expect((0, permissions_1.hasClaimedPermission)({ admin: true }, 'money.read')).toBe(false);
    });
});
//# sourceMappingURL=permissions.test.js.map
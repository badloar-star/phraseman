"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.hasClaimedPermission = hasClaimedPermission;
const roles_1 = require("./roles");
const SUPPORT_OPERATOR_PERMISSIONS = [
    'support.inbox.read',
    'support.inbox.pull',
    'support.draft.write',
    'support.reply.send',
    'support.archive',
    'support.settings.write',
];
const REPORT_OPERATOR_PERMISSIONS = [
    'reports.read',
    'reports.status.write',
    'reports.reply.draft',
    'reports.reply.send',
];
const BRIEFING_OPERATOR_PERMISSIONS = [
    'briefing.read',
    'briefing.generate',
];
const ROLE_PERMISSIONS = {
    owner: new Set([
        'users.read', 'users.write', 'money.read', 'money.manual_access.write',
        'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
        'diagnostics.read', 'community.moderate', 'admin.roles.write',
        ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
        ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ]),
    admin: new Set([
        'users.read', 'users.write', 'money.read', 'money.manual_access.write',
        'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
        'diagnostics.read', 'community.moderate',
        ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
        ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ]),
    support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS, ...REPORT_OPERATOR_PERMISSIONS]),
    content_editor: new Set(['content.read', 'content.draft.write']),
    content_reviewer: new Set(['content.read', 'content.review']),
    moderator: new Set(['users.read', 'community.moderate', 'reports.read', 'reports.status.write']),
    analyst: new Set(['users.read', 'money.read', 'content.read', 'campaigns.read', 'diagnostics.read', 'briefing.read', 'reports.read']),
    developer: new Set(['content.read', 'diagnostics.read', 'briefing.read', 'diagnostics.status.write']),
};
function hasPermission(role, permission) {
    return (0, roles_1.hasAdminRole)(role) && ROLE_PERMISSIONS[role].has(permission);
}
function hasClaimedPermission(token, permission) {
    if (!token || typeof token !== 'object')
        return false;
    const claims = token;
    return claims.admin === true && hasPermission(claims.adminRole, permission);
}
//# sourceMappingURL=permissions.js.map
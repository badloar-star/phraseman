"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ROLES = void 0;
exports.hasAdminRole = hasAdminRole;
exports.ADMIN_ROLES = [
    'owner',
    'admin',
    'support',
    'content_editor',
    'moderator',
    'analyst',
    'developer',
];
function hasAdminRole(value) {
    return typeof value === 'string' && exports.ADMIN_ROLES.includes(value);
}
//# sourceMappingURL=roles.js.map
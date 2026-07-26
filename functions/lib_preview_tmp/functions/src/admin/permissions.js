"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.roleFromAdminToken = roleFromAdminToken;
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
// зачем: вернули полноценный воркфлоу "Идеи" в новую админку (был урезан до 3 карточек без действий) — права те же роли, что уже решают судьбу репортов/контента
const IDEA_OPERATOR_PERMISSIONS = [
    'ideas.read',
    'ideas.decide',
];
const ROLE_PERMISSIONS = {
    owner: new Set([
        'users.read', 'users.write', 'users.auth_repair', 'users.message.write', 'money.read', 'money.manual_access.write',
        'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
        'diagnostics.read', 'community.moderate', 'admin.roles.write',
        ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
        ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, ...IDEA_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ]),
    admin: new Set([
        'users.read', 'users.write', 'users.auth_repair', 'users.message.write', 'money.read', 'money.manual_access.write',
        'content.read', 'content.draft.write', 'content.publish', 'content.review', 'application.config.write', 'campaigns.read', 'campaigns.write',
        'diagnostics.read', 'community.moderate',
        ...SUPPORT_OPERATOR_PERMISSIONS, 'support.reply.resolve_ambiguous',
        ...REPORT_OPERATOR_PERMISSIONS, ...BRIEFING_OPERATOR_PERMISSIONS, ...IDEA_OPERATOR_PERMISSIONS, 'diagnostics.status.write',
    ]),
    support: new Set(['users.read', 'diagnostics.read', ...SUPPORT_OPERATOR_PERMISSIONS, ...REPORT_OPERATOR_PERMISSIONS]),
    content_editor: new Set(['content.read', 'content.draft.write']),
    content_reviewer: new Set(['content.read', 'content.review']),
    moderator: new Set(['users.read', 'community.moderate', 'reports.read', 'reports.status.write', ...IDEA_OPERATOR_PERMISSIONS]),
    analyst: new Set(['users.read', 'money.read', 'content.read', 'campaigns.read', 'diagnostics.read', 'briefing.read', 'reports.read']),
    developer: new Set(['content.read', 'diagnostics.read', 'briefing.read', 'diagnostics.status.write']),
};
function hasPermission(role, permission) {
    return (0, roles_1.hasAdminRole)(role) && ROLE_PERMISSIONS[role].has(permission);
}
/**
 * Роль админа из токена. Флаг `admin === true` без явной роли = owner.
 *
 * зачем: 25.07 доступ ужесточили до «admin === true И adminRole», но выдавать
 * adminRole в проекте нечем — `setCustomUserClaims` не вызывается нигде. У всех
 * действующих админов роли не оказалось, и разом отвалилось 18 точек входа
 * (ответы на репорты, награды, рассылки, контент). Возвращаем прежнее поведение:
 * флаг admin сам по себе даёт полные права, а adminRole — необязательное сужение.
 */
function roleFromAdminToken(token) {
    if (!token || typeof token !== 'object')
        return null;
    const claims = token;
    if (claims.admin !== true)
        return null;
    return (0, roles_1.hasAdminRole)(claims.adminRole) ? claims.adminRole : 'owner';
}
function hasClaimedPermission(token, permission) {
    if (!token || typeof token !== 'object')
        return false;
    const claims = token;
    if (claims.admin !== true)
        return false;
    // зачем: 25.07 проверка ужесточилась до «admin === true И adminRole», но механизма
    // выдачи adminRole в проекте нет (setCustomUserClaims нигде не вызывается), поэтому
    // у существующих админов роли не оказалось — отвалилась отправка ответов на репорты
    // и всё остальное с этой проверкой. Флаг admin сам по себе снова даёт полные права;
    // adminRole остаётся необязательным сужением прав, если его кому-то проставят.
    if (!(0, roles_1.hasAdminRole)(claims.adminRole))
        return true;
    return hasPermission(claims.adminRole, permission);
}
//# sourceMappingURL=permissions.js.map
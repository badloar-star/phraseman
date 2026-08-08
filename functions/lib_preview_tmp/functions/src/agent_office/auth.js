"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAgentOfficeReader = requireAgentOfficeReader;
exports.requireAgentOfficeOwner = requireAgentOfficeOwner;
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("../admin/permissions");
const roles_1 = require("../admin/roles");
function requireExplicitActor(auth) {
    const actorUid = typeof auth?.uid === 'string' ? auth.uid.trim() : '';
    if (!actorUid || auth?.token?.admin !== true)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const claimedRole = auth.token.adminRole;
    if (!(0, roles_1.hasAdminRole)(claimedRole))
        throw new https_1.HttpsError('permission-denied', 'adminRole claim required');
    return Object.freeze({ actorUid, role: claimedRole });
}
function requireAgentOfficeReader(auth, permission) {
    const actor = requireExplicitActor(auth);
    if (!(0, permissions_1.hasPermission)(actor.role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    return actor;
}
function requireAgentOfficeOwner(auth) {
    const actor = requireExplicitActor(auth);
    if (actor.role !== 'owner')
        throw new https_1.HttpsError('permission-denied', 'Owner only');
    return Object.freeze({ actorUid: actor.actorUid, role: 'owner' });
}
//# sourceMappingURL=auth.js.map
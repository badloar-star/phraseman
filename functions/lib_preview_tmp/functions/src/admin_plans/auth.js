"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminPlansOwner = requireAdminPlansOwner;
const https_1 = require("firebase-functions/v2/https");
function requireAdminPlansOwner(auth) {
    const actorUid = typeof auth?.uid === 'string' ? auth.uid.trim() : '';
    if (!actorUid || auth?.token?.admin !== true || auth.token.adminRole !== 'owner') {
        throw new https_1.HttpsError('permission-denied', 'Owner admin claim required');
    }
    return Object.freeze({ actorUid, role: 'owner' });
}
//# sourceMappingURL=auth.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditRecord = createAuditRecord;
const roles_1 = require("./roles");
function createAuditRecord(input) {
    if (!input.action.trim()
        || !input.actorUid.trim()
        || !(0, roles_1.hasAdminRole)(input.role)
        || !input.entity.collection.trim()
        || !input.entity.id.trim()
        || !input.reason.trim()
        || !input.requestId.trim()
        || !input.timestamp.trim()) {
        throw new Error('validation_failed');
    }
    return Object.freeze({
        action: input.action.trim(),
        actorUid: input.actorUid.trim(),
        role: input.role,
        entity: Object.freeze({ ...input.entity }),
        reason: input.reason.trim(),
        before: Object.freeze({ ...input.before }),
        after: Object.freeze({ ...input.after }),
        rollbackReference: input.rollbackReference ?? null,
        requestId: input.requestId.trim(),
        timestamp: input.timestamp,
    });
}
//# sourceMappingURL=audit_contract.js.map
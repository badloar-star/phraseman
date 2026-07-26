"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistArenaComparisonReceipt = persistArenaComparisonReceipt;
exports.updateArenaConvergenceConfig = updateArenaConvergenceConfig;
const surface_convergence_policy_1 = require("./surface_convergence_policy");
async function persistArenaComparisonReceipt(db, receipt, serverTimestamp) {
    if (!/^[a-f0-9]{64}$/.test(receipt.documentId))
        throw new Error('surface_convergence_receipt_identity_invalid');
    const ref = db.collection('content_factory_surface_comparisons').doc(receipt.documentId);
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists)
            return Object.freeze({ created: false, documentId: receipt.documentId });
        tx.create(ref, { ...receipt, createdAt: serverTimestamp });
        return Object.freeze({ created: true, documentId: receipt.documentId });
    });
}
async function updateArenaConvergenceConfig(db, input) {
    const configRef = db.collection('content_factory_config').doc('surface_convergence');
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(configRef);
        const current = snapshot.exists ? snapshot.data() : (0, surface_convergence_policy_1.defaultSurfaceConvergenceConfig)();
        const planned = (0, surface_convergence_policy_1.planArenaConvergenceConfigUpdate)(current, { expectedRevision: input.expectedRevision, mode: input.mode, actorUid: input.actorUid, requiredLocalePairs: input.requiredLocalePairs, disabledReason: input.disabledReason });
        tx.set(configRef, { arena: planned.arena, updatedAt: input.serverTimestamp }, { merge: false });
        tx.create(auditRef, { action: input.mode === 'legacy' ? 'content_factory.arena.kill_switch' : 'content_factory.arena.shadow_enable', actorUid: input.actorUid, role: input.role, entity: { collection: 'content_factory_config', id: 'surface_convergence' }, reason: input.disabledReason || 'Arena shadow evidence collection enabled', requestId: input.requestId, before: { mode: planned.audit.beforeMode, revision: planned.audit.expectedRevision }, after: { mode: planned.audit.afterMode, revision: planned.audit.nextRevision, requiredLocalePairs: planned.arena.requiredLocalePairs }, timestamp: input.nowIso });
        return Object.freeze({ ok: true, arena: planned.arena, auditId: auditRef.id });
    });
}
//# sourceMappingURL=surface_convergence_repository.js.map
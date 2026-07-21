"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlContentStage = controlContentStage;
const stage_runner_1 = require("./stage_runner");
function counter(value) { const parsed = Number(value ?? 0); return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0; }
async function controlContentStage(db, input) {
    const stageRef = db.collection('content_factory_stages').doc(input.stageId);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(stageRef);
        if (!snapshot.exists)
            throw new Error('content_stage_not_found');
        const current = snapshot.data() ?? {};
        const previousState = String(current.state ?? '');
        const nextState = (0, stage_runner_1.transitionGenerationStage)(previousState, input.action);
        const attempts = counter(current.attempts);
        const generationAttempts = counter(current.generationAttempts);
        const controlRevision = counter(current.controlRevision);
        const nextControlRevision = controlRevision + 1;
        tx.update(stageRef, { state: nextState, controlRevision: nextControlRevision, leaseToken: input.deleteValue, leaseExpiresAtMs: input.deleteValue, updatedAt: input.serverTimestamp, lastControlAction: input.action, lastControlledBy: input.actorUid });
        tx.create(auditRef, { action: `content_factory.stage.${input.action}`, actorUid: input.actorUid, role: input.role, entity: { collection: 'content_factory_stages', id: input.stageId }, operationId: `${input.stageId}:${nextControlRevision}`, reason: `Content generation stage ${input.action}`, before: { state: previousState, attempts, generationAttempts, controlRevision }, after: { state: nextState, attempts, generationAttempts, controlRevision: nextControlRevision }, attemptDelta: 0, providerAttemptDelta: 0, timestamp: input.nowIso });
        return Object.freeze({ ok: true, stageId: input.stageId, state: nextState, controlRevision: nextControlRevision, attemptDelta: 0, providerAttemptDelta: 0 });
    });
}
//# sourceMappingURL=stage_control_repository.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimNextV2Stage = claimNextV2Stage;
exports.finishV2StageLease = finishV2StageLease;
const v2_stage_lifecycle_1 = require("./v2_stage_lifecycle");
const STAGES = 'content_v2_generation_stages';
const LEASE_MS = 10 * 60 * 1000;
function token(value, label) {
    const result = String(value ?? '').trim();
    if (!/^[A-Za-z0-9._:-]{1,180}$/.test(result))
        throw new Error(`v2_stage_${label}_invalid`);
    return result;
}
function stageFromSnapshot(snapshot) {
    const data = snapshot.data() ?? {};
    const dependsOn = Array.isArray(data.dependsOn) ? data.dependsOn.map(String) : [];
    return {
        stageId: token(data.stageId ?? snapshot.id, 'id'),
        dependsOn,
        state: String(data.state ?? ''),
        attempts: Number(data.attempts ?? 0),
        maxAttempts: Number(data.maxAttempts ?? 3),
        leaseExpiresAtMs: typeof data.leaseExpiresAtMs === 'number' ? data.leaseExpiresAtMs : undefined,
    };
}
function stageQuery(db, jobId) {
    return db.collection(STAGES).where('jobId', '==', jobId);
}
/**
 * Atomically claims the next runnable V2 stage from the existing generation
 * queue. Dependencies, stale leases and attempt limits are evaluated inside
 * the transaction; no second queue is introduced.
 */
async function claimNextV2Stage(db, input) {
    const jobId = token(input.jobId, 'job_id');
    const workerId = token(input.workerId, 'worker_id');
    if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0)
        throw new Error('v2_stage_clock_invalid');
    return db.runTransaction(async (tx) => {
        const querySnapshot = await tx.get(stageQuery(db, jobId));
        const snapshots = querySnapshot.docs;
        const records = snapshots.map(stageFromSnapshot);
        const states = Object.fromEntries(records.map((item) => [item.stageId, item.state]));
        const selectedId = (0, v2_stage_lifecycle_1.selectRunnableV2Stages)(records, input.nowMs)[0];
        if (!selectedId)
            return { lease: null, reason: 'no_runnable_stage' };
        const selectedSnapshot = snapshots.find((item) => stageFromSnapshot(item).stageId === selectedId);
        if (!selectedSnapshot)
            return { lease: null, reason: 'no_runnable_stage' };
        const next = (0, v2_stage_lifecycle_1.transitionV2Stage)(stageFromSnapshot(selectedSnapshot), 'start', { dependencyStates: states, nowMs: input.nowMs });
        const leaseToken = `${workerId}:${next.stageId}:${next.attempts}:${input.nowMs}`;
        const ref = db.collection(STAGES).doc(selectedSnapshot.id);
        tx.set(ref, { state: next.state, attempts: next.attempts, leaseExpiresAtMs: next.leaseExpiresAtMs, leaseToken, workerId, claimedAtMs: input.nowMs }, { merge: true });
        return { lease: Object.freeze({ jobId, stageId: next.stageId, workerId, leaseToken, attempt: next.attempts, leaseExpiresAtMs: next.leaseExpiresAtMs }) };
    });
}
/** Completes a lease only when the same worker/token still owns the stage. */
async function finishV2StageLease(db, lease, outcome) {
    return db.runTransaction(async (tx) => {
        const ref = db.collection(STAGES).doc(lease.stageId);
        const snapshot = await tx.get(ref);
        const data = snapshot.data() ?? {};
        if (!snapshot.exists || data.state !== 'running' || data.workerId !== lease.workerId || data.leaseToken !== lease.leaseToken)
            return false;
        const stage = stageFromSnapshot({ id: snapshot.id, exists: snapshot.exists, data: () => data });
        const next = (0, v2_stage_lifecycle_1.transitionV2Stage)(stage, outcome, { dependencyStates: {}, nowMs: lease.leaseExpiresAtMs - LEASE_MS });
        tx.set(ref, { state: next.state, leaseExpiresAtMs: null, leaseToken: null, workerId: null, finishedAtMs: lease.leaseExpiresAtMs - LEASE_MS }, { merge: true });
        return true;
    });
}
//# sourceMappingURL=v2_stage_claim_adapter.js.map
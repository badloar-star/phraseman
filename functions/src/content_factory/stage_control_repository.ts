import { transitionGenerationStage, type StageControlAction } from './stage_runner';
import type { GenerationStageState } from './stage_contracts';

type FirestoreLike = Pick<FirebaseFirestore.Firestore, 'collection' | 'runTransaction'>;

function counter(value: unknown): number { const parsed = Number(value ?? 0); return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0; }

export async function controlContentStage(db: FirestoreLike, input: { readonly stageId: string; readonly action: StageControlAction; readonly actorUid: string; readonly role: string; readonly nowIso: string; readonly serverTimestamp: unknown; readonly deleteValue: unknown }) {
  const stageRef = db.collection('content_factory_stages').doc(input.stageId); const auditRef = db.collection('admin_log').doc();
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) throw new Error('content_stage_not_found');
    const current = snapshot.data() ?? {}; const previousState = String(current.state ?? '') as GenerationStageState;
    const nextState = transitionGenerationStage(previousState, input.action);
    const attempts = counter(current.attempts); const generationAttempts = counter(current.generationAttempts); const controlRevision = counter(current.controlRevision); const nextControlRevision = controlRevision + 1;
    tx.update(stageRef, { state: nextState, controlRevision: nextControlRevision, leaseToken: input.deleteValue, leaseExpiresAtMs: input.deleteValue, updatedAt: input.serverTimestamp, lastControlAction: input.action, lastControlledBy: input.actorUid });
    tx.create(auditRef, { action: `content_factory.stage.${input.action}`, actorUid: input.actorUid, role: input.role, entity: { collection: 'content_factory_stages', id: input.stageId }, operationId: `${input.stageId}:${nextControlRevision}`, reason: `Content generation stage ${input.action}`, before: { state: previousState, attempts, generationAttempts, controlRevision }, after: { state: nextState, attempts, generationAttempts, controlRevision: nextControlRevision }, attemptDelta: 0, providerAttemptDelta: 0, timestamp: input.nowIso });
    return Object.freeze({ ok: true as const, stageId: input.stageId, state: nextState, controlRevision: nextControlRevision, attemptDelta: 0 as const, providerAttemptDelta: 0 as const });
  });
}

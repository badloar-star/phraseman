import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { parseArtifactEditRequest, prepareArtifactEdit } from './content_factory/artifact_edit';
import { writeImmutableObject } from './content_factory/artifact_storage';
import { parseHashedJsonBytes } from './content_factory/release_surface_delivery';
import { contentStageReviewFingerprint } from './content_factory/review_fingerprint';
import { type GenerationStageKind } from './content_factory/stage_contracts';
import { stageCapability } from './content_factory/stage_capabilities';

const REGION = 'us-central1';
function requireDraftRole(request: { auth?: { token?: Record<string, unknown> } }): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = request.auth.token.adminRole;
  if (!hasAdminRole(role) || !hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot use content.draft.write');
  return role;
}

export async function commitArtifactEditRevision(input: {
  db: admin.firestore.Firestore;
  request: ReturnType<typeof parseArtifactEditRequest>;
  prepared: ReturnType<typeof prepareArtifactEdit>;
  receipt: Awaited<ReturnType<typeof writeImmutableObject>>;
  actorUid: string;
  role: AdminRole;
}) {
  const { db, request, prepared, receipt, actorUid, role } = input;
  const eventId = createHash('sha256').update(`${request.baseStageId}:${request.idempotencyKey}`).digest('hex');
  const baseRef = db.collection('content_factory_stages').doc(request.baseStageId);
  const newRef = db.collection('content_factory_stages').doc(prepared.newStageId);
  const eventRef = db.collection('content_factory_correction_events').doc(eventId);
  const auditRef = db.collection('admin_log').doc(eventId);
  return db.runTransaction(async (tx) => {
    const [currentBaseSnapshot, currentNewSnapshot, eventSnapshot] = await Promise.all([tx.get(baseRef), tx.get(newRef), tx.get(eventRef)]);
    if (!currentBaseSnapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
    const currentBase = { stageId: currentBaseSnapshot.id, ...(currentBaseSnapshot.data() ?? {}) } as Record<string, unknown>;
    if (contentStageReviewFingerprint(currentBaseSnapshot.id, currentBase) !== request.expectedBaseReviewFingerprint) throw new HttpsError('aborted', 'artifact_edit_base_fingerprint_stale');
    if (eventSnapshot.exists) {
      const event = eventSnapshot.data() ?? {};
      if (event.newStageId !== prepared.newStageId || event.newContentHash !== receipt.contentHash || event.baseReviewFingerprint !== request.expectedBaseReviewFingerprint) throw new HttpsError('already-exists', 'artifact_edit_idempotency_conflict');
      return { ok: true, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, revision: prepared.revision, reviewState: 'needs_review', diff: event.diff ?? prepared.diff, replayed: true };
    }
    if (currentNewSnapshot.exists) throw new HttpsError('already-exists', 'artifact_edit_revision_conflict');
    const baseRevisionIdentity = `${request.baseStageId}:${String(currentBase.revision)}:${String(currentBase.contentHash)}`;
    const newStage: Record<string, unknown> = {
      ...currentBase, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, idempotencyKey: prepared.newStageId,
      revision: prepared.revision, state: 'needs_review', objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, contentHash: receipt.contentHash,
      artifactAttempt: prepared.artifactAttempt, artifactLeaseTokenHash: prepared.artifactLeaseTokenHash, artifactByteSize: receipt.byteSize,
      artifactReferenceState: 'committed', artifactFinalizationKey: receipt.finalizationKey,
      baseStageId: request.baseStageId, baseArtifactId: currentBase.artifactId, baseContentHash: currentBase.contentHash, baseReviewFingerprint: request.expectedBaseReviewFingerprint,
      baseRevisionIdentity, editOperationId: eventId, editReason: request.reason, semanticDiff: prepared.diff,
      operatorCorrected: true, correctionStatus: 'collected_pending_review', qaReceipt: { policy: 'artifact-edit-validation-v1', status: 'passed', deterministic: true },
      createdBy: actorUid, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    delete newStage.reviewedBy; delete newStage.reviewedAt; delete newStage.reviewReason; delete newStage.linguisticReview;
    delete newStage.judgeReceipt; delete newStage.judgeUpdatedAt;
    tx.create(newRef, newStage);
    tx.create(eventRef, {
      operationId: eventId, idempotencyKey: request.idempotencyKey, baseStageId: request.baseStageId, baseArtifactId: currentBase.artifactId, baseContentHash: currentBase.contentHash,
      baseReviewFingerprint: request.expectedBaseReviewFingerprint, newStageId: prepared.newStageId, newArtifactId: prepared.newArtifactId, newContentHash: receipt.contentHash,
      objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, actorUid, reason: request.reason, diff: prepared.diff,
      changedSemanticPaths: prepared.diff.details.map((detail) => detail.path), changedCount: prepared.diff.totalDetails, status: 'pending_review', createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.create(auditRef, { action: 'content_factory.stage.artifact_edit', actorUid, role, entity: { collection: 'content_factory_stages', id: prepared.newStageId }, operationId: eventId, reason: request.reason, before: { stageId: request.baseStageId, artifactId: currentBase.artifactId, contentHash: currentBase.contentHash }, after: { stageId: prepared.newStageId, artifactId: prepared.newArtifactId, contentHash: receipt.contentHash, state: 'needs_review' }, timestamp: new Date().toISOString() });
    return { ok: true, stageId: prepared.newStageId, artifactId: prepared.newArtifactId, revision: prepared.revision, reviewState: 'needs_review', diff: prepared.diff, replayed: false };
  });
}

export const adminEditContentStageArtifact = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = requireDraftRole(request as { auth?: { token?: Record<string, unknown> } });
  let input: ReturnType<typeof parseArtifactEditRequest>;
  try { input = parseArtifactEditRequest(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'artifact_edit_invalid'); }
  const db = admin.firestore();
  const baseRef = db.collection('content_factory_stages').doc(input.baseStageId);
  const baseSnapshot = await baseRef.get();
  if (!baseSnapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
  const baseRecord = { stageId: baseSnapshot.id, ...(baseSnapshot.data() ?? {}) } as Record<string, unknown>;
  const kind = String(baseRecord.kind ?? '') as GenerationStageKind;
  try { stageCapability(kind); } catch { throw new HttpsError('failed-precondition', 'artifact_edit_base_kind_invalid'); }
  const base = { ...baseRecord, kind } as Record<string, unknown> & { kind: GenerationStageKind };
  if (!['needs_review', 'approved'].includes(String(base.state))) throw new HttpsError('failed-precondition', 'artifact_edit_base_state_invalid');
  if (contentStageReviewFingerprint(baseSnapshot.id, base) !== input.expectedBaseReviewFingerprint) throw new HttpsError('aborted', 'artifact_edit_base_fingerprint_stale');
  const objectPath = String(base.objectPath ?? ''); const objectGeneration = String(base.objectGeneration ?? ''); const contentHash = String(base.contentHash ?? '');
  if (!objectPath || !objectGeneration || !/^[a-f0-9]{64}$/i.test(contentHash)) throw new HttpsError('failed-precondition', 'artifact_edit_base_receipt_invalid');
  const baseFile = admin.storage().bucket().file(objectPath);
  const [metadata] = await baseFile.getMetadata();
  if (String(metadata.generation ?? '') !== objectGeneration) throw new HttpsError('data-loss', 'artifact_edit_base_generation_mismatch');
  const [baseBytes] = await baseFile.download({ validation: false });
  let baseArtifact: unknown;
  try { baseArtifact = parseHashedJsonBytes(baseBytes, contentHash); } catch (error) { throw new HttpsError('data-loss', error instanceof Error ? error.message : 'artifact_edit_base_payload_invalid'); }
  let prepared: ReturnType<typeof prepareArtifactEdit>;
  try { prepared = prepareArtifactEdit(base, baseArtifact, input.artifact, input.idempotencyKey); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'artifact_edit_validation_failed'); }
  const receipt = await writeImmutableObject(admin.storage().bucket(), prepared.objectPath, prepared.candidateArtifact);
  const newRef = db.collection('content_factory_stages').doc(prepared.newStageId);
  try {
    return await commitArtifactEditRevision({ db, request: input, prepared, receipt, actorUid: request.auth!.uid, role });
  } catch (error) {
    const committed = await newRef.get();
    if (!committed.exists || committed.data()?.contentHash !== receipt.contentHash) {
      const orphanId = createHash('sha256').update(`${receipt.objectPath}:${receipt.objectGeneration}:${receipt.contentHash}`).digest('hex');
      await db.collection('content_factory_artifact_orphans').doc(orphanId).set({ state: 'orphan_candidate', reason: 'artifact_edit_transaction_not_committed', entityCollection: 'content_factory_stages', entityId: prepared.newStageId, objectPath: receipt.objectPath, objectGeneration: receipt.objectGeneration, contentHash: receipt.contentHash, finalizationKey: receipt.finalizationKey, detectedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    throw error;
  }
});

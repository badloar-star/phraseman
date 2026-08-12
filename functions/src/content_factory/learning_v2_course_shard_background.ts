import { createHash, randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { buildLearningV2LocalizedContentBatchPlan } from '../../../modules/learning-v2/content/generator_course_batch_plan';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { hasAdminRole } from '../admin/roles';
import { hasPermission } from '../admin/permissions';
import { createOpenAiGenerationProvider } from './generation_provider';
import { resolveJobConfig, assertJobEnabled } from '../openai_jobs_config';
import { reserveContentFactoryBudget } from './content_factory_budget';
import { acquireStageLease, canCommitStageLease } from './stage_lease';
import { buildGenerationFailureRecord } from './generation_errors';
import { loadApprovedLearningV2Prerequisite, type LearningV2GroundingBucketLike } from './learning_v2_prerequisite_grounding';
import {
  approveLearningV2LocalizedCourseWave,
  createLearningV2LocalizedCourseShardCheckpoint,
  nextLearningV2LocalizedCourseShardDecision,
  parseLearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedCourseShardCheckpoint,
  type LearningV2LocalizedCourseShardCheckpointExpected,
  type LearningV2LocalizedSessionShardReceipt,
} from './learning_v2_course_shard_checkpoint';
import {
  decideLearningV2CourseShardReceiptAppend,
  learningV2LocalizedSessionShardReceiptDocumentId,
} from './learning_v2_course_shard_repository';
import { runLearningV2LocalizedCourseShardBatch } from './learning_v2_course_shard_batch_worker';
import {
  learningV2CourseWaveLastEpisode,
  loadLearningV2CourseWavePreview,
  parseLearningV2CourseWavePreviewRequest,
} from './learning_v2_course_wave_preview';

const REGION = 'us-central1';
const STAGE_KIND = 'learning_v2_localized_course';
const SESSION_PROMPT_VERSION = 'learning-v2-localized-session-v1';
const BACKGROUND_LEASE_MS = 30 * 60 * 1000;
const HASH_RE = /^[a-f0-9]{64}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/;
export const LEARNING_V2_COURSE_SHARD_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

export type LearningV2CourseShardRuntimeState = Readonly<{
  state: 'queued' | 'paused';
  autoRunRequested: boolean;
  pauseReason: 'owner_wave_approval_required' | 'root_manifest_materialization_pending' | null;
  requiredWaveApproval: 'e1' | 'chapter_1' | 'season' | null;
}>;

function stagePlanFromRuntime(stage: Record<string, unknown>) {
  const packageId = String(stage.learningV2PackageId ?? '').trim();
  const outlineFingerprint = String(stage.learningV2ApprovedOutlineFingerprint ?? '').trim();
  const promptVersion = String(stage.learningV2SessionPromptVersion ?? '').trim();
  if (!packageId || !HASH_RE.test(outlineFingerprint) || promptVersion !== SESSION_PROMPT_VERSION) {
    throw new Error('learning_v2_course_shard_runtime_plan_missing');
  }
  return buildLearningV2LocalizedContentBatchPlan({ packageId, approvedOutlineFingerprint: outlineFingerprint, promptVersion });
}

export function learningV2CourseShardExpectedFromStage(
  stageId: string,
  stage: Record<string, unknown>,
): LearningV2LocalizedCourseShardCheckpointExpected {
  return Object.freeze({ stageId, stageRevision: Number(stage.revision), plan: stagePlanFromRuntime(stage) });
}

export function resolveLearningV2CourseShardRuntimeState(
  checkpoint: unknown,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
): LearningV2CourseShardRuntimeState {
  const parsed = parseLearningV2LocalizedCourseShardCheckpoint(checkpoint, expected);
  const next = nextLearningV2LocalizedCourseShardDecision({ checkpoint: parsed, expected, maxItems: 4 });
  if (next.kind === 'batch') return Object.freeze({ state: 'queued' as const, autoRunRequested: true, pauseReason: null, requiredWaveApproval: null });
  if (next.kind === 'blocked_wave_approval') return Object.freeze({
    state: 'paused' as const,
    autoRunRequested: false,
    pauseReason: 'owner_wave_approval_required' as const,
    requiredWaveApproval: next.requiredApproval,
  });
  const seasonApproved = parsed.waveApprovals.some((approval) => approval.waveId === 'season');
  return Object.freeze({
    state: 'paused' as const,
    autoRunRequested: false,
    pauseReason: seasonApproved ? 'root_manifest_materialization_pending' as const : 'owner_wave_approval_required' as const,
    requiredWaveApproval: seasonApproved ? null : 'season' as const,
  });
}

export function parseLearningV2CourseWaveApprovalRequest(data: unknown): Readonly<{
  stageId: string;
  waveId: 'e1' | 'chapter_1' | 'season';
  expectedCheckpointFingerprint: string;
  reason: string;
}> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpsError('invalid-argument', 'learning_v2_course_wave_approval_invalid');
  const input = data as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length !== 4 || keys.some((key) => !['stageId', 'waveId', 'expectedCheckpointFingerprint', 'reason'].includes(key))) {
    throw new HttpsError('invalid-argument', 'learning_v2_course_wave_approval_invalid');
  }
  const stageId = String(input.stageId ?? '').trim();
  const waveId = String(input.waveId ?? '') as 'e1' | 'chapter_1' | 'season';
  const expectedCheckpointFingerprint = String(input.expectedCheckpointFingerprint ?? '').trim();
  const reason = String(input.reason ?? '').trim();
  if (!STAGE_ID_RE.test(stageId) || !['e1', 'chapter_1', 'season'].includes(waveId) || !HASH_RE.test(expectedCheckpointFingerprint) || reason.length < 5 || reason.length > 500) {
    throw new HttpsError('invalid-argument', 'learning_v2_course_wave_approval_invalid');
  }
  return Object.freeze({ stageId, waveId, expectedCheckpointFingerprint, reason });
}

async function acquireBackgroundLease(stageRef: admin.firestore.DocumentReference) {
  const nowMs = Date.now();
  const requested = randomUUID();
  return admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) return null;
    const stage = snapshot.data() ?? {};
    if (stage.kind !== STAGE_KIND || stage.state !== 'queued' || stage.learningV2AutoRunRequested !== true) return null;
    const decision = acquireStageLease(stage, { nowMs, leaseMs: BACKGROUND_LEASE_MS, leaseToken: requested });
    if (decision.action !== 'run') return null;
    tx.update(stageRef, {
      state: 'running', attempts: decision.attempt, leaseToken: decision.leaseToken,
      leaseExpiresAtMs: decision.leaseExpiresAtMs, learningV2AutoRunRequested: false,
      startedAtMs: nowMs, startedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return decision;
  });
}

async function initializeRuntimeCheckpoint(
  stageRef: admin.firestore.DocumentReference,
  lease: { attempt: number; leaseToken: string },
  grounding: Readonly<Record<string, unknown>>,
): Promise<{ stage: Record<string, unknown>; expected: LearningV2LocalizedCourseShardCheckpointExpected; checkpoint: LearningV2LocalizedCourseShardCheckpoint }> {
  return admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists || !canCommitStageLease(snapshot.data() ?? {}, lease)) throw new Error('learning_v2_course_shard_lease_stale');
    const stage = snapshot.data() ?? {};
    const artifact = grounding.artifact as Record<string, unknown>;
    const result = artifact?.result as Record<string, unknown> | undefined;
    const packageId = String(result?.packageId ?? '').trim();
    const approvedOutlineFingerprint = String(grounding.approvedContentHash ?? '').trim();
    const runtimeFields = {
      learningV2PackageId: packageId,
      learningV2ApprovedOutlineFingerprint: approvedOutlineFingerprint,
      learningV2SessionPromptVersion: SESSION_PROMPT_VERSION,
    };
    const runtimeStage = { ...stage, ...runtimeFields };
    const expected = learningV2CourseShardExpectedFromStage(stageRef.id, runtimeStage);
    const checkpoint = stage.learningV2LocalizedCourseShardCheckpoint === undefined
      ? createLearningV2LocalizedCourseShardCheckpoint(expected)
      : parseLearningV2LocalizedCourseShardCheckpoint(stage.learningV2LocalizedCourseShardCheckpoint, expected);
    if (stage.learningV2LocalizedCourseShardCheckpoint === undefined) {
      tx.update(stageRef, {
        ...runtimeFields,
        learningV2LocalizedCourseShardCheckpoint: checkpoint,
        learningV2GeneratedSessionCount: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (stage.learningV2PackageId !== packageId || stage.learningV2ApprovedOutlineFingerprint !== approvedOutlineFingerprint ||
        stage.learningV2SessionPromptVersion !== SESSION_PROMPT_VERSION) {
      throw new Error('learning_v2_course_shard_runtime_plan_conflict');
    }
    return { stage: runtimeStage, expected, checkpoint };
  });
}

async function commitReceiptTransaction(
  stageRef: admin.firestore.DocumentReference,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
  lease: { attempt: number; leaseToken: string },
  receipt: LearningV2LocalizedSessionShardReceipt,
): Promise<LearningV2LocalizedCourseShardCheckpoint> {
  const db = admin.firestore();
  const receiptRef = db.collection('content_factory_learning_v2_session_shard_receipts')
    .doc(learningV2LocalizedSessionShardReceiptDocumentId(stageRef.id, receipt.taskOrdinal));
  return db.runTransaction(async (tx) => {
    const [stageSnapshot, receiptSnapshot] = await Promise.all([tx.get(stageRef), tx.get(receiptRef)]);
    if (!stageSnapshot.exists || !canCommitStageLease(stageSnapshot.data() ?? {}, lease)) throw new Error('learning_v2_course_shard_lease_stale');
    const stage = stageSnapshot.data() ?? {};
    const decision = decideLearningV2CourseShardReceiptAppend({
      expected,
      currentCheckpoint: stage.learningV2LocalizedCourseShardCheckpoint,
      storedReceipt: receiptSnapshot.exists ? receiptSnapshot.data() ?? null : null,
      incomingReceipt: receipt,
    });
    if (decision.kind === 'create_receipt_and_advance') tx.create(receiptRef, decision.receipt);
    if (decision.kind !== 'exact_replay') {
      tx.update(stageRef, {
        learningV2LocalizedCourseShardCheckpoint: decision.checkpoint,
        learningV2GeneratedSessionCount: decision.checkpoint.completedTaskCount,
        learningV2LastGeneratedTaskId: receipt.taskId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return decision.checkpoint;
  });
}

async function finalizeBatch(
  stageRef: admin.firestore.DocumentReference,
  expected: LearningV2LocalizedCourseShardCheckpointExpected,
  lease: { attempt: number; leaseToken: string },
  checkpoint: LearningV2LocalizedCourseShardCheckpoint,
): Promise<void> {
  const runtimeState = resolveLearningV2CourseShardRuntimeState(checkpoint, expected);
  await admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists || !canCommitStageLease(snapshot.data() ?? {}, lease)) throw new Error('learning_v2_course_shard_lease_stale');
    const base = {
      learningV2LocalizedCourseShardCheckpoint: checkpoint,
      learningV2GeneratedSessionCount: checkpoint.completedTaskCount,
      leaseToken: admin.firestore.FieldValue.delete(),
      leaseExpiresAtMs: admin.firestore.FieldValue.delete(),
      completedAtMs: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      errorCode: admin.firestore.FieldValue.delete(),
      errorMessage: admin.firestore.FieldValue.delete(),
      retryable: false,
    };
    if (runtimeState.state === 'queued') {
      tx.update(stageRef, { ...base, state: 'queued', learningV2AutoRunRequested: true, learningV2PauseReason: admin.firestore.FieldValue.delete(), learningV2RequiredWaveApproval: admin.firestore.FieldValue.delete() });
      return;
    }
    tx.update(stageRef, {
      ...base,
      state: 'paused',
      learningV2AutoRunRequested: false,
      learningV2PauseReason: runtimeState.pauseReason,
      learningV2RequiredWaveApproval: runtimeState.requiredWaveApproval ?? admin.firestore.FieldValue.delete(),
    });
  });
}

export const learningV2LocalizedCourseShardBackgroundWorker = onDocumentUpdated({
  document: 'content_factory_stages/{stageId}', region: REGION,
  secrets: [LEARNING_V2_COURSE_SHARD_OPENAI_API_KEY], timeoutSeconds: 540, memory: '2GiB', retry: false,
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const stage = after.data() ?? {};
  if (stage.kind !== STAGE_KIND || stage.state !== 'queued' || stage.learningV2AutoRunRequested !== true) return;
  const stageRef = after.ref;
  const lease = await acquireBackgroundLease(stageRef);
  if (!lease) return;
  try {
    const runningSnapshot = await stageRef.get();
    const running = runningSnapshot.data() ?? {};
    const prerequisiteStageIds = Array.isArray(running.prerequisiteStageIds) ? running.prerequisiteStageIds.map(String) : [];
    if (prerequisiteStageIds.length !== 1) throw new Error('learning_v2_grounding_prerequisite_required');
    const prerequisiteSnapshot = await admin.firestore().collection('content_factory_stages').doc(prerequisiteStageIds[0]).get();
    if (!prerequisiteSnapshot.exists) throw new Error('learning_v2_grounding_prerequisite_missing');
    const prerequisite = prerequisiteSnapshot.data() ?? {};
    const grounding = await loadApprovedLearningV2Prerequisite(admin.storage().bucket() as unknown as LearningV2GroundingBucketLike, {
      stageId: prerequisiteSnapshot.id, artifactId: String(prerequisite.artifactId ?? ''), kind: String(prerequisite.kind ?? ''), state: String(prerequisite.state ?? ''),
      requestId: String(prerequisite.requestId ?? ''), studyTarget: String(prerequisite.studyTarget ?? ''), sourceLocale: String(prerequisite.sourceLocale ?? ''), scopeId: String(prerequisite.scopeId ?? ''),
      objectPath: String(prerequisite.objectPath ?? ''), contentHash: String(prerequisite.contentHash ?? ''), objectGeneration: String(prerequisite.objectGeneration ?? ''), ownerApprovalTrail: prerequisite.ownerApprovalTrail,
    }, {
      kind: STAGE_KIND, requestId: String(running.requestId ?? ''), studyTarget: String(running.studyTarget ?? ''), sourceLocale: String(running.sourceLocale ?? ''), scopeId: String(running.scopeId ?? ''), ownerApprovalTrail: running.ownerApprovalTrail,
    });
    const runtime = await initializeRuntimeCheckpoint(stageRef, lease, grounding);
    const config = await resolveJobConfig(admin.firestore(), 'content_factory');
    assertJobEnabled(config, 'content_factory');
    const apiKey = String(LEARNING_V2_COURSE_SHARD_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    const provider = createOpenAiGenerationProvider(apiKey);
    const result = await runLearningV2LocalizedCourseShardBatch({
      stageId: stageRef.id,
      stageRevision: Number(runtime.stage.revision),
      targetLanguage: String(runtime.stage.studyTarget ?? ''),
      plan: runtime.expected.plan,
      checkpoint: runtime.checkpoint,
      approvedOutlineArtifact: grounding.artifact,
      provider,
      model: config.model,
      bucket: admin.storage().bucket(),
      commitReceipt: (receipt) => commitReceiptTransaction(stageRef, runtime.expected, lease, receipt),
      beforeProviderCall: (taskOrdinal, attempt) => reserveContentFactoryBudget(
        admin.firestore(), `${stageRef.id}:session:${taskOrdinal}:attempt:${attempt}`, config.globalDailyCap,
      ).then(() => undefined),
    });
    await finalizeBatch(stageRef, runtime.expected, lease, result.checkpoint);
  } catch (error) {
    const failure = buildGenerationFailureRecord(error, lease.attempt);
    await admin.firestore().runTransaction(async (tx) => {
      const snapshot = await tx.get(stageRef);
      if (!snapshot.exists || !canCommitStageLease(snapshot.data() ?? {}, lease)) return;
      tx.update(stageRef, {
        state: 'failed', errorCode: failure.code, errorMessage: failure.message,
        retryable: failure.retryable, attemptHistory: admin.firestore.FieldValue.arrayUnion(failure),
        learningV2AutoRunRequested: false,
        leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(),
        failedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }
});

export const adminApproveLearningV2CourseWave = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = hasAdminRole(request.auth?.token?.adminRole) ? request.auth!.token.adminRole : 'owner';
  if (!request.auth?.token?.admin || role !== 'owner' || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Admin owner only');
  const actorUid = request.auth.uid;
  const input = parseLearningV2CourseWaveApprovalRequest(request.data);
  const db = admin.firestore();
  const stageRef = db.collection('content_factory_stages').doc(input.stageId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
    const stage = snapshot.data() ?? {};
    if (stage.kind !== STAGE_KIND || stage.state !== 'paused' || stage.learningV2PauseReason !== 'owner_wave_approval_required' ||
        stage.learningV2RequiredWaveApproval !== input.waveId) throw new HttpsError('failed-precondition', 'learning_v2_course_wave_not_ready');
    const expected = learningV2CourseShardExpectedFromStage(stageRef.id, stage);
    const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(stage.learningV2LocalizedCourseShardCheckpoint, expected);
    if (checkpoint.checkpointFingerprint !== input.expectedCheckpointFingerprint) throw new HttpsError('aborted', 'learning_v2_course_wave_checkpoint_stale');
    const approved = approveLearningV2LocalizedCourseWave({ checkpoint, expected, waveId: input.waveId, reviewerId: 'owner', reviewedAtIso: new Date().toISOString() });
    const operationId = createHash('sha256').update(`${stageRef.id}\n${approved.checkpointFingerprint}\n${actorUid}`).digest('hex');
    tx.update(stageRef, {
      state: 'queued', learningV2AutoRunRequested: true,
      learningV2LocalizedCourseShardCheckpoint: approved,
      learningV2PauseReason: admin.firestore.FieldValue.delete(), learningV2RequiredWaveApproval: admin.firestore.FieldValue.delete(),
      learningV2LastWaveApprovalReason: input.reason, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.create(db.collection('admin_log').doc(operationId), {
      action: 'content_factory.learning_v2.wave.approve', actorUid, role,
      entity: { collection: 'content_factory_stages', id: stageRef.id }, operationId,
      reason: input.reason, before: { checkpointFingerprint: checkpoint.checkpointFingerprint },
      after: { waveId: input.waveId, checkpointFingerprint: approved.checkpointFingerprint }, timestamp: new Date().toISOString(),
    });
    return { ok: true, stageId: stageRef.id, waveId: input.waveId, state: 'queued', checkpointFingerprint: approved.checkpointFingerprint };
  });
});

export const adminRejectLearningV2CourseWave = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = hasAdminRole(request.auth?.token?.adminRole) ? request.auth!.token.adminRole : 'owner';
  if (!request.auth?.token?.admin || role !== 'owner' || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Admin owner only');
  const actorUid = request.auth.uid;
  const input = parseLearningV2CourseWaveApprovalRequest(request.data);
  const db = admin.firestore();
  const stageRef = db.collection('content_factory_stages').doc(input.stageId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(stageRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
    const stage = snapshot.data() ?? {};
    if (stage.kind !== STAGE_KIND || stage.state !== 'paused' || stage.learningV2PauseReason !== 'owner_wave_approval_required' ||
        stage.learningV2RequiredWaveApproval !== input.waveId) throw new HttpsError('failed-precondition', 'learning_v2_course_wave_not_ready');
    const expected = learningV2CourseShardExpectedFromStage(stageRef.id, stage);
    const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(stage.learningV2LocalizedCourseShardCheckpoint, expected);
    if (checkpoint.checkpointFingerprint !== input.expectedCheckpointFingerprint) throw new HttpsError('aborted', 'learning_v2_course_wave_checkpoint_stale');
    const operationId = createHash('sha256').update(`${stageRef.id}\n${checkpoint.checkpointFingerprint}\nreject\n${actorUid}`).digest('hex');
    tx.update(stageRef, {
      state: 'rejected',
      learningV2AutoRunRequested: false,
      learningV2RejectedWaveId: input.waveId,
      learningV2LastWaveRejectionReason: input.reason,
      learningV2PauseReason: admin.firestore.FieldValue.delete(),
      learningV2RequiredWaveApproval: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.create(db.collection('admin_log').doc(operationId), {
      action: 'content_factory.learning_v2.wave.reject', actorUid, role,
      entity: { collection: 'content_factory_stages', id: stageRef.id }, operationId,
      reason: input.reason,
      before: { waveId: input.waveId, checkpointFingerprint: checkpoint.checkpointFingerprint },
      after: { state: 'rejected' }, timestamp: new Date().toISOString(),
    });
    return { ok: true, stageId: stageRef.id, waveId: input.waveId, state: 'rejected', checkpointFingerprint: checkpoint.checkpointFingerprint };
  });
});

export const adminPreviewLearningV2CourseWave = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 120,
  memory: '1GiB',
}, async (request) => {
  const role = hasAdminRole(request.auth?.token?.adminRole) ? request.auth!.token.adminRole : 'owner';
  if (!request.auth?.token?.admin || !hasPermission(role, 'content.read')) throw new HttpsError('permission-denied', 'Admin only');
  const input = parseLearningV2CourseWavePreviewRequest(request.data);
  const db = admin.firestore();
  const stageRef = db.collection('content_factory_stages').doc(input.stageId);
  const stageSnapshot = await stageRef.get();
  if (!stageSnapshot.exists) throw new HttpsError('not-found', 'content_stage_not_found');
  const stage = stageSnapshot.data() ?? {};
  const waveId = stage.learningV2RequiredWaveApproval;
  if (stage.kind !== STAGE_KIND || stage.state !== 'paused' || stage.learningV2PauseReason !== 'owner_wave_approval_required' ||
      !['e1', 'chapter_1', 'season'].includes(String(waveId)) || input.episodeOrdinal > learningV2CourseWaveLastEpisode(waveId as 'e1' | 'chapter_1' | 'season')) {
    throw new HttpsError('failed-precondition', 'learning_v2_course_wave_not_ready');
  }
  const expected = learningV2CourseShardExpectedFromStage(stageRef.id, stage);
  const checkpoint = parseLearningV2LocalizedCourseShardCheckpoint(stage.learningV2LocalizedCourseShardCheckpoint, expected);
  const firstTaskOrdinal = (input.episodeOrdinal - 1) * 12 + 1;
  const receiptRefs = Array.from({ length: 12 }, (_, offset) => db.collection('content_factory_learning_v2_session_shard_receipts')
    .doc(learningV2LocalizedSessionShardReceiptDocumentId(stageRef.id, firstTaskOrdinal + offset)));
  const receiptSnapshots = await db.getAll(...receiptRefs);
  if (receiptSnapshots.length !== 12 || receiptSnapshots.some((snapshot) => !snapshot.exists)) {
    throw new HttpsError('data-loss', 'learning_v2_course_wave_receipt_missing');
  }
  let preview;
  try {
    preview = await loadLearningV2CourseWavePreview({
      stageId: stageRef.id,
      targetLanguage: String(stage.studyTarget ?? ''),
      waveId: waveId as 'e1' | 'chapter_1' | 'season',
      episodeOrdinal: input.episodeOrdinal,
      selectedSessionOrdinal: input.sessionOrdinal,
      checkpoint,
      expected,
      receipts: receiptSnapshots.map((snapshot) => snapshot.data()),
      bucket: admin.storage().bucket(),
    });
  } catch (error) {
    throw new HttpsError('data-loss', error instanceof Error ? error.message : 'learning_v2_course_wave_preview_invalid');
  }
  const finalSnapshot = await stageRef.get();
  const finalStage = finalSnapshot.data() ?? {};
  if (!finalSnapshot.exists || finalStage.state !== 'paused' || finalStage.learningV2RequiredWaveApproval !== waveId ||
      finalStage.learningV2PauseReason !== 'owner_wave_approval_required') {
    throw new HttpsError('aborted', 'learning_v2_course_wave_preview_stale');
  }
  const finalExpected = learningV2CourseShardExpectedFromStage(stageRef.id, finalStage);
  const finalCheckpoint = parseLearningV2LocalizedCourseShardCheckpoint(finalStage.learningV2LocalizedCourseShardCheckpoint, finalExpected);
  if (finalCheckpoint.checkpointFingerprint !== preview.checkpointFingerprint) {
    throw new HttpsError('aborted', 'learning_v2_course_wave_preview_stale');
  }
  return { ok: true, preview };
});

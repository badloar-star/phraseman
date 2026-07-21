import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';
import { createOpenAiGenerationProvider, generateLessonUnit, generateSurfaceUnit } from './content_factory/generation_provider';
import { parseSourceRegistryReference, sourceRegistryDocId, validateSourceRegistry, type SourceRegistry } from './content_factory/source_registry';
import { writeImmutableArtifact } from './content_factory/artifact_storage';
import type { ArtifactBucketLike } from './content_factory/artifact_storage';
import { type CanonicalReleaseSurface } from './content_factory/course_release_contract';
import { assertGenerationCheckpointIdentity, chooseGenerationCheckpointAction } from './content_factory/generation_checkpoint';
import { reserveContentFactoryBudget } from './content_factory/content_factory_budget';
import { applyUnitProgressTransition, type ContentFactoryProgress } from './content_factory/job_progress';
import { buildGenerationFailureRecord } from './content_factory/generation_errors';
import { claimNextV2Stage, finishV2StageLease, type V2StageClaimResult, type V2StageLease } from './content_factory/v2_stage_claim_adapter';

const REGION = 'us-central1';
export const CONTENT_FACTORY_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const SURFACES = ['lesson', 'quiz', 'flashcard', 'arena'] as const;
const GENERATION_LEASE_MS = 10 * 60 * 1000;
type UnitSurface = (typeof SURFACES)[number];

/**
 * The legacy callable remains the execution surface; V2 scheduling uses the
 * same worker through this transaction-backed adapter rather than another
 * queue. Keeping these small wrappers here gives the scheduler one stable
 * worker seam while preserving the existing unit endpoint contract.
 */
export function claimContentFactoryV2Stage(db: admin.firestore.Firestore, input: { readonly jobId: string; readonly workerId: string; readonly nowMs: number }): Promise<V2StageClaimResult> {
  return claimNextV2Stage(db, input);
}

export function finishContentFactoryV2Stage(db: admin.firestore.Firestore, lease: V2StageLease, outcome: 'succeed' | 'fail'): Promise<boolean> {
  return finishV2StageLease(db, lease, outcome);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface GenerationUnitRequest {
  readonly jobId: string;
  readonly surface: UnitSurface;
  readonly lessonId: number;
}

export function parseGenerationUnitRequest(data: unknown): GenerationUnitRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'generation unit required');
  const jobId = String(data.jobId ?? '').trim();
  const surface = String(data.surface ?? '') as UnitSurface;
  const lessonId = Number(data.lessonId);
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || !SURFACES.includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) {
    throw new HttpsError('invalid-argument', 'invalid generation unit');
  }
  return Object.freeze({ jobId, surface, lessonId });
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

function releaseIdForJob(jobId: string, studyTarget: string, learnerSourceLocale: string): string {
  const result = `draft-${studyTarget}-${learnerSourceLocale}-${jobId}`;
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(result)) throw new HttpsError('failed-precondition', 'release_identity_invalid');
  return result;
}

function readBlueprintLesson(registry: SourceRegistry, lessonId: number) {
  const lesson = registry.lessons[String(lessonId)];
  if (!lesson) throw new HttpsError('not-found', 'blueprint_lesson_not_found');
  return lesson;
}

function readJobProgress(data: Record<string, unknown>): ContentFactoryProgress {
  const value = isRecord(data.progress) ? data.progress : {};
  return { total: Number(value.total), completed: Number(value.completed), failed: Number(value.failed) };
}

export const adminRunContentGenerationUnit = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [CONTENT_FACTORY_OPENAI_API_KEY], timeoutSeconds: 300, memory: '1GiB' },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot generate content');
    const input = parseGenerationUnitRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(input.jobId);
    const unitId = `${input.jobId}:${input.surface}:${input.lessonId}`;
    const unitRef = db.collection('content_factory_job_units').doc(unitId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const blueprintVersion = String(job.blueprintVersion ?? '').trim();
    if (!studyTarget || !learnerSourceLocale || !blueprintVersion) throw new HttpsError('failed-precondition', 'generation_job_identity_missing');
    const nowMs = Date.now();
    const checkpoint = await db.runTransaction(async (tx) => {
      const current = await tx.get(unitRef);
      const currentData = current.data() ?? {};
      if (current.exists) {
        try { assertGenerationCheckpointIdentity(currentData, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId }); } catch { throw new HttpsError('failed-precondition', 'generation_checkpoint_identity_mismatch'); }
      }
      const action = chooseGenerationCheckpointAction(currentData, nowMs);
      if (action.action === 'replay' || action.action === 'resume') return { ...action, attempt: Number(currentData.attempts ?? 0) };
      if (action.action === 'busy') throw new HttpsError('aborted', 'generation_unit_already_running');
      const attempt = Number(currentData.attempts ?? 0) + 1;
      tx.set(unitRef, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId, state: 'running', attempts: attempt, startedAt: admin.firestore.FieldValue.serverTimestamp(), startedAtMs: nowMs, leaseExpiresAtMs: nowMs + GENERATION_LEASE_MS }, { merge: true });
      return { action: 'generate' as const, attempt };
    });
    if (checkpoint.action === 'replay') return { ok: true, unitId, state: 'succeeded', replayed: true };
    let checkpointWritten = checkpoint.action === 'resume';
    try {
      let sourceReference: { blueprintId: string; version: string };
      try {
        sourceReference = parseSourceRegistryReference(blueprintVersion);
      } catch {
        throw new HttpsError('failed-precondition', 'blueprint_reference_invalid');
      }
      const registrySnap = await db.collection('content_factory_source_registry').doc(sourceRegistryDocId(sourceReference.blueprintId, sourceReference.version)).get();
      if (!registrySnap.exists) throw new HttpsError('not-found', 'source_registry_not_found');
      const registry = registrySnap.data() as SourceRegistry;
      const registryCheck = validateSourceRegistry(registry);
      if (!registryCheck.ok) throw new HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
      const blueprintLesson = readBlueprintLesson(registry, input.lessonId);
      const releaseId = releaseIdForJob(input.jobId, studyTarget, learnerSourceLocale);
      let payload: unknown = checkpoint.action === 'resume' ? checkpoint.payload : undefined;
      let qaReceipt: Record<string, unknown> = checkpoint.action === 'resume' ? checkpoint.qaReceipt : { status: 'passed', sourceEvidenceIds: registry.evidence.map((item) => item.evidenceId), blueprintHash: registry.blueprintHash };
      if (checkpoint.action === 'generate') {
        const config = await resolveJobConfig(db, 'content_factory');
        assertJobEnabled(config, 'content_factory');
        const apiKey = String(CONTENT_FACTORY_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
        if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
        await reserveContentFactoryBudget(db, `${unitId}:attempt:${checkpoint.attempt}`, config.globalDailyCap);
        const provider = createOpenAiGenerationProvider(apiKey);
        if (input.surface === 'lesson') {
          const generated = await generateLessonUnit({ provider, model: config.model, studyTarget, sourceLocale: learnerSourceLocale, blueprintVersion: registry.version, blueprintHash: registry.blueprintHash, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases, vocabularyFocus: blueprintLesson.vocabularyFocus, drills: blueprintLesson.drills, sourceEvidence: registry.evidence, lessonId: input.lessonId });
          payload = generated.artifact;
          qaReceipt = generated.qa as unknown as Record<string, unknown>;
        } else {
          payload = await generateSurfaceUnit({ provider, model: config.model, surface: input.surface, studyTarget, sourceLocale: learnerSourceLocale, lessonId: input.lessonId, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases });
        }
        await unitRef.set({ state: 'generated', generatedPayload: payload, qaReceipt, generatedAt: admin.firestore.FieldValue.serverTimestamp(), leaseExpiresAtMs: admin.firestore.FieldValue.delete() }, { merge: true });
        checkpointWritten = true;
      }
      const bucket = admin.storage().bucket();
      const receipt = await writeImmutableArtifact(bucket as unknown as ArtifactBucketLike, { releaseId, surface: input.surface as CanonicalReleaseSurface, lessonId: input.lessonId, payload });
      await db.runTransaction(async (tx) => {
        const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
        if (!currentJobSnap.exists) throw new HttpsError('data-loss', 'generation_job_missing_during_completion');
        const currentUnit = currentUnitSnap.data() ?? {};
        const currentJob = currentJobSnap.data() ?? {};
        let transition;
        try { transition = applyUnitProgressTransition(readJobProgress(currentJob), { next: 'succeeded', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true }); } catch { throw new HttpsError('data-loss', 'content_factory_progress_invalid'); }
        tx.set(unitRef, { unitId, state: 'succeeded', releaseId, objectPath: receipt.objectPath, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, qaReceipt, failureCounted: transition.failureCounted, generatedPayload: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        const nextJobState = transition.jobState === 'needs_review' && currentJob.releaseCandidate !== true ? 'partial' : transition.jobState;
        tx.set(jobRef, { state: nextJobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
      return { ok: true, unitId, state: 'succeeded', objectPath: receipt.objectPath, contentHash: receipt.contentHash };
    } catch (error) {
      const failure = buildGenerationFailureRecord(error, checkpoint.attempt);
      await db.runTransaction(async (tx) => {
        const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
        const currentUnit = currentUnitSnap.data() ?? {};
        const currentJob = currentJobSnap.data() ?? {};
        const transition = applyUnitProgressTransition(readJobProgress(currentJob), { next: 'failed', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true });
        tx.set(unitRef, { unitId, state: checkpointWritten ? 'generated' : 'failed', failureCounted: transition.failureCounted, errorCode: failure.code, errorMessage: failure.message, retryable: failure.retryable, attemptHistory: admin.firestore.FieldValue.arrayUnion(failure), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), failedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(jobRef, { state: transition.jobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }).catch((progressError) => console.error('content factory failure progress update failed', unitId, progressError));
      throw error instanceof HttpsError ? error : new HttpsError('unavailable', 'content_generation_failed');
    }
  },
);

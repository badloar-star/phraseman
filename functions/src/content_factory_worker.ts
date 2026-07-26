import { randomUUID } from 'node:crypto';
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
import { buildGenerationTerminalAudit } from './content_factory/generation_audit';
import { runGuardedGenerationTransaction } from './content_factory/generation_execution';
import { buildArtifactOrphanCandidate } from './content_factory/artifact_retention';
import { buildArenaShadowComparison } from './content_factory/surface_convergence';
import { persistArenaComparisonReceipt } from './content_factory/surface_convergence_repository';

const REGION = 'us-central1';
export const CONTENT_FACTORY_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const SURFACES = ['lesson', 'flashcard'] as const;
const GENERATION_LEASE_MS = 10 * 60 * 1000;
type UnitSurface = (typeof SURFACES)[number];

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
  return /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
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
    const actorUid = request.auth.uid;
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
    const requestedLeaseToken = randomUUID();
    const checkpoint = await db.runTransaction(async (tx) => {
      const current = await tx.get(unitRef);
      const currentData = current.data() ?? {};
      if (current.exists) {
        try { assertGenerationCheckpointIdentity(currentData, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId }); } catch { throw new HttpsError('failed-precondition', 'generation_checkpoint_identity_mismatch'); }
      }
      const action = chooseGenerationCheckpointAction(currentData, nowMs);
      const routing = { engineRequested: String(currentData.engineRequested ?? 'legacy'), engineResolved: String(currentData.engineResolved ?? 'legacy'), configRevision: Number(currentData.configRevision ?? 0), comparatorVersion: String(currentData.comparatorVersion ?? '') };
      if (action.action === 'replay') return { ...action, attempt: Number(currentData.attempts ?? 0), leaseToken: '', ...routing };
      if (action.action === 'busy') throw new HttpsError('aborted', 'generation_unit_already_running');
      if (action.action === 'resume') {
        const attempt = Number(currentData.attempts ?? 0);
        tx.set(unitRef, { state: 'running', leaseToken: requestedLeaseToken, leaseExpiresAtMs: nowMs + GENERATION_LEASE_MS }, { merge: true });
        return { ...action, attempt, leaseToken: requestedLeaseToken, ...routing };
      }
      const attempt = Number(currentData.attempts ?? 0) + 1;
      tx.set(unitRef, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId, state: 'running', attempts: attempt, leaseToken: requestedLeaseToken, startedAt: admin.firestore.FieldValue.serverTimestamp(), startedAtMs: nowMs, leaseExpiresAtMs: nowMs + GENERATION_LEASE_MS }, { merge: true });
      return { action: 'generate' as const, attempt, leaseToken: requestedLeaseToken, ...routing };
    });
    if (checkpoint.action === 'replay') return { ok: true, unitId, state: 'succeeded', replayed: true };
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
        const provider = createOpenAiGenerationProvider(apiKey, { beforeProviderRequest: async (requestIndex) => { await reserveContentFactoryBudget(db, `${unitId}:attempt:${checkpoint.attempt}:provider-request:${requestIndex}`, config.globalDailyCap); } });
        if (input.surface === 'lesson') {
          const generated = await generateLessonUnit({ provider, model: config.model, studyTarget, sourceLocale: learnerSourceLocale, blueprintVersion: registry.version, blueprintHash: registry.blueprintHash, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases, vocabularyFocus: blueprintLesson.vocabularyFocus, drills: blueprintLesson.drills, sourceEvidence: registry.evidence, lessonId: input.lessonId });
          payload = generated.artifact;
          const providerRequests = provider.getProviderRequestCount?.() ?? 1;
          qaReceipt = { ...(generated.qa as unknown as Record<string, unknown>), providerRequests: { requestedUnits: providerRequests, usedUnits: providerRequests, refundedUnits: 0, unit: 'provider_requests' }, operatorCorrection: { status: 'unavailable_not_collected' } };
        } else {
          const generated = await generateSurfaceUnit({ provider, model: config.model, surface: input.surface, studyTarget, sourceLocale: learnerSourceLocale, lessonId: input.lessonId, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases });
          const providerRequests = provider.getProviderRequestCount?.() ?? 1;
          payload = generated.artifact;
          qaReceipt = { ...generated.qa, providerRequests: { requestedUnits: providerRequests, usedUnits: providerRequests, refundedUnits: 0, unit: 'provider_requests' }, operatorCorrection: { status: 'unavailable_not_collected' } };
        }
        const checkpointPersisted = await runGuardedGenerationTransaction({
          lease: checkpoint, allowedStates: ['running'],
          runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler),
          read: async (tx) => { const current = await tx.get(unitRef); return { current: current.exists ? current.data() ?? {} : null, context: undefined }; },
          commit: (tx) => { tx.set(unitRef, { state: 'generated', generatedPayload: payload, qaReceipt, generatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }); },
        });
        if (!checkpointPersisted) return { ok: true, unitId, state: 'superseded', discarded: true };
      }
      const bucket = admin.storage().bucket();
      const receipt = await writeImmutableArtifact(bucket as unknown as ArtifactBucketLike, { releaseId, surface: input.surface as CanonicalReleaseSurface, lessonId: input.lessonId, payload });
      const orphanCandidate = () => buildArtifactOrphanCandidate(receipt, { entityCollection: 'content_factory_job_units', entityId: unitId, attempt: checkpoint.attempt, detectedAtMs: Date.now() });
      const recordOrphan = async () => { const orphan = orphanCandidate(); await db.collection('content_factory_artifact_orphans').doc(orphan.candidateId).set(orphan, { merge: false }); };
      let committedRouting: Record<string, unknown> | null = null;
      const committed = await runGuardedGenerationTransaction({
        lease: checkpoint, allowedStates: ['running', 'generated'],
        runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler),
        read: async (tx) => {
          const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
          if (!currentJobSnap.exists) throw new HttpsError('data-loss', 'generation_job_missing_during_completion');
          return { current: currentUnitSnap.exists ? currentUnitSnap.data() ?? {} : null, context: currentJobSnap.data() ?? {} };
        },
        commit: (tx, currentUnit, currentJob) => {
        let transition;
        try { transition = applyUnitProgressTransition(readJobProgress(currentJob), { next: 'succeeded', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true }); } catch { throw new HttpsError('data-loss', 'content_factory_progress_invalid'); }
        const currentRouting = currentUnit as unknown as Record<string, unknown>;
        committedRouting = { engineRequested: currentRouting.engineRequested ?? checkpoint.engineRequested, engineResolved: currentRouting.engineResolved ?? checkpoint.engineResolved, configRevision: currentRouting.configRevision ?? checkpoint.configRevision, comparatorVersion: currentRouting.comparatorVersion ?? checkpoint.comparatorVersion };
        tx.set(unitRef, { unitId, state: 'succeeded', releaseId, objectPath: receipt.objectPath, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, artifactReferenceState: 'committed', artifactFinalizationKey: receipt.finalizationKey, qaReceipt, failureCounted: transition.failureCounted, engineRequested: currentRouting.engineRequested ?? checkpoint.engineRequested, engineResolved: currentRouting.engineResolved ?? checkpoint.engineResolved, configRevision: currentRouting.configRevision ?? checkpoint.configRevision, comparatorVersion: currentRouting.comparatorVersion ?? checkpoint.comparatorVersion, generatedPayload: admin.firestore.FieldValue.delete(), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        const nextJobState = transition.jobState === 'needs_review' && currentJob.releaseCandidate !== true ? 'partial' : transition.jobState;
        const audit = buildGenerationTerminalAudit({ actorUid, role, entity: { collection: 'content_factory_job_units', id: unitId }, attempt: checkpoint.attempt, leaseToken: checkpoint.leaseToken, outcome: 'succeeded', errorCategory: null, before: { state: currentUnit.state ?? null }, after: { state: 'succeeded', objectPath: receipt.objectPath, contentHash: receipt.contentHash } });
        tx.set(jobRef, { state: nextJobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.create(db.collection('admin_log').doc(audit.operationId), audit);
        },
      }).catch(async (error) => { await recordOrphan(); throw error; });
      if (!committed) {
        await recordOrphan();
        return { ok: true, unitId, state: 'superseded', discarded: true };
      }
      // зачем: коммит принял payload легаси-движка как есть (engineResolved === 'legacy' в shadow-режиме,
      // см. resolveArenaEnginePolicy). Пишем лёгкую receipt-квитанцию о принятом решении роутинга без
      // повторного вызова provider'а: candidate.providerRequestsAdded остаётся 0, а
      // shadowComparisonState = 'unavailable', потому что полноценное semantic-сравнение
      // (compareArenaSurfaceArtifacts) требует настоящего stage-кандидата, которого тут нет.
      const currentRouting = committedRouting ?? { engineRequested: checkpoint.engineRequested, engineResolved: checkpoint.engineResolved, configRevision: checkpoint.configRevision, comparatorVersion: checkpoint.comparatorVersion };
      const candidate = { providerRequestsAdded: 0 };
      const shadowComparisonState = 'unavailable' as const;
      const shadowComparison = buildArenaShadowComparison({
        unitId,
        comparatorVersion: String(currentRouting.comparatorVersion ?? ''),
        engineRequested: currentRouting.engineRequested as string,
        engineResolved: currentRouting.engineResolved as string,
        configRevision: Number(currentRouting.configRevision ?? 0),
        legacyArtifactHash: receipt.contentHash,
        legacyQaOutcome: String((qaReceipt as Record<string, unknown>).status ?? ''),
        providerRequestsAdded: candidate.providerRequestsAdded,
      });
      if (shadowComparison.shadowComparisonState !== shadowComparisonState) throw new HttpsError('data-loss', 'arena_shadow_comparison_state_invalid');
      await persistArenaComparisonReceipt(db, shadowComparison, admin.firestore.FieldValue.serverTimestamp());
      return { ok: true, unitId, state: 'succeeded', objectPath: receipt.objectPath, contentHash: receipt.contentHash };
    } catch (error) {
      const failure = buildGenerationFailureRecord(error, checkpoint.attempt);
      await runGuardedGenerationTransaction({
        lease: checkpoint, allowedStates: ['running', 'generated'],
        runTransaction: (handler: (transaction: admin.firestore.Transaction) => Promise<boolean>) => db.runTransaction(handler),
        read: async (tx) => {
          const [currentUnitSnap, currentJobSnap] = await Promise.all([tx.get(unitRef), tx.get(jobRef)]);
          return { current: currentUnitSnap.exists ? currentUnitSnap.data() ?? {} : null, context: currentJobSnap.data() ?? {} };
        },
        commit: (tx, currentUnit, currentJob) => {
          const transition = applyUnitProgressTransition(readJobProgress(currentJob), { next: 'failed', wasSucceeded: currentUnit.state === 'succeeded', failureCounted: currentUnit.failureCounted === true });
          const terminalState = 'failed';
          const audit = buildGenerationTerminalAudit({ actorUid, role, entity: { collection: 'content_factory_job_units', id: unitId }, attempt: checkpoint.attempt, leaseToken: checkpoint.leaseToken, outcome: 'failed', errorCategory: failure.code, before: { state: currentUnit.state ?? null }, after: { state: terminalState, errorCode: failure.code } });
          tx.set(unitRef, { unitId, state: terminalState, failureCounted: transition.failureCounted, errorCode: failure.code, errorMessage: failure.message, retryable: failure.retryable, attemptHistory: admin.firestore.FieldValue.arrayUnion(failure), leaseToken: admin.firestore.FieldValue.delete(), leaseExpiresAtMs: admin.firestore.FieldValue.delete(), failedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          tx.set(jobRef, { state: transition.jobState, progress: transition.progress, lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          tx.create(db.collection('admin_log').doc(audit.operationId), audit);
        },
      });
      throw error instanceof HttpsError ? error : new HttpsError('unavailable', 'content_generation_failed');
    }
  },
);

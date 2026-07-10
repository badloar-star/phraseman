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

const REGION = 'us-central1';
export const CONTENT_FACTORY_OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const SURFACES = ['lesson', 'quiz', 'flashcard', 'arena'] as const;
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
    const existingUnit = await unitRef.get();
    if (existingUnit.exists && existingUnit.data()?.state === 'succeeded') return { ok: true, unitId, state: 'succeeded', replayed: true };
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const blueprintVersion = String(job.blueprintVersion ?? '').trim();
    if (!studyTarget || !learnerSourceLocale || !blueprintVersion) throw new HttpsError('failed-precondition', 'generation_job_identity_missing');
    await db.runTransaction(async (tx) => {
      const current = await tx.get(unitRef);
      if (current.exists && current.data()?.state === 'succeeded') return;
      tx.set(unitRef, { unitId, jobId: input.jobId, studyTarget, learnerSourceLocale, surface: input.surface, lessonId: input.lessonId, state: 'running', attempts: Number(current.data()?.attempts ?? 0) + 1, startedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
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
      const config = await resolveJobConfig(db, 'content_factory');
      assertJobEnabled(config, 'content_factory');
      const apiKey = String(CONTENT_FACTORY_OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
      if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
      const provider = createOpenAiGenerationProvider(apiKey);
      const releaseId = releaseIdForJob(input.jobId, studyTarget, learnerSourceLocale);
      let payload: unknown;
      let qaReceipt: Record<string, unknown> = { status: 'passed', sourceEvidenceIds: registry.evidence.map((item) => item.evidenceId), blueprintHash: registry.blueprintHash };
      if (input.surface === 'lesson') {
        const generated = await generateLessonUnit({ provider, model: config.model, studyTarget, sourceLocale: learnerSourceLocale, blueprintVersion: registry.version, blueprintHash: registry.blueprintHash, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases, vocabularyFocus: blueprintLesson.vocabularyFocus, drills: blueprintLesson.drills, sourceEvidence: registry.evidence, lessonId: input.lessonId });
        payload = generated.artifact;
        qaReceipt = generated.qa as unknown as Record<string, unknown>;
      } else {
        payload = await generateSurfaceUnit({ provider, model: config.model, surface: input.surface, studyTarget, sourceLocale: learnerSourceLocale, lessonId: input.lessonId, topic: blueprintLesson.topic, sourcePhrases: blueprintLesson.sourcePhrases });
      }
      const bucket = admin.storage().bucket();
      const receipt = await writeImmutableArtifact(bucket as unknown as ArtifactBucketLike, { releaseId, surface: input.surface as CanonicalReleaseSurface, lessonId: input.lessonId, payload });
      await unitRef.set({ unitId, state: 'succeeded', releaseId, objectPath: receipt.objectPath, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, qaReceipt, completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await jobRef.set({ state: 'partial', lastUnitId: unitId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return { ok: true, unitId, state: 'succeeded', objectPath: receipt.objectPath, contentHash: receipt.contentHash };
    } catch (error) {
      await unitRef.set({ unitId, state: 'failed', errorCode: error instanceof HttpsError ? error.code : 'generation_failed', errorMessage: error instanceof Error ? error.message.slice(0, 300) : 'generation_failed', failedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      throw error instanceof HttpsError ? error : new HttpsError('unavailable', 'content_generation_failed');
    }
  },
);

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { createGenerationJob, type FactorySurface } from './content_factory/contracts';
import { splitGenerationJob, type GenerationUnit } from './content_factory/job_service';
import { inspectSourceRegistryCoverage, parseSourceRegistryReference, sourceRegistryDocId, validateSourceRegistry, type SourceRegistry } from './content_factory/source_registry';
import { CANONICAL_RELEASE_SURFACES } from './content_factory/course_release_contract';
import { generationPlanFingerprint } from './content_factory/generation_plan';

const REGION = 'us-central1';
const SURFACES: readonly FactorySurface[] = ['lessons', 'vocabulary', 'drills', 'quizzes', 'cards', 'arena_questions'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface ContentFactoryJobRequest {
  readonly projectId: string;
  readonly studyTarget: string;
  readonly sourceLocale: string;
  readonly lessonIds: readonly number[];
  readonly surfaces: readonly FactorySurface[];
  readonly idempotencyKey: string;
  readonly blueprintVersion: string;
}

export function parseContentFactoryJobRequest(data: unknown): ContentFactoryJobRequest {
  if (!isRecord(data) || !Array.isArray(data.lessonIds) || !Array.isArray(data.surfaces)) {
    throw new HttpsError('invalid-argument', 'lessonIds and surfaces are required');
  }
  const lessonIds = data.lessonIds.map(Number);
  const surfaces = data.surfaces.map(String) as FactorySurface[];
  if (!lessonIds.every(Number.isInteger) || lessonIds.length > 100 || lessonIds.some((id) => id < 1)) {
    throw new HttpsError('invalid-argument', 'lessonIds must contain 1..100 positive integers');
  }
  if (!surfaces.length || surfaces.some((surface) => !SURFACES.includes(surface))) {
    throw new HttpsError('invalid-argument', 'unsupported generation surface');
  }
  const result = {
    projectId: String(data.projectId ?? '').trim(),
    studyTarget: String(data.studyTarget ?? '').trim(),
    sourceLocale: String(data.sourceLocale ?? '').trim(),
    lessonIds,
    surfaces,
    idempotencyKey: String(data.idempotencyKey ?? '').trim(),
    blueprintVersion: String(data.blueprintVersion ?? '').trim(),
  };
  if (Object.values(result).some((value) => typeof value === 'string' && !value)) {
    throw new HttpsError('invalid-argument', 'project, language, locale, operation and blueprint are required');
  }
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(result.projectId) || !/^[A-Za-z0-9._-]{1,160}$/.test(result.idempotencyKey) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(result.studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(result.sourceLocale) || new Set(lessonIds).size !== lessonIds.length) {
    throw new HttpsError('invalid-argument', 'invalid content factory identity or duplicate lesson');
  }
  try { parseSourceRegistryReference(result.blueprintVersion); } catch { throw new HttpsError('invalid-argument', 'blueprintVersion must be blueprintId:version'); }
  return Object.freeze({ ...result, lessonIds: Object.freeze([...lessonIds]), surfaces: Object.freeze([...surfaces]) });
}

export interface ContentFactoryJobPlan {
  readonly job: ReturnType<typeof createGenerationJob> & { readonly learnerSourceLocale: string; readonly releaseCandidate: boolean };
  readonly units: readonly GenerationUnit[];
}

export function assertContentFactorySourceCoverage(registry: SourceRegistry, lessonIds: readonly number[]): void {
  const coverage = inspectSourceRegistryCoverage(registry, lessonIds);
  if (!coverage.ok) {
    throw new HttpsError('failed-precondition', 'source_coverage', { missingLessonIds: coverage.missingLessonIds });
  }
}

export function storedGenerationPlanFingerprint(value: Record<string, unknown>): string {
  if (typeof value.planFingerprint === 'string' && value.planFingerprint) return value.planFingerprint;
  if (!Array.isArray(value.lessonIds) || !Array.isArray(value.surfaces)) return '';
  return generationPlanFingerprint(value.lessonIds.map(Number), value.surfaces.map(String) as FactorySurface[]);
}

export function buildContentFactoryJobPlan(input: ContentFactoryJobRequest, actorUid: string, now = new Date().toISOString()): ContentFactoryJobPlan {
  const units = splitGenerationJob({ jobId: input.idempotencyKey, studyTarget: input.studyTarget, learnerSourceLocale: input.sourceLocale, lessonIds: input.lessonIds, surfaces: input.surfaces });
  const base = createGenerationJob({ ...input, requestedBy: actorUid, now });
  const plannedSurfaces = new Set(units.map((unit) => unit.surface));
  const releaseCandidate = CANONICAL_RELEASE_SURFACES.every((surface) => plannedSurfaces.has(surface));
  const job = Object.freeze({ ...base, learnerSourceLocale: input.sourceLocale, releaseCandidate, progress: Object.freeze({ total: units.length, completed: 0, failed: 0 }) });
  return Object.freeze({ job, units: Object.freeze(units) });
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

export const adminCreateContentGenerationJob = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
    if (!hasPermission(role, 'content.draft.write')) throw new HttpsError('permission-denied', 'Role cannot create content drafts');
    const actorUid = request.auth.uid;
    const input = parseContentFactoryJobRequest(request.data);
      const db = admin.firestore();
      const sourceReference = parseSourceRegistryReference(input.blueprintVersion);
      const registrySnap = await db.collection('content_factory_source_registry').doc(sourceRegistryDocId(sourceReference.blueprintId, sourceReference.version)).get();
      if (!registrySnap.exists) throw new HttpsError('not-found', 'source_registry_not_found');
      const registry = registrySnap.data() as SourceRegistry;
      const registryValidation = validateSourceRegistry(registry);
      if (!registryValidation.ok) throw new HttpsError('failed-precondition', 'source_registry_invalid', { errors: registryValidation.errors });
      assertContentFactorySourceCoverage(registry, input.lessonIds);
      const plan = buildContentFactoryJobPlan(input, actorUid);
      const job = plan.job;
      const jobRef = db.collection('content_factory_jobs').doc(job.idempotencyKey);
    return db.runTransaction(async (tx) => {
      const existing = await tx.get(jobRef);
      if (existing.exists) {
        const previous = existing.data() ?? {};
        if (previous.projectId !== job.projectId || previous.studyTarget !== job.studyTarget || previous.sourceLocale !== job.sourceLocale || previous.blueprintVersion !== job.blueprintVersion || storedGenerationPlanFingerprint(previous) !== job.planFingerprint) {
          throw new HttpsError('already-exists', 'idempotencyKey belongs to another job');
        }
        return { ok: true, jobId: job.idempotencyKey, state: previous.state ?? 'queued', replayed: true };
      }
      tx.create(jobRef, { ...job, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      plan.units.forEach((unit) => tx.create(db.collection('content_factory_job_units').doc(unit.unitId), unit));
      tx.create(db.collection('admin_log').doc(), {
        action: 'content_factory.job.create',
        actorUid,
        role,
        entity: { collection: 'content_factory_jobs', id: job.idempotencyKey },
        reason: 'Language Factory generation job created',
        requestId: String(request.data && isRecord(request.data) ? request.data.requestId ?? '' : ''),
        timestamp: new Date().toISOString(),
        operationId: job.idempotencyKey,
      });
      return { ok: true, jobId: job.idempotencyKey, state: job.state, replayed: false };
    });
  },
);

export const adminListContentFactoryJobs = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.read')) throw new HttpsError('permission-denied', 'Role cannot read content jobs');
    const requestedLimit = Number(request.data?.limit ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    const studyTarget = String(request.data?.studyTarget ?? '').trim();
    const snapshot = await admin.firestore().collection('content_factory_jobs').limit(100).get();
    const jobs = snapshot.docs
      .map((doc): Record<string, unknown> & { id: string } => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((job) => !studyTarget || job.studyTarget === studyTarget)
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, limit);
    return { ok: true, jobs };
  },
);

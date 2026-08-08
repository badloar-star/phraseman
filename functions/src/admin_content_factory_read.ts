import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface } from './content_factory/course_release_contract';
import { parseHashedJsonBytes } from './content_factory/release_surface_delivery';
import { courseCatalogId } from './language_release';
import { deriveContentFactoryRolloutMetricsFromDocuments } from './content_factory/rollout_metrics';
import { CONTENT_FACTORY_BUDGET_COLLECTION } from './content_factory/content_factory_budget';
import { resolveJobConfig } from './openai_jobs_config';

const REGION = 'us-central1';
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
const SURFACE_ORDER = new Map<string, number>(CANONICAL_RELEASE_SURFACES.map((surface, index) => [surface, index]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
}

function requireContentReader(request: { auth?: { token?: Record<string, unknown> } }): void {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFromToken(request.auth.token);
  if (!role || !hasPermission(role, 'content.read')) throw new HttpsError('permission-denied', 'Role cannot read content');
}

function parseToken(value: unknown, field: string): string {
  const token = String(value ?? '').trim();
  if (!TOKEN_RE.test(token)) throw new HttpsError('invalid-argument', `${field} is invalid`);
  return token;
}

export function parseContentFactoryJobDetailRequest(data: unknown): { jobId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'job detail request required');
  return Object.freeze({ jobId: parseToken(data.jobId, 'jobId') });
}

export function parseContentFactoryUnitPreviewRequest(data: unknown): { unitId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'unit preview request required');
  return Object.freeze({ unitId: parseToken(data.unitId, 'unitId') });
}

export interface ContentFactoryWorkspaceRequest {
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly limit: number;
}

export function parseContentFactoryWorkspaceRequest(data: unknown): ContentFactoryWorkspaceRequest {
  if (data !== undefined && data !== null && !isRecord(data)) throw new HttpsError('invalid-argument', 'workspace request must be an object');
  const record = isRecord(data) ? data : {};
  const studyTarget = String(record.studyTarget ?? '').trim();
  const learnerSourceLocale = String(record.learnerSourceLocale ?? record.sourceLocale ?? '').trim();
  if ((studyTarget && !LOCALE_RE.test(studyTarget)) || (learnerSourceLocale && !LOCALE_RE.test(learnerSourceLocale))) {
    throw new HttpsError('invalid-argument', 'workspace language identity is invalid');
  }
  const requestedLimit = Number(record.limit ?? 50);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
  return Object.freeze({ studyTarget, learnerSourceLocale, limit });
}

type ReadDocument = Record<string, unknown> & { id?: string; unitId?: string };

export interface ContentFactoryJobDetailInput {
  readonly jobId: string;
  readonly job: ReadDocument;
  readonly units: readonly ReadDocument[];
  readonly review: ReadDocument | null;
  readonly release: ReadDocument | null;
  readonly catalog: ReadDocument | null;
}

export function buildContentFactoryJobDetail(input: ContentFactoryJobDetailInput): Readonly<ContentFactoryJobDetailInput> {
  const units: ReadDocument[] = input.units.map((unit): ReadDocument => ({
    ...unit,
    attemptHistory: Object.freeze(Array.isArray(unit.attemptHistory) ? [...unit.attemptHistory] : []),
  })).sort((left, right) => {
    const lessonDelta = Number(left.lessonId ?? 0) - Number(right.lessonId ?? 0);
    if (lessonDelta) return lessonDelta;
    const surfaceDelta = (SURFACE_ORDER.get(String(left.surface ?? '')) ?? 99) - (SURFACE_ORDER.get(String(right.surface ?? '')) ?? 99);
    return surfaceDelta || String(left.unitId ?? left.id ?? '').localeCompare(String(right.unitId ?? right.id ?? ''));
  });
  return Object.freeze({ ...input, units: Object.freeze(units) });
}

function withId(doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot): ReadDocument {
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) };
}

export const adminGetContentFactoryJobDetail = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireContentReader(request as { auth?: { token?: Record<string, unknown> } });
    const { jobId } = parseContentFactoryJobDetailRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(jobId);
    const reviewRef = db.collection('content_factory_job_reviews').doc(jobId);
    const [jobSnap, unitsSnap, reviewSnap] = await Promise.all([
      jobRef.get(),
      db.collection('content_factory_job_units').where('jobId', '==', jobId).limit(400).get(),
      reviewRef.get(),
    ]);
    if (!jobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
    const job = withId(jobSnap);
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    let catalog: ReadDocument | null = null;
    let release: ReadDocument | null = null;
    if (LOCALE_RE.test(studyTarget) && LOCALE_RE.test(learnerSourceLocale)) {
      const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${jobId}`;
      const [catalogSnap, releaseSnap] = await Promise.all([
        db.collection('content_factory_catalog').doc(courseCatalogId(studyTarget, learnerSourceLocale)).get(),
        db.collection('content_factory_releases').doc(releaseId).get(),
      ]);
      catalog = catalogSnap.exists ? withId(catalogSnap) : null;
      release = releaseSnap.exists ? withId(releaseSnap) : null;
    }
    return {
      ok: true,
      ...buildContentFactoryJobDetail({
        jobId,
        job,
        units: unitsSnap.docs.map(withId),
        review: reviewSnap.exists ? withId(reviewSnap) : null,
        release,
        catalog,
      }),
    };
  },
);

export const adminGetContentFactoryUnitPreview = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    requireContentReader(request as { auth?: { token?: Record<string, unknown> } });
    const { unitId } = parseContentFactoryUnitPreviewRequest(request.data);
    const unitSnap = await admin.firestore().collection('content_factory_job_units').doc(unitId).get();
    if (!unitSnap.exists) throw new HttpsError('not-found', 'generation_unit_not_found');
    const unit = withId(unitSnap);
    const releaseId = String(unit.releaseId ?? '').trim();
    const surface = String(unit.surface ?? '') as CanonicalReleaseSurface;
    const lessonId = Number(unit.lessonId);
    const objectPath = String(unit.objectPath ?? '').trim();
    const contentHash = String(unit.contentHash ?? '').trim();
    const objectGeneration = String(unit.objectGeneration ?? '').trim();
    const expectedPath = `course-releases/${releaseId}/${surface}/${lessonId}.json`;
    if (unit.state !== 'succeeded' || !TOKEN_RE.test(releaseId) || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100 || objectPath !== expectedPath || !HASH_RE.test(contentHash) || !objectGeneration) {
      throw new HttpsError('failed-precondition', 'generation_unit_is_not_previewable');
    }
    const file = admin.storage().bucket().file(objectPath);
    const [metadata] = await file.getMetadata();
    if (String(metadata.generation ?? '') !== objectGeneration) throw new HttpsError('data-loss', 'generation_unit_object_generation_mismatch');
    const [bytes] = await file.download({ validation: false });
    let payload: unknown;
    try { payload = parseHashedJsonBytes(bytes, contentHash); } catch (error) {
      throw new HttpsError('data-loss', error instanceof Error ? error.message : 'generation_unit_payload_invalid');
    }
    return { ok: true, unit, payload, qaReceipt: isRecord(unit.qaReceipt) ? unit.qaReceipt : null };
  },
);

export const adminGetContentFactoryWorkspace = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireContentReader(request as { auth?: { token?: Record<string, unknown> } });
    const input = parseContentFactoryWorkspaceRequest(request.data);
    const db = admin.firestore();
    const workspaceQuery = (collection: string): admin.firestore.Query => {
      let query: admin.firestore.Query = db.collection(collection);
      if (input.studyTarget) query = query.where('studyTarget', '==', input.studyTarget);
      if (input.learnerSourceLocale) query = query.where('learnerSourceLocale', '==', input.learnerSourceLocale);
      return query;
    };
    const [catalogsSnap, releasesSnap, historySnap, registriesSnap] = await Promise.all([
      workspaceQuery('content_factory_catalog').limit(input.limit).get(),
      workspaceQuery('content_factory_releases').limit(input.limit).get(),
      workspaceQuery('content_factory_release_history').limit(input.limit).get(),
      db.collection('content_factory_source_registry').limit(input.limit).get(),
    ]);
    const sortNewest = (items: ReadDocument[]): ReadDocument[] => items.sort((left, right) => String(right.timestamp ?? right.createdAt ?? right.sealedAt ?? '').localeCompare(String(left.timestamp ?? left.createdAt ?? left.sealedAt ?? '')));
    return {
      ok: true,
      catalogs: catalogsSnap.docs.map(withId),
      releases: sortNewest(releasesSnap.docs.map(withId)),
      history: sortNewest(historySnap.docs.map(withId)),
      sourceRegistries: registriesSnap.docs.map(withId),
    };
  },
);

export const adminGetContentFactoryRolloutMetrics = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    requireContentReader(request as { auth?: { token?: Record<string, unknown> } });
    const db = admin.firestore();
    const nowMs = Date.now();
    const day = new Date(nowMs).toISOString().slice(0, 10);
    const [stagesSnap, unitsSnap, jobsSnap, budgetSnap, jobConfig] = await Promise.all([
      db.collection('content_factory_stages').orderBy('updatedAt', 'desc').limit(101).get(),
      db.collection('content_factory_job_units').orderBy('startedAtMs', 'desc').limit(101).get(),
      db.collection('content_factory_jobs').orderBy('createdAt', 'desc').limit(101).get(),
      db.collection(CONTENT_FACTORY_BUDGET_COLLECTION).doc(day).get(),
      resolveJobConfig(db, 'content_factory'),
    ]);
    const reservedUnits = Number(budgetSnap.data()?.generationCount ?? 0);
    const stageDocs = stagesSnap.docs.slice(0, 100).map(withId);
    const unitDocs = unitsSnap.docs.slice(0, 100).map(withId);
    const jobDocs = jobsSnap.docs.slice(0, 100).map(withId);
    return { ok: true, metrics: deriveContentFactoryRolloutMetricsFromDocuments({ nowMs, stageDocs, unitDocs, jobDocs, truncation: { stages: stagesSnap.size > 100, units: unitsSnap.size > 100, jobs: jobsSnap.size > 100 }, budgetCapUnits: jobConfig.globalDailyCap, budgetReservedUnits: Number.isSafeInteger(reservedUnits) && reservedUnits >= 0 ? reservedUnits : 0 }) };
  },
);

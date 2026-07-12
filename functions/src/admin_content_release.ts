import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { buildCourseRelease } from './content_factory/release_sealing';
import { writeImmutableObject, type ArtifactBucketLike } from './content_factory/artifact_storage';
import { parseSourceRegistryReference, sourceRegistryDocId, validateSourceRegistry, type SourceRegistry } from './content_factory/source_registry';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface, type CourseReleaseArtifact } from './content_factory/course_release_contract';
import { validateReleaseReviewCandidate } from './content_factory/release_review';

const REGION = 'us-central1';

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token: Record<string, unknown>): AdminRole | null { return hasAdminRole(token.adminRole) ? token.adminRole : null; }

export function parseSealCourseReleaseRequest(data: unknown): { jobId: string; idempotencyKey: string; requestId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'seal request required');
  const jobId = String(data.jobId ?? '').trim();
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const requestId = String(data.requestId ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId)) throw new HttpsError('invalid-argument', 'invalid seal request');
  return Object.freeze({ jobId, idempotencyKey, requestId });
}

export function parseCourseGenerationReviewRequest(data: unknown): { jobId: string; status: 'approved' | 'rejected'; reason: string; requestId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'review request required');
  const jobId = String(data.jobId ?? '').trim();
  const status = String(data.status ?? '') as 'approved' | 'rejected';
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || (status !== 'approved' && status !== 'rejected') || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId)) throw new HttpsError('invalid-argument', 'invalid review request');
  return Object.freeze({ jobId, status, reason, requestId });
}

export function assertSealOperationReplay(value: unknown, expectedJobId: string): string {
  if (!isRecord(value) || value.action !== 'content_factory.course_release.seal' || value.jobId !== expectedJobId || typeof value.releaseId !== 'string' || !/^[A-Za-z0-9._-]{1,160}$/.test(value.releaseId)) {
    throw new HttpsError('already-exists', 'idempotency_key_reused');
  }
  return value.releaseId;
}

export const adminReviewCourseGeneration = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot review content');
    const input = parseCourseGenerationReviewRequest(request.data);
    const db = admin.firestore();
    const jobRef = db.collection('content_factory_jobs').doc(input.jobId);
    const reviewRef = db.collection('content_factory_job_reviews').doc(input.jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${input.jobId}`;
    const lessonIds = Array.isArray(job.lessonIds) ? job.lessonIds.map(Number) : [];
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    let blueprintHash = '';
    let sourceEvidenceIds: string[] = [];
    if (input.status === 'approved') {
      let reference: { blueprintId: string; version: string };
      try { reference = parseSourceRegistryReference(String(job.blueprintVersion ?? '')); } catch { throw new HttpsError('failed-precondition', 'blueprint_reference_invalid'); }
      const registrySnap = await db.collection('content_factory_source_registry').doc(sourceRegistryDocId(reference.blueprintId, reference.version)).get();
      if (!registrySnap.exists) throw new HttpsError('failed-precondition', 'source_registry_not_found');
      const registry = registrySnap.data() as SourceRegistry;
      const registryCheck = validateSourceRegistry(registry);
      if (!registryCheck.ok) throw new HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
      blueprintHash = registry.blueprintHash;
      sourceEvidenceIds = registry.evidence.map((item) => item.evidenceId);
      const validation = validateReleaseReviewCandidate({ jobId: input.jobId, studyTarget, learnerSourceLocale, releaseId, expectedLessonIds: lessonIds, expectedBlueprintHash: blueprintHash, expectedEvidenceIds: sourceEvidenceIds, units: unitsSnap.docs.map((doc) => doc.data()) });
      if (!validation.ok) throw new HttpsError('failed-precondition', `release_review_failed:${validation.errors.join(',')}`);
    }
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const [currentJobSnap, currentReviewSnap] = await Promise.all([tx.get(jobRef), tx.get(reviewRef)]);
      if (!currentJobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
      const currentJob = currentJobSnap.data() ?? {};
      const nextState = input.status === 'approved' ? 'approved' : 'needs_review';
      const review = { jobId: input.jobId, status: input.status, reason: input.reason, reviewerId: request.auth?.uid, blueprintHash, sourceEvidenceIds, reviewedUnitCount: unitsSnap.size, reviewedAt: admin.firestore.FieldValue.serverTimestamp() };
      const audit = {
        action: 'content_factory.course_generation.review',
        actorUid: request.auth?.uid,
        role,
        entity: { collection: 'content_factory_jobs', id: input.jobId },
        reason: input.reason,
        requestId: input.requestId,
        before: { state: currentJob.state ?? null, review: currentReviewSnap.exists ? currentReviewSnap.data() : null },
        after: { state: nextState, status: input.status, blueprintHash, sourceEvidenceIds, reviewedUnitCount: unitsSnap.size },
        timestamp: new Date().toISOString(),
      };
      tx.set(reviewRef, review, { merge: false });
      tx.set(jobRef, { state: nextState, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.create(auditRef, audit);
      return { ok: true, jobId: input.jobId, status: input.status, auditId: auditRef.id };
    });
  },
);

export const adminSealCourseRelease = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot seal content');
    const input = parseSealCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const jobSnap = await db.collection('content_factory_jobs').doc(input.jobId).get();
    if (!jobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const studyTarget = String(job.studyTarget ?? '').trim();
    const learnerSourceLocale = String(job.learnerSourceLocale ?? job.sourceLocale ?? '').trim();
    const blueprintReference = String(job.blueprintVersion ?? '').trim();
    if (!studyTarget || !learnerSourceLocale) throw new HttpsError('failed-precondition', 'generation_job_identity_missing');
    let sourceReference: { blueprintId: string; version: string };
    try { sourceReference = parseSourceRegistryReference(blueprintReference); } catch { throw new HttpsError('failed-precondition', 'blueprint_reference_invalid'); }
    const reviewSnap = await db.collection('content_factory_job_reviews').doc(input.jobId).get();
    const review = reviewSnap.data() ?? {};
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const existingOperation = await operationRef.get();
    if (existingOperation.exists) return { ok: true, releaseId: assertSealOperationReplay(existingOperation.data(), input.jobId), replayed: true };
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    const units = unitsSnap.docs.map((doc) => doc.data());
    const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${input.jobId}`;
    const registrySnap = await db.collection('content_factory_source_registry').doc(sourceRegistryDocId(sourceReference.blueprintId, sourceReference.version)).get();
    if (!registrySnap.exists) throw new HttpsError('failed-precondition', 'source_registry_not_found');
    const registry = registrySnap.data() as SourceRegistry;
    const registryCheck = validateSourceRegistry(registry);
    if (!registryCheck.ok) throw new HttpsError('failed-precondition', `source_registry_invalid:${registryCheck.errors.join(',')}`);
    const reviewValidation = validateReleaseReviewCandidate({ jobId: input.jobId, studyTarget, learnerSourceLocale, releaseId, expectedLessonIds: Array.isArray(job.lessonIds) ? job.lessonIds.map(Number) : [], expectedBlueprintHash: registry.blueprintHash, expectedEvidenceIds: registry.evidence.map((item) => item.evidenceId), units });
    const reviewedEvidenceIds = Array.isArray(review.sourceEvidenceIds) ? [...new Set(review.sourceEvidenceIds.map(String))].sort() : [];
    const expectedEvidenceIds = [...new Set(registry.evidence.map((item) => item.evidenceId))].sort();
    if (!reviewValidation.ok || review.status !== 'approved' || review.blueprintHash !== registry.blueprintHash || reviewedEvidenceIds.join('|') !== expectedEvidenceIds.join('|') || Number(review.reviewedUnitCount) !== units.length) {
      throw new HttpsError('failed-precondition', `release_review_stale_or_invalid:${reviewValidation.errors.join(',')}`);
    }
    const artifacts = {} as Record<CanonicalReleaseSurface, CourseReleaseArtifact>;
    const bucket = admin.storage().bucket() as unknown as ArtifactBucketLike;
    for (const surface of CANONICAL_RELEASE_SURFACES) {
      const surfaceUnits = units.filter((unit) => unit.surface === surface);
      if (!surfaceUnits.length || surfaceUnits.some((unit) => unit.state !== 'succeeded')) throw new HttpsError('failed-precondition', `surface_incomplete:${surface}`);
      const indexPath = `course-releases/${releaseId}/${surface}/index.json`;
      const index = { releaseId, studyTarget, learnerSourceLocale, surface, units: surfaceUnits.map((unit) => ({ lessonId: Number(unit.lessonId), objectPath: String(unit.objectPath), contentHash: String(unit.contentHash), objectGeneration: String(unit.objectGeneration) })).sort((a, b) => a.lessonId - b.lessonId) };
      const receipt = await writeImmutableObject(bucket, indexPath, index);
      artifacts[surface] = { releaseId, studyTarget, learnerSourceLocale, surface, contentHash: receipt.contentHash, objectGeneration: receipt.objectGeneration, byteSize: receipt.byteSize, entryIndex: receipt.objectPath };
    }
    const release = buildCourseRelease({ releaseId, studyTarget, learnerSourceLocale, blueprintId: sourceReference.blueprintId, blueprintHash: registry.blueprintHash, contentVersion: input.jobId, minAppVersion: String(review.minAppVersion ?? '1.0.0'), reviewStatus: String(review.status ?? ''), reviewerId: String(review.reviewerId ?? ''), unitStates: Object.fromEntries(CANONICAL_RELEASE_SURFACES.map((surface) => [surface, 'succeeded'])) as Record<CanonicalReleaseSurface, 'succeeded'>, artifacts });
    const releaseRef = db.collection('content_factory_releases').doc(releaseId);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const [existing, operation] = await Promise.all([tx.get(releaseRef), tx.get(operationRef)]);
      if (operation.exists) return { ok: true, releaseId: assertSealOperationReplay(operation.data(), input.jobId), replayed: true };
      if (existing.exists) throw new HttpsError('already-exists', 'course release already sealed');
      tx.create(releaseRef, { ...release, reviewStatus: review.status, reviewerId: review.reviewerId, sealedBy: request.auth?.uid, sealedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(operationRef, { operationId: input.idempotencyKey, action: 'content_factory.course_release.seal', jobId: input.jobId, releaseId, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(auditRef, {
        action: 'content_factory.course_release.seal',
        actorUid: request.auth?.uid,
        role,
        entity: { collection: 'content_factory_releases', id: releaseId },
        reason: 'Approved Language Factory release sealed',
        requestId: input.requestId,
        before: { jobId: input.jobId, reviewStatus: review.status, release: null },
        after: { jobId: input.jobId, releaseId, reviewStatus: review.status, artifactSurfaces: CANONICAL_RELEASE_SURFACES },
        operationId: input.idempotencyKey,
        timestamp: new Date().toISOString(),
      });
      return { ok: true, releaseId, auditId: auditRef.id, replayed: false };
    });
  },
);

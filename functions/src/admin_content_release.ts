import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { buildCourseRelease } from './content_factory/release_sealing';
import { writeImmutableObject, type ArtifactBucketLike } from './content_factory/artifact_storage';
import { parseSourceRegistryReference } from './content_factory/source_registry';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface, type CourseReleaseArtifact } from './content_factory/course_release_contract';

const REGION = 'us-central1';

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token: Record<string, unknown>): AdminRole | null { return hasAdminRole(token.adminRole) ? token.adminRole : null; }

export function parseSealCourseReleaseRequest(data: unknown): { jobId: string; idempotencyKey: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'seal request required');
  const jobId = String(data.jobId ?? '').trim();
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey)) throw new HttpsError('invalid-argument', 'invalid seal request');
  return Object.freeze({ jobId, idempotencyKey });
}

export function parseCourseGenerationReviewRequest(data: unknown): { jobId: string; status: 'approved' | 'rejected'; reason: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'review request required');
  const jobId = String(data.jobId ?? '').trim();
  const status = String(data.status ?? '') as 'approved' | 'rejected';
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(jobId) || (status !== 'approved' && status !== 'rejected') || !reason) throw new HttpsError('invalid-argument', 'invalid review request');
  return Object.freeze({ jobId, status, reason });
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
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    if (input.status === 'approved') {
      const complete = CANONICAL_RELEASE_SURFACES.every((surface) => {
        const surfaceUnits = unitsSnap.docs.filter((doc) => doc.data().surface === surface);
        return surfaceUnits.length > 0 && surfaceUnits.every((doc) => doc.data().state === 'succeeded');
      });
      if (!complete) throw new HttpsError('failed-precondition', 'all_release_surfaces_must_succeed');
    }
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) throw new HttpsError('not-found', 'generation_job_not_found');
    const job = jobSnap.data() ?? {};
    const blueprintHash = String(job.blueprintHash ?? unitsSnap.docs.map((doc) => {
      const qa = doc.data().qaReceipt;
      return isRecord(qa) ? qa.blueprintHash : '';
    }).find((value) => typeof value === 'string' && value.trim()) ?? '').trim();
    await reviewRef.set({ jobId: input.jobId, status: input.status, reason: input.reason, reviewerId: request.auth.uid, blueprintHash, reviewedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: false });
    await jobRef.set({ state: input.status === 'approved' ? 'approved' : 'needs_review', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, jobId: input.jobId, status: input.status };
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
    if (existingOperation.exists) return { ok: true, releaseId: String(existingOperation.data()?.releaseId ?? ''), replayed: true };
    const unitsSnap = await db.collection('content_factory_job_units').where('jobId', '==', input.jobId).get();
    const units = unitsSnap.docs.map((doc) => doc.data());
    const releaseId = `draft-${studyTarget}-${learnerSourceLocale}-${input.jobId}`;
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
    const release = buildCourseRelease({ releaseId, studyTarget, learnerSourceLocale, blueprintId: sourceReference.blueprintId, blueprintHash: String(review.blueprintHash ?? ''), contentVersion: input.jobId, minAppVersion: String(review.minAppVersion ?? '1.0.0'), reviewStatus: String(review.status ?? ''), reviewerId: String(review.reviewerId ?? ''), unitStates: Object.fromEntries(CANONICAL_RELEASE_SURFACES.map((surface) => [surface, 'succeeded'])) as Record<CanonicalReleaseSurface, 'succeeded'>, artifacts });
    const releaseRef = db.collection('content_factory_releases').doc(releaseId);
    return db.runTransaction(async (tx) => {
      const [existing, operation] = await Promise.all([tx.get(releaseRef), tx.get(operationRef)]);
      if (operation.exists) return { ok: true, releaseId, replayed: true };
      if (existing.exists) throw new HttpsError('already-exists', 'course release already sealed');
      tx.create(releaseRef, { ...release, reviewStatus: review.status, reviewerId: review.reviewerId, sealedBy: request.auth?.uid, sealedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(operationRef, { operationId: input.idempotencyKey, releaseId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, releaseId, replayed: false };
    });
  },
);

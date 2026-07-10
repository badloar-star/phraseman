import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { assertCourseRelease, type CourseRelease } from './content_factory/course_release_contract';

const REGION = 'us-central1';
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token: Record<string, unknown>): AdminRole | null { return hasAdminRole(token.adminRole) ? token.adminRole : null; }

export function parseActivateCourseReleaseRequest(data: unknown): { releaseId: string; catalogId: string; expectedRevision: number; idempotencyKey: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'activation request required');
  const releaseId = String(data.releaseId ?? '').trim();
  const catalogId = String(data.catalogId ?? '').trim();
  const expectedRevision = Number(data.expectedRevision);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(releaseId) || !/^[A-Za-z0-9._-]{1,160}$/.test(catalogId) || !Number.isInteger(expectedRevision) || expectedRevision < 0 || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey)) throw new HttpsError('invalid-argument', 'invalid activation request');
  return Object.freeze({ releaseId, catalogId, expectedRevision, idempotencyKey });
}

export const adminActivateCourseRelease = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot activate content');
    const input = parseActivateCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const releaseSnap = await db.collection('content_factory_releases').doc(input.releaseId).get();
    if (!releaseSnap.exists) throw new HttpsError('not-found', 'course_release_not_found');
    const release = assertCourseRelease(releaseSnap.data());
    if (release.releaseId !== input.releaseId || release.studyTarget !== input.catalogId) throw new HttpsError('failed-precondition', 'release_catalog_identity_mismatch');
    const catalogRef = db.collection('content_factory_catalog').doc(input.catalogId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    return db.runTransaction(async (tx) => {
      const [catalogSnap, operationSnap] = await Promise.all([tx.get(catalogRef), tx.get(operationRef)]);
      if (operationSnap.exists) return { ok: true, releaseId: input.releaseId, replayed: true };
      const catalog = catalogSnap.data() ?? {};
      const revision = Number(catalog.revision ?? 0);
      if (revision !== input.expectedRevision) throw new HttpsError('failed-precondition', 'catalog_changed_reload_before_activation');
      tx.set(catalogRef, { revision: revision + 1, activeRelease: { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, blueprintId: release.blueprintId, blueprintHash: release.blueprintHash }, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.create(operationRef, { operationId: input.idempotencyKey, releaseId: input.releaseId, revision: revision + 1, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, releaseId: input.releaseId, revision: revision + 1, replayed: false };
    });
  },
);

export const getPublishedCourseRelease = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    const studyTarget = String(request.data?.studyTarget ?? '').trim();
    const learnerSourceLocale = String(request.data?.learnerSourceLocale ?? request.data?.sourceLocale ?? '').trim();
    const catalogSnap = await admin.firestore().collection('content_factory_catalog').doc(studyTarget).get();
    const active = catalogSnap.data()?.activeRelease;
    if (!isRecord(active) || active.studyTarget !== studyTarget || active.learnerSourceLocale !== learnerSourceLocale || typeof active.releaseId !== 'string') throw new HttpsError('not-found', 'active_course_release_not_found');
    const releaseSnap = await admin.firestore().collection('content_factory_releases').doc(active.releaseId).get();
    if (!releaseSnap.exists) throw new HttpsError('data-loss', 'active_course_release_missing');
    const release = assertCourseRelease(releaseSnap.data());
    if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale) throw new HttpsError('data-loss', 'active_course_release_identity_mismatch');
    return release satisfies CourseRelease;
  },
);

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { assertCourseRelease, type CourseRelease } from './content_factory/course_release_contract';

const REGION = 'us-central1';
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function roleFromToken(token: Record<string, unknown>): AdminRole | null { return hasAdminRole(token.adminRole) ? token.adminRole : null; }

export function assertReleaseActivationMetadata(value: unknown): void {
  if (!isRecord(value) || value.reviewStatus !== 'approved') throw new Error('course_release_not_approved');
  if (typeof value.reviewerId !== 'string' || !value.reviewerId.trim() || typeof value.sealedBy !== 'string' || !value.sealedBy.trim()) throw new Error('course_release_review_metadata_missing');
}

const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;

export function courseCatalogId(studyTarget: string, learnerSourceLocale: string): string {
  if (!LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(learnerSourceLocale)) throw new Error('course_catalog_identity_invalid');
  return `${studyTarget}:${learnerSourceLocale}`;
}

export function parseActivateCourseReleaseRequest(data: unknown): { releaseId: string; expectedRevision: number; idempotencyKey: string; reason: string; requestId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'activation request required');
  const releaseId = String(data.releaseId ?? '').trim();
  const expectedRevision = Number(data.expectedRevision);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(releaseId) || !Number.isInteger(expectedRevision) || expectedRevision < 0 || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId)) throw new HttpsError('invalid-argument', 'invalid activation request');
  return Object.freeze({ releaseId, expectedRevision, idempotencyKey, reason, requestId });
}

export function parseRollbackCourseReleaseRequest(data: unknown): { targetReleaseId: string; expectedCurrentReleaseId: string; expectedRevision: number; idempotencyKey: string; reason: string; requestId: string } {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'rollback request required');
  const targetReleaseId = String(data.targetReleaseId ?? '').trim();
  const expectedCurrentReleaseId = String(data.expectedCurrentReleaseId ?? '').trim();
  const expectedRevision = Number(data.expectedRevision);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(targetReleaseId) || !/^[A-Za-z0-9._-]{1,160}$/.test(expectedCurrentReleaseId) || targetReleaseId === expectedCurrentReleaseId || !Number.isInteger(expectedRevision) || expectedRevision < 1 || !/^[A-Za-z0-9._-]{1,160}$/.test(idempotencyKey) || !reason || !/^[A-Za-z0-9._-]{1,160}$/.test(requestId)) throw new HttpsError('invalid-argument', 'invalid rollback request');
  return Object.freeze({ targetReleaseId, expectedCurrentReleaseId, expectedRevision, idempotencyKey, reason, requestId });
}

function membershipId(catalogId: string, releaseId: string): string {
  return `${catalogId}__${releaseId}`;
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
    const releaseData = releaseSnap.data();
    try { assertReleaseActivationMetadata(releaseData); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'course_release_not_approved'); }
    const release = assertCourseRelease(releaseData);
    if (release.releaseId !== input.releaseId) throw new HttpsError('failed-precondition', 'release_catalog_identity_mismatch');
    const catalogId = courseCatalogId(release.studyTarget, release.learnerSourceLocale);
    const catalogRef = db.collection('content_factory_catalog').doc(catalogId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const historyRef = db.collection('content_factory_release_history').doc();
    const auditRef = db.collection('admin_log').doc();
    const membershipRef = db.collection('content_factory_catalog_releases').doc(membershipId(catalogId, input.releaseId));
    return db.runTransaction(async (tx) => {
      const [catalogSnap, operationSnap, membershipSnap] = await Promise.all([tx.get(catalogRef), tx.get(operationRef), tx.get(membershipRef)]);
      if (operationSnap.exists) {
        const operation = operationSnap.data() ?? {};
        if (operation.releaseId !== input.releaseId || operation.catalogId !== catalogId) throw new HttpsError('already-exists', 'idempotency_key_reused');
        return { ok: true, releaseId: input.releaseId, revision: Number(operation.revision ?? 0), replayed: true };
      }
      const catalog = catalogSnap.data() ?? {};
      const revision = Number(catalog.revision ?? 0);
      if (revision !== input.expectedRevision) throw new HttpsError('failed-precondition', 'catalog_changed_reload_before_activation');
      const nextRevision = revision + 1;
      const nextActive = { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, blueprintId: release.blueprintId, blueprintHash: release.blueprintHash };
      const audit = { action: 'content_factory.course_release.activate', actorUid: request.auth?.uid, role, entity: { collection: 'content_factory_catalog', id: catalogId }, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, reason: input.reason, requestId: input.requestId, before: { revision, activeRelease: catalog.activeRelease ?? null }, after: { revision: nextRevision, activeRelease: nextActive }, rollbackReference: historyRef.id, operationId: input.idempotencyKey, timestamp: new Date().toISOString() };
      tx.set(catalogRef, { studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, revision: nextRevision, activeRelease: nextActive, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.create(historyRef, audit);
      tx.create(auditRef, audit);
      if (!membershipSnap.exists) tx.create(membershipRef, { catalogId, releaseId: input.releaseId, firstActivatedRevision: nextRevision, firstActivatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(operationRef, { operationId: input.idempotencyKey, releaseId: input.releaseId, catalogId, revision: nextRevision, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, releaseId: input.releaseId, catalogId, revision: nextRevision, auditId: auditRef.id, replayed: false };
    });
  },
);

export const adminRollbackCourseRelease = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot rollback content');
    const input = parseRollbackCourseReleaseRequest(request.data);
    const db = admin.firestore();
    const releaseSnap = await db.collection('content_factory_releases').doc(input.targetReleaseId).get();
    if (!releaseSnap.exists) throw new HttpsError('not-found', 'rollback_course_release_not_found');
    const releaseData = releaseSnap.data();
    try { assertReleaseActivationMetadata(releaseData); } catch (error) { throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'course_release_not_approved'); }
    const release = assertCourseRelease(releaseData);
    const catalogId = courseCatalogId(release.studyTarget, release.learnerSourceLocale);
    const catalogRef = db.collection('content_factory_catalog').doc(catalogId);
    const membershipRef = db.collection('content_factory_catalog_releases').doc(membershipId(catalogId, input.targetReleaseId));
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const historyRef = db.collection('content_factory_release_history').doc();
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const [catalogSnap, membershipSnap, operationSnap] = await Promise.all([tx.get(catalogRef), tx.get(membershipRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const operation = operationSnap.data() ?? {};
        if (operation.releaseId !== input.targetReleaseId || operation.catalogId !== catalogId) throw new HttpsError('already-exists', 'idempotency_key_reused');
        return { ok: true, releaseId: input.targetReleaseId, revision: Number(operation.revision ?? 0), replayed: true };
      }
      if (!catalogSnap.exists) throw new HttpsError('not-found', 'course_catalog_not_found');
      if (!membershipSnap.exists) throw new HttpsError('failed-precondition', 'rollback_target_was_never_active');
      const catalog = catalogSnap.data() ?? {};
      const revision = Number(catalog.revision ?? 0);
      const current = isRecord(catalog.activeRelease) ? catalog.activeRelease : {};
      if (revision !== input.expectedRevision || current.releaseId !== input.expectedCurrentReleaseId) throw new HttpsError('failed-precondition', 'catalog_changed_reload_before_rollback');
      const nextRevision = revision + 1;
      const nextActive = { releaseId: release.releaseId, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, blueprintId: release.blueprintId, blueprintHash: release.blueprintHash };
      const audit = { action: 'content_factory.course_release.rollback', actorUid: request.auth?.uid, role, entity: { collection: 'content_factory_catalog', id: catalogId }, studyTarget: release.studyTarget, learnerSourceLocale: release.learnerSourceLocale, reason: input.reason, requestId: input.requestId, before: { revision, activeRelease: catalog.activeRelease }, after: { revision: nextRevision, activeRelease: nextActive }, rollbackReference: historyRef.id, operationId: input.idempotencyKey, timestamp: new Date().toISOString() };
      tx.set(catalogRef, { revision: nextRevision, activeRelease: nextActive, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      tx.create(historyRef, audit);
      tx.create(auditRef, audit);
      tx.create(operationRef, { operationId: input.idempotencyKey, releaseId: input.targetReleaseId, catalogId, revision: nextRevision, actorUid: request.auth?.uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, releaseId: input.targetReleaseId, catalogId, revision: nextRevision, auditId: auditRef.id, replayed: false };
    });
  },
);

export const getPublishedCourseRelease = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
    const studyTarget = String(request.data?.studyTarget ?? '').trim();
    const learnerSourceLocale = String(request.data?.learnerSourceLocale ?? request.data?.sourceLocale ?? '').trim();
    let catalogId: string;
    try { catalogId = courseCatalogId(studyTarget, learnerSourceLocale); } catch { throw new HttpsError('invalid-argument', 'course_release_identity_invalid'); }
    const catalogSnap = await admin.firestore().collection('content_factory_catalog').doc(catalogId).get();
    const active = catalogSnap.data()?.activeRelease;
    if (!isRecord(active) || active.studyTarget !== studyTarget || active.learnerSourceLocale !== learnerSourceLocale || typeof active.releaseId !== 'string') throw new HttpsError('not-found', 'active_course_release_not_found');
    const releaseSnap = await admin.firestore().collection('content_factory_releases').doc(active.releaseId).get();
    if (!releaseSnap.exists) throw new HttpsError('data-loss', 'active_course_release_missing');
    const release = assertCourseRelease(releaseSnap.data());
    if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale) throw new HttpsError('data-loss', 'active_course_release_identity_mismatch');
    return release satisfies CourseRelease;
  },
);

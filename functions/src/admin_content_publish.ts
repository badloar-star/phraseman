import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { hasPermission } from './admin/permissions';
import { validatePackManifest, type PackManifest } from './content_factory/contracts';
import { createActivePackPointer, type SourceEvidence } from './content_factory/publication_contract';

const REGION = 'us-central1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function roleFromToken(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

export interface ContentPublishRequest {
  readonly packId: string;
  readonly expectedCatalogRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
}

export interface ContentRollbackRequest {
  readonly catalogId: string;
  readonly expectedCatalogRevision: number;
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
}

export function parseContentPublishRequest(data: unknown): ContentPublishRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'publish request required');
  const result = {
    packId: String(data.packId ?? '').trim(),
    expectedCatalogRevision: Number(data.expectedCatalogRevision),
    idempotencyKey: String(data.idempotencyKey ?? '').trim(),
    reason: String(data.reason ?? '').trim().slice(0, 500),
    requestId: String(data.requestId ?? '').trim(),
  };
  if (!result.packId || !Number.isInteger(result.expectedCatalogRevision) || result.expectedCatalogRevision < 0 || !result.idempotencyKey || !result.reason || !result.requestId) {
    throw new HttpsError('invalid-argument', 'packId, revision, idempotencyKey, reason and requestId are required');
  }
  return Object.freeze(result);
}

export function parseContentRollbackRequest(data: unknown): ContentRollbackRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'rollback request required');
  const result = {
    catalogId: String(data.catalogId ?? '').trim(),
    expectedCatalogRevision: Number(data.expectedCatalogRevision),
    idempotencyKey: String(data.idempotencyKey ?? '').trim(),
    reason: String(data.reason ?? '').trim().slice(0, 500),
    requestId: String(data.requestId ?? '').trim(),
  };
  if (!/^[a-z0-9._-]{1,120}$/i.test(result.catalogId) || !Number.isInteger(result.expectedCatalogRevision) || result.expectedCatalogRevision < 1 || !result.idempotencyKey || !result.reason || !result.requestId) {
    throw new HttpsError('invalid-argument', 'catalogId, revision, idempotencyKey, reason and requestId are required');
  }
  return Object.freeze(result);
}

function manifestFromDraft(data: Record<string, unknown>): PackManifest {
  const manifest = data.manifest;
  if (!isRecord(manifest)) throw new HttpsError('failed-precondition', 'pack manifest is missing');
  const check = validatePackManifest(manifest as unknown as PackManifest);
  if (!check.ok || (manifest.reviewStatus !== 'approved') || !['draft', 'staged'].includes(String(manifest.activationStatus))) {
    throw new HttpsError('failed-precondition', `pack is not publishable: ${check.errors.join(',')}`);
  }
  return manifest as unknown as PackManifest;
}

export const adminPublishContentPack = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const actorUid = request.auth.uid;
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
    if (!hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot publish content');
    const input = parseContentPublishRequest(request.data);
    const db = admin.firestore();
    const draftRef = db.collection('content_factory_pack_revisions').doc(input.packId);
    const catalogRef = db.collection('content_factory_catalog').doc(input.packId.split(':')[0]);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('content_factory_publish_history').doc();

    return db.runTransaction(async (tx) => {
      const [draftSnap, catalogSnap, operationSnap] = await Promise.all([tx.get(draftRef), tx.get(catalogRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.packId !== input.packId || previous.expectedCatalogRevision !== input.expectedCatalogRevision) throw new HttpsError('already-exists', 'idempotencyKey was already used for another publish request');
        return { ok: true, packId: input.packId, revision: Number(previous.revision ?? 0), auditId: String(previous.auditId ?? ''), replayed: true };
      }
      if (!draftSnap.exists) throw new HttpsError('not-found', 'pack draft not found');
      const draft = draftSnap.data() ?? {};
      const manifest = manifestFromDraft(draft);
      const evidence = Array.isArray(draft.sourceEvidence) ? draft.sourceEvidence as SourceEvidence[] : [];
      const qaResultId = String(draft.qaResultId ?? '');
      const reviewerId = String(draft.reviewerId ?? '');
      const blueprintHash = String(draft.blueprintHash ?? '');
      if (manifest.packId !== input.packId || !qaResultId || !reviewerId || !blueprintHash || evidence.length === 0 || evidence.some((item) => !item.evidenceId?.trim() || !item.authority?.trim() || !item.url?.startsWith('https://') || !item.claim?.trim())) {
        throw new HttpsError('failed-precondition', 'QA, reviewer, blueprint and validated source evidence receipts are required');
      }
      const catalog = catalogSnap.data() ?? {};
      const currentRevision = Number(catalog.revision ?? 0);
      if (currentRevision !== input.expectedCatalogRevision) throw new HttpsError('failed-precondition', 'catalog changed; reload before publishing');
      const publishedManifest = { ...manifest, activationStatus: 'published' as const };
      const pointer = createActivePackPointer({ manifest: publishedManifest, revision: currentRevision + 1, activatedBy: actorUid, activatedAt: new Date().toISOString() });
      const previousSurfaces = isRecord(catalog.activeSurfaces) ? catalog.activeSurfaces : {};
      const activeSurfaces = { ...previousSurfaces, [manifest.surface]: pointer };
      const audit = { action: 'content_factory.publish', actorUid, role, entity: { collection: draftRef.parent.id, id: input.packId }, reason: input.reason, requestId: input.requestId, before: { manifest, catalogRevision: currentRevision }, after: pointer, rollbackReference: historyRef.id, timestamp: new Date().toISOString(), operationId: input.idempotencyKey };
      tx.set(catalogRef, { revision: pointer.revision, active: pointer, activeSurfaces, previousSurfaces, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.set(draftRef, { manifest: publishedManifest, activationStatus: 'published', publishedAt: admin.firestore.FieldValue.serverTimestamp(), publishedBy: actorUid }, { merge: true });
      tx.create(historyRef, { ...audit, previousActive: catalog.active ?? null, previousSurfaces });
      tx.create(auditRef, audit);
      tx.create(operationRef, { operationId: input.idempotencyKey, packId: input.packId, expectedCatalogRevision: input.expectedCatalogRevision, auditId: auditRef.id, revision: pointer.revision, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, packId: input.packId, revision: pointer.revision, auditId: auditRef.id, replayed: false };
    });
  },
);

export const adminRollbackContentPack = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = roleFromToken(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot rollback content');
    const actorUid = request.auth.uid;
    const input = parseContentRollbackRequest(request.data);
    const db = admin.firestore();
    const catalogRef = db.collection('content_factory_catalog').doc(input.catalogId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('content_factory_publish_history').doc();
    return db.runTransaction(async (tx) => {
      const [catalogSnap, operationSnap] = await Promise.all([tx.get(catalogRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.catalogId !== input.catalogId || previous.expectedCatalogRevision !== input.expectedCatalogRevision) throw new HttpsError('already-exists', 'idempotencyKey was already used for another rollback');
        return { ok: true, catalogId: input.catalogId, revision: Number(previous.revision ?? 0), auditId: String(previous.auditId ?? ''), replayed: true };
      }
      if (!catalogSnap.exists) throw new HttpsError('not-found', 'catalog not found');
      const catalog = catalogSnap.data() ?? {};
      const currentRevision = Number(catalog.revision ?? 0);
      if (currentRevision !== input.expectedCatalogRevision) throw new HttpsError('failed-precondition', 'catalog changed; reload before rollback');
      if (!isRecord(catalog.previousSurfaces)) throw new HttpsError('failed-precondition', 'no previous published surfaces available');
      const audit = { action: 'content_factory.rollback', actorUid, role, entity: { collection: 'content_factory_catalog', id: input.catalogId }, reason: input.reason, requestId: input.requestId, before: { activeSurfaces: catalog.activeSurfaces ?? null, revision: currentRevision }, after: { activeSurfaces: catalog.previousSurfaces, revision: currentRevision + 1 }, rollbackReference: historyRef.id, timestamp: new Date().toISOString(), operationId: input.idempotencyKey };
      tx.set(catalogRef, { active: catalog.previousActive ?? null, activeSurfaces: catalog.previousSurfaces, previousSurfaces: catalog.activeSurfaces ?? null, revision: currentRevision + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.create(historyRef, audit);
      tx.create(auditRef, audit);
      tx.create(operationRef, { operationId: input.idempotencyKey, catalogId: input.catalogId, expectedCatalogRevision: input.expectedCatalogRevision, auditId: auditRef.id, revision: currentRevision + 1, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, catalogId: input.catalogId, revision: currentRevision + 1, auditId: auditRef.id, replayed: false };
    });
  },
);

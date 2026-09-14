import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { buildPublishedHomeHints, type HomeHintSelection } from './home_hints';
import { HOME_HINT_CATALOG } from './home_hints_catalog';

const PUBLISHED_DOC_ID = 'published';
const MAX_SELECTIONS = 300;

export type HomeHintsPublishRequest = {
  readonly selections: readonly HomeHintSelection[];
  readonly idempotencyKey: string;
  readonly reason: string;
  readonly requestId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function parseHomeHintsPublishRequest(data: unknown): HomeHintsPublishRequest {
  if (!isRecord(data) || !Array.isArray(data.selections) || data.selections.length > MAX_SELECTIONS) {
    throw new HttpsError('invalid-argument', 'selections must be an array of at most 300 items');
  }
  const selections = data.selections.map((raw) => {
    const variantIndex = isRecord(raw) ? raw.variantIndex : undefined;
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || typeof variantIndex !== 'number' || !Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex > 2) {
      throw new HttpsError('invalid-argument', 'each selection needs an id and variantIndex 0..2');
    }
    return { id: raw.id.trim(), variantIndex: variantIndex as 0 | 1 | 2 };
  });
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const requestId = String(data.requestId ?? '').trim();
  if (!idempotencyKey || idempotencyKey.length > 120 || !reason || !requestId) {
    throw new HttpsError('invalid-argument', 'idempotencyKey, reason and requestId are required');
  }
  return Object.freeze({ selections: Object.freeze(selections), idempotencyKey, reason, requestId });
}

function operationId(idempotencyKey: string): string {
  return `home_hints_${crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 40)}`;
}

function fingerprint(input: HomeHintsPublishRequest): string {
  return JSON.stringify({ action: 'home_hints.publish', selections: input.selections, reason: input.reason, requestId: input.requestId });
}

function requireHomeHintsAdmin(request: { auth?: { uid?: string; token?: Record<string, unknown> } | null; app?: unknown }): { actorUid: string; role: ReturnType<typeof roleFromAdminToken> } {
  requireAdminAppCheck(request);
  if (!request.auth?.uid || request.auth.token?.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFromAdminToken(request.auth.token);
  if (!role || !hasPermission(role, 'content.publish')) throw new HttpsError('permission-denied', 'Role cannot publish home hints');
  return { actorUid: request.auth.uid, role };
}

export const adminGetHomeHintsCatalog = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireHomeHintsAdmin(request);
    return { schemaVersion: 1, items: HOME_HINT_CATALOG };
  },
);

export const adminPublishHomeHints = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    const { actorUid, role } = requireHomeHintsAdmin(request);
    const input = parseHomeHintsPublishRequest(request.data);
    const db = admin.firestore();
    const publishedRef = db.collection('home_hints').doc(PUBLISHED_DOC_ID);
    const operationRef = db.collection('admin_command_operations').doc(operationId(input.idempotencyKey));
    const auditRef = db.collection('admin_log').doc();
    const historyRef = db.collection('home_hints_history').doc();
    const requestFingerprint = fingerprint(input);
    const now = new Date().toISOString();

    return db.runTransaction(async (tx) => {
      const [publishedSnap, operationSnap] = await Promise.all([tx.get(publishedRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.actorUid !== actorUid || previous.requestFingerprint !== requestFingerprint) {
          throw new HttpsError('already-exists', 'idempotencyKey replay does not match the original command');
        }
        return { ok: true, version: String(previous.version ?? ''), auditId: String(previous.auditId ?? ''), replayed: true };
      }

      const before = (publishedSnap.data() ?? {}) as Record<string, unknown>;
      const revision = Number(before.revision ?? 0);
      if (!Number.isInteger(revision) || revision < 0) throw new HttpsError('failed-precondition', 'published hints revision is invalid');
      const version = `v${revision + 1}`;
      const snapshot = buildPublishedHomeHints(input.selections, version);
      const after = { schemaVersion: snapshot.schemaVersion, version: snapshot.version, itemCount: snapshot.items.length, revision: revision + 1 };
      const audit = createAuditRecord({
        action: 'home_hints.publish', actorUid, role, entity: { collection: 'home_hints', id: PUBLISHED_DOC_ID },
        reason: input.reason, before, after, rollbackReference: historyRef.id, requestId: input.requestId, timestamp: now,
      });
      tx.set(publishedRef, { ...snapshot, revision: revision + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: actorUid });
      tx.create(historyRef, { ...audit, operationId: input.idempotencyKey, snapshot });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint, actorUid, auditId: auditRef.id, version, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, version, auditId: auditRef.id, replayed: false };
    });
  },
);

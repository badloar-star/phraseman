import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole, type AdminPermission } from './admin/permissions';

export type NativeRow = Record<string, unknown>;

export function asRecord(value: unknown): NativeRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as NativeRow : {};
}

export function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function boundedLimit(value: unknown, fallback = 50, maximum = 100): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(maximum, parsed)) : fallback;
}

export function requireNativePermission(
  request: { auth?: { uid: string; token?: NativeRow } },
  permission: AdminPermission,
) {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', `Missing ${permission}`);
  return { actorUid: request.auth.uid, role };
}

function scalar(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

export function safeProjection(value: unknown, depth = 0): unknown {
  const simple = scalar(value);
  if (simple !== undefined) return simple;
  if (depth >= 3) return '[bounded]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeProjection(item, depth + 1));
  const row = asRecord(value);
  return Object.fromEntries(Object.entries(row).slice(0, 80).map(([key, item]) => [key, safeProjection(item, depth + 1)]));
}

export function maskIdentity(value: unknown): string {
  const text = cleanText(value, 320);
  if (!text) return '';
  if (text.includes('@')) {
    const [local, domain] = text.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return text.length <= 8 ? text : `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export async function readBoundedCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  limitValue: number,
  cursor = '',
) {
  const limit = boundedLimit(limitValue);
  let query: FirebaseFirestore.Query = db.collection(collectionName).orderBy(admin.firestore.FieldPath.documentId()).limit(limit + 1);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    items: docs.map((doc) => ({ id: doc.id, ...asRecord(safeProjection(doc.data())), version: documentVersion(doc.id, doc.data()) })),
    nextCursor: snapshot.size > limit ? docs[docs.length - 1]?.id ?? '' : '',
    truncated: snapshot.size > limit,
  };
}

export function parseMutationEnvelope(value: unknown) {
  const data = asRecord(value);
  const action = cleanText(data.action, 80);
  const targetId = cleanText(data.targetId, 200);
  const reason = cleanText(data.reason, 500);
  const expectedVersion = cleanText(data.expectedVersion, 128);
  const idempotencyKey = cleanText(data.idempotencyKey, 160);
  const confirmation = cleanText(data.confirmation, 240);
  const payload = asRecord(data.payload);
  if (!action || !targetId || !reason || !expectedVersion) {
    throw new HttpsError('invalid-argument', 'action, targetId, reason and expectedVersion required');
  }
  return { action, targetId, reason, expectedVersion, idempotencyKey, confirmation, payload };
}

export function documentVersion(id: string, value: unknown): string {
  return stableHash({ id, value: safeProjection(value) });
}

export async function createNativePreview(args: {
  db: FirebaseFirestore.Firestore;
  packageId: string;
  actorUid: string;
  role: string;
  collection: string;
  action: string;
  targetId: string;
  reason: string;
  expectedVersion: string;
  payload: NativeRow;
  consequence: string;
  requiredPermission: AdminPermission;
  requiresApproval?: boolean;
  allowMissing?: boolean;
}) {
  const ref = args.db.collection(args.collection).doc(args.targetId);
  const snapshot = await ref.get();
  if (!snapshot.exists && !args.allowMissing) throw new HttpsError('not-found', 'target_not_found');
  const before = snapshot.exists ? asRecord(safeProjection(snapshot.data())) : {};
  const currentVersion = snapshot.exists ? documentVersion(snapshot.id, snapshot.data()) : 'missing';
  if (currentVersion !== args.expectedVersion) throw new HttpsError('failed-precondition', 'stale_expected_version');
  const packet = {
    packageId: args.packageId,
    action: args.action,
    collection: args.collection,
    targetId: args.targetId,
    reason: args.reason,
    expectedVersion: currentVersion,
    payload: asRecord(safeProjection(args.payload)),
    before,
    consequence: args.consequence,
    requiredPermission: args.requiredPermission,
    requiresApproval: args.requiresApproval !== false,
    allowMissing: args.allowMissing === true,
  };
  const fingerprint = stableHash(packet);
  const confirmation = `${args.packageId.toUpperCase()}/${args.action.toUpperCase()}/${args.targetId}/${fingerprint.slice(0, 12)}`;
  const previewRef = args.db.collection('admin_native_operation_previews').doc();
  const nowMs = Date.now();
  await previewRef.create({
    ...packet, fingerprint, confirmation, actorUid: args.actorUid, actorRole: args.role,
    status: 'previewed', createdAtMs: nowMs, expiresAtMs: nowMs + 30 * 60 * 1000,
  });
  return { ok: true, previewId: previewRef.id, ...packet, fingerprint, confirmation, expiresAtMs: nowMs + 30 * 60 * 1000 };
}

export async function requestNativeApproval(db: FirebaseFirestore.Firestore, actorUid: string, previewId: string, confirmation: string) {
  const previewRef = db.collection('admin_native_operation_previews').doc(previewId);
  const approvalRef = db.collection('admin_native_operation_approvals').doc(previewId);
  await db.runTransaction(async (tx) => {
    const previewSnap = await tx.get(previewRef);
    if (!previewSnap.exists) throw new HttpsError('not-found', 'preview_not_found');
    const preview = asRecord(previewSnap.data());
    if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.status !== 'previewed' || Number(preview.expiresAtMs) <= Date.now()) {
      throw new HttpsError('failed-precondition', 'preview_not_requestable');
    }
    tx.set(approvalRef, { previewId, requestorUid: actorUid, status: 'pending', fingerprint: preview.fingerprint, requestedAtMs: Date.now() });
    tx.update(previewRef, { status: 'approval_pending', approvalId: approvalRef.id });
  });
  return { ok: true, approvalId: approvalRef.id, status: 'pending' };
}

export async function approveNativeMutation(db: FirebaseFirestore.Firestore, approverUid: string, previewId: string, reason: string) {
  const previewRef = db.collection('admin_native_operation_previews').doc(previewId);
  const approvalRef = db.collection('admin_native_operation_approvals').doc(previewId);
  await db.runTransaction(async (tx) => {
    const [previewSnap, approvalSnap] = await Promise.all([tx.get(previewRef), tx.get(approvalRef)]);
    if (!previewSnap.exists || !approvalSnap.exists) throw new HttpsError('not-found', 'approval_not_found');
    const preview = asRecord(previewSnap.data()); const approval = asRecord(approvalSnap.data());
    if (preview.actorUid === approverUid || approval.requestorUid === approverUid) throw new HttpsError('permission-denied', 'self_approval_forbidden');
    if (approval.status !== 'pending' || approval.fingerprint !== preview.fingerprint) throw new HttpsError('failed-precondition', 'approval_not_pending');
    tx.update(approvalRef, { status: 'approved', approverUid, approvalReason: cleanText(reason, 500), approvedAtMs: Date.now() });
    tx.update(previewRef, { status: 'approved', approverUid, approvedAtMs: Date.now() });
  });
  return { ok: true, previewId, status: 'approved' };
}

export async function applyNativePatch(args: {
  db: FirebaseFirestore.Firestore;
  packageId: string;
  actorUid: string;
  role: string;
  previewId: string;
  confirmation: string;
  idempotencyKey: string;
  allowedActions: ReadonlySet<string>;
  transform: (input: {
    action: string;
    targetId: string;
    before: NativeRow;
    payload: NativeRow;
    nowMs: number;
    db: FirebaseFirestore.Firestore;
    tx: FirebaseFirestore.Transaction;
  }) => NativeRow | Promise<NativeRow>;
}) {
  if (!args.previewId || !args.confirmation || !args.idempotencyKey) throw new HttpsError('invalid-argument', 'previewId, confirmation and idempotencyKey required');
  const previewRef = args.db.collection('admin_native_operation_previews').doc(args.previewId);
  const operationRef = args.db.collection('admin_command_operations').doc(args.idempotencyKey);
  const requestFingerprint = stableHash({ packageId: args.packageId, previewId: args.previewId, confirmation: args.confirmation });
  return args.db.runTransaction(async (tx) => {
    const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
    if (operationSnap.exists) {
      const prior = asRecord(operationSnap.data());
      if (prior.actorUid !== args.actorUid || prior.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict');
      return { ok: true, replayed: true, operationId: operationRef.id };
    }
    if (!previewSnap.exists) throw new HttpsError('not-found', 'preview_not_found');
    const preview = asRecord(previewSnap.data());
    const action = cleanText(preview.action, 80); const targetId = cleanText(preview.targetId, 200); const collection = cleanText(preview.collection, 120);
    const requiredPermission = cleanText(preview.requiredPermission, 120) as AdminPermission;
    if (!hasPermission(args.role, requiredPermission)) throw new HttpsError('permission-denied', `Missing ${requiredPermission}`);
    if (preview.packageId !== args.packageId || preview.actorUid !== args.actorUid || preview.confirmation !== args.confirmation || preview.status !== 'approved' || !args.allowedActions.has(action)) {
      throw new HttpsError('failed-precondition', 'approved_preview_required');
    }
    const targetRef = args.db.collection(collection).doc(targetId);
    const targetSnap = await tx.get(targetRef);
    const currentVersion = targetSnap.exists ? documentVersion(targetSnap.id, targetSnap.data()) : 'missing';
    if ((!targetSnap.exists && preview.allowMissing !== true) || currentVersion !== preview.expectedVersion) throw new HttpsError('failed-precondition', 'target_changed_after_preview');
    const before = targetSnap.exists ? asRecord(safeProjection(targetSnap.data())) : {}; const nowMs = Date.now();
    const patch = await args.transform({ action, targetId, before, payload: asRecord(preview.payload), nowMs, db: args.db, tx });
    const after = { ...before, ...asRecord(safeProjection(patch)) };
    const auditRef = args.db.collection('admin_log').doc();
    const audit = createAuditRecord({ action: `${args.packageId}.${action}`, actorUid: args.actorUid, role: args.role, entity: { collection, id: targetId }, reason: cleanText(preview.reason, 500), before, after, rollbackReference: `${collection}/${targetId}`, requestId: args.idempotencyKey, timestamp: new Date(nowMs).toISOString() });
    tx.set(targetRef, patch, { merge: true });
    tx.update(previewRef, { status: 'applied', appliedAtMs: nowMs, operationId: operationRef.id });
    tx.create(auditRef, { ...audit, operationId: operationRef.id });
    tx.create(operationRef, { packageId: args.packageId, actorUid: args.actorUid, requestFingerprint, action, targetId, auditId: auditRef.id, createdAtMs: nowMs });
    return { ok: true, replayed: false, operationId: operationRef.id, action, targetId };
  });
}

export function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

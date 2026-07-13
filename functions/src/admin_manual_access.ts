import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import { vipRevokeProgressFields } from './vip_revoke';

if (admin.apps.length === 0) admin.initializeApp();
const REGION = 'us-central1';
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
type Row = Record<string, unknown>;
type ManualAccessAction = 'grant_months' | 'grant_forever' | 'revoke';

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max: number): string { return String(value ?? '').trim().slice(0, max); }
function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function roleFor(request: { auth?: { token?: Row } }) {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, 'money.manual_access.write')) throw new HttpsError('permission-denied', 'Role cannot manage Plus access');
  return role;
}

export function parseManualAccessInput(value: unknown) {
  const data = record(value);
  const uid = clean(data.uid, 160);
  const action = clean(data.action, 40) as ManualAccessAction;
  const months = action === 'grant_months' ? Math.floor(Number(data.months)) : 0;
  if (!UID_RE.test(uid)) throw new Error('valid_uid_required');
  if (!['grant_months', 'grant_forever', 'revoke'].includes(action)) throw new Error('invalid_manual_access_action');
  if (action === 'grant_months' && (!Number.isFinite(months) || months < 1 || months > 12)) throw new Error('months_must_be_1_to_12');
  return { uid, action, months };
}

function accessProjection(progressValue: unknown) {
  const progress = record(progressValue);
  return {
    vipActive: clean(progress.vip_active, 16), vipPlan: clean(progress.vip_plan, 40), vipFrom: clean(progress.vip_from, 40),
    vipUntil: clean(progress.vip_until, 40), vipAdminOverride: clean(progress.vip_admin_override, 16), vipAdminGrantAt: clean(progress.vip_admin_grant_at, 40),
    vipRevokedAt: clean(progress.vip_revoked_at, 40), premiumPlan: clean(progress.premium_plan, 40), premiumExpiry: clean(progress.premium_expiry, 40),
  };
}

export function applyManualAccess(progressValue: unknown, action: ManualAccessAction, months: number, nowMs: number): Row {
  const progress = { ...record(progressValue) };
  if (action === 'revoke') return { ...progress, ...vipRevokeProgressFields(nowMs) };
  let until = '0';
  if (action === 'grant_months') {
    const previous = Number(progress.vip_until || 0);
    const base = Number.isFinite(previous) && previous > nowMs ? previous : nowMs;
    const expiry = new Date(base);
    expiry.setUTCMonth(expiry.getUTCMonth() + months);
    until = String(expiry.getTime());
  }
  return {
    ...progress,
    vip_active: 'true', vip_plan: 'admin_vip', vip_from: String(nowMs), vip_until: until,
    vip_admin_override: 'true', vip_admin_grant_at: String(nowMs),
  };
}

export const adminPreviewManualAccess = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request);
  let input: ReturnType<typeof parseManualAccessInput>;
  try { input = parseManualAccessInput(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_manual_access'); }
  const data = record(request.data); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160);
  if (!reason || !requestId) throw new HttpsError('invalid-argument', 'reason and requestId required');
  const db = admin.firestore(); const userRef = db.collection('users').doc(input.uid); const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
  const user = record(userSnap.data());
  if (user.identityHidden === true && clean(user.canonicalStableId, 160) && clean(user.canonicalStableId, 160) !== input.uid) throw new HttpsError('failed-precondition', 'canonical_uid_required');
  const effectiveAtMs = Date.now(); const before = accessProjection(record(user.progress)); const afterProgress = applyManualAccess(record(user.progress), input.action, input.months, effectiveAtMs); const after = accessProjection(afterProgress);
  const packet = { ...input, reason, effectiveAtMs, before, after, beforeFingerprint: hash(before) }; const fingerprint = hash(packet); const confirmation = `PLUS_ACCESS/${input.action}/${input.uid}/${fingerprint.slice(0, 12)}`;
  const previewRef = db.collection('admin_manual_access_previews').doc();
  await previewRef.create({ actorUid: request.auth!.uid, requestId, ...packet, fingerprint, confirmation, createdAtMs: effectiveAtMs, expiresAtMs: effectiveAtMs + PREVIEW_TTL_MS });
  return { ok: true, previewId: previewRef.id, ...packet, fingerprint, confirmation, consequence: input.action === 'revoke' ? 'Revokes only admin VIP fields; store/RevenueCat fields are preserved.' : 'Grants admin VIP access.', expiresAtMs: effectiveAtMs + PREVIEW_TTL_MS };
});

export const adminApplyManualAccess = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = roleFor(request); const data = record(request.data); const previewId = clean(data.previewId, 160); const confirmation = clean(data.confirmation, 220); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!previewId || !confirmation || !reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'previewId, confirmation, reason, requestId and idempotencyKey required');
  const actorUid = request.auth!.uid; const db = admin.firestore(); const previewRef = db.collection('admin_manual_access_previews').doc(previewId); const operationRef = db.collection('admin_command_operations').doc(idempotencyKey); const auditRef = db.collection('admin_log').doc(); const requestFingerprint = hash({ previewId, confirmation });
  const prior = await operationRef.get();
  if (prior.exists) { const row = record(prior.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, uid: clean(row.uid, 160), action: clean(row.action, 40), replayed: true }; }
  return db.runTransaction(async (tx) => {
    const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
    if (operationSnap.exists) { const row = record(operationSnap.data()); if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, uid: clean(row.uid, 160), action: clean(row.action, 40), replayed: true }; }
    if (!previewSnap.exists) throw new HttpsError('not-found', 'manual_access_preview_not_found');
    const preview = record(previewSnap.data());
    if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.reason !== reason || preview.consumedAtMs || Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'manual_access_preview_invalid');
    const input = parseManualAccessInput(preview); const userRef = db.collection('users').doc(input.uid); const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    const user = record(userSnap.data()); const progress = record(user.progress); const before = accessProjection(progress);
    if (hash(before) !== preview.beforeFingerprint) throw new HttpsError('failed-precondition', 'manual_access_changed_after_preview');
    const nextProgress = applyManualAccess(progress, input.action, input.months, Number(preview.effectiveAtMs)); const after = accessProjection(nextProgress); const nowMs = Date.now();
    const audit = createAuditRecord({ action: `manual_access.${input.action}`, actorUid, role, entity: { collection: 'users', id: input.uid }, reason, before, after, rollbackReference: `users/${input.uid}:vip_fields`, requestId, timestamp: new Date(nowMs).toISOString() });
    tx.set(userRef, { progress: nextProgress, updatedAt: nowMs }, { merge: true });
    tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: idempotencyKey });
    tx.create(auditRef, { ...audit, operationId: idempotencyKey });
    tx.create(operationRef, { actorUid, requestFingerprint, uid: input.uid, action: input.action, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true, uid: input.uid, action: input.action, replayed: false };
  });
});

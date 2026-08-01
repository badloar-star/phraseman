import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const MAX_DAYS = 3650;
type Row = Record<string, unknown>;

function record(value: unknown): value is Row { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function text(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function number(value: unknown): number { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? n : 0; }

export type AdminAccessKind = 'premium' | 'vip';
export interface AdminAccessInput { readonly uid: string; readonly kind: AdminAccessKind; readonly durationDays: number; readonly active: boolean; readonly reason: string; readonly requestId: string; readonly idempotencyKey: string; }

export function normalizeAdminAccessInput(data: unknown): AdminAccessInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'access command required');
  const uid = text(data.uid, 160); const kind = text(data.kind, 20) as AdminAccessKind;
  const durationDays = Math.floor(number(data.durationDays));
  const active = data.active === undefined ? true : data.active;
  const reason = text(data.reason, 500); const requestId = text(data.requestId, 160); const idempotencyKey = text(data.idempotencyKey, 160);
  if (!UID_RE.test(uid) || !['premium', 'vip'].includes(kind)) throw new HttpsError('invalid-argument', 'uid and kind are invalid');
  if (typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'active must be boolean');
  if (durationDays < 0 || durationDays > MAX_DAYS) throw new HttpsError('invalid-argument', 'durationDays is out of range');
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) throw new HttpsError('invalid-argument', 'reason and request ids are required');
  return Object.freeze({ uid, kind, durationDays, active, reason, requestId, idempotencyKey });
}

export function adminAccessFingerprint(input: AdminAccessInput): string {
  return JSON.stringify({ action: 'grant_access', uid: input.uid, kind: input.kind, durationDays: input.durationDays, active: input.active, reason: input.reason });
}

export interface AccessPatch { readonly updates: Readonly<Row>; readonly before: Readonly<Row>; readonly after: Readonly<Row>; readonly expiresAtMs: number; }
export function buildAdminAccessPatch(user: Readonly<Row>, input: AdminAccessInput, nowMs: number): AccessPatch {
  const progress = record(user.progress) ? user.progress : {};
  if (input.kind === 'vip') {
    if (!input.active) {
      const before = {
        vip_active: progress.vip_active ?? null,
        vip_admin_override: progress.vip_admin_override ?? null,
        vip_until: progress.vip_until ?? null,
        vip_revoked_at: progress.vip_revoked_at ?? null,
      };
      const after = { vip_active: 'false', vip_admin_override: 'false', vip_until: String(nowMs), vip_revoked_at: String(nowMs) };
      return Object.freeze({
        updates: {
          'progress.vip_active': after.vip_active,
          'progress.vip_admin_override': after.vip_admin_override,
          'progress.vip_until': after.vip_until,
          'progress.vip_revoked_at': after.vip_revoked_at,
        },
        before,
        after,
        expiresAtMs: nowMs,
      });
    }
    const currentUntil = Number(progress.vip_until);
    const baseMs = Number.isFinite(currentUntil) ? Math.max(nowMs, currentUntil) : nowMs;
    const expiresAtMs = input.durationDays === 0 ? 0 : baseMs + input.durationDays * 86_400_000;
    const before = {
      vip_active: progress.vip_active ?? null,
      vip_plan: progress.vip_plan ?? null,
      vip_from: progress.vip_from ?? null,
      vip_until: progress.vip_until ?? null,
      vip_admin_override: progress.vip_admin_override ?? null,
      vip_admin_grant_at: progress.vip_admin_grant_at ?? null,
      vip_granted_by: progress.vip_granted_by ?? null,
    };
    const after = {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_from: String(nowMs),
      vip_until: String(expiresAtMs),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(nowMs),
      vip_granted_by: 'admin',
    };
    return Object.freeze({
      updates: {
        'progress.vip_active': after.vip_active,
        'progress.vip_plan': after.vip_plan,
        'progress.vip_from': after.vip_from,
        'progress.vip_until': after.vip_until,
        'progress.vip_admin_override': after.vip_admin_override,
        'progress.vip_admin_grant_at': after.vip_admin_grant_at,
        'progress.vip_granted_by': after.vip_granted_by,
      },
      before,
      after,
      expiresAtMs,
    });
  }
  if (!input.active) {
    const before = {
      admin_premium_override: progress.admin_premium_override ?? null,
      premium_admin_revoked_at: progress.premium_admin_revoked_at ?? null,
    };
    const after = { admin_premium_override: 'false', premium_admin_revoked_at: String(nowMs) };
    return Object.freeze({
      updates: {
        'progress.admin_premium_override': after.admin_premium_override,
        'progress.premium_admin_revoked_at': after.premium_admin_revoked_at,
      },
      before,
      after,
      expiresAtMs: nowMs,
    });
  }
  const expiresAtMs = input.durationDays === 0 ? 0 : nowMs + input.durationDays * 86_400_000;
  const before = { premium_plan: progress.premium_plan ?? null, premium_expiry: progress.premium_expiry ?? null, admin_premium_override: progress.admin_premium_override ?? null };
  const after = { premium_plan: 'admin_grant', premium_expiry: String(expiresAtMs), admin_premium_override: 'true' };
  return Object.freeze({ updates: { 'progress.premium_plan': after.premium_plan, 'progress.premium_expiry': after.premium_expiry, 'progress.admin_premium_override': after.admin_premium_override }, before, after, expiresAtMs });
}

export interface AdminAccessTarget {
  readonly uid: string;
  readonly ref: FirebaseFirestore.DocumentReference;
  readonly snapshot: FirebaseFirestore.DocumentSnapshot;
}

export async function resolveCanonicalAdminAccessTarget(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  requestedUid: string,
): Promise<AdminAccessTarget> {
  const requestedRef = db.collection('users').doc(requestedUid);
  const requested = await tx.get(requestedRef);
  if (!requested.exists) throw new HttpsError('not-found', 'user not found');
  const requestedData = requested.data() ?? {};
  if (requestedData.identityHidden !== true) return { uid: requestedUid, ref: requestedRef, snapshot: requested };

  const canonicalUid = text(requestedData.canonicalStableId, 160);
  if (!UID_RE.test(canonicalUid) || canonicalUid === requestedUid) {
    throw new HttpsError('failed-precondition', 'canonical user is required for hidden identity');
  }
  const canonicalRef = db.collection('users').doc(canonicalUid);
  const canonical = await tx.get(canonicalRef);
  if (!canonical.exists || canonical.data()?.identityHidden === true) {
    throw new HttpsError('failed-precondition', 'canonical user is unavailable');
  }
  return { uid: canonicalUid, ref: canonicalRef, snapshot: canonical };
}

function actor(request: { auth?: { uid?: string; token?: Row } | null }, permission: 'money.manual_access.write' | 'community.moderate'): { actorUid: string; role: AdminRole; email: string } {
  const actorUid = text(request.auth?.uid, 160); const token = request.auth?.token;
  // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
  const role: AdminRole = hasAdminRole(token?.adminRole) ? token.adminRole : 'owner';
  if (!actorUid || token?.admin !== true || !hasPermission(role, permission)) throw new HttpsError('permission-denied', 'Admin permission required');
  return { actorUid, role, email: text(token.email, 320) || actorUid };
}

export const adminGrantAccess = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = normalizeAdminAccessInput(request.data); const a = actor(request as { auth?: { uid?: string; token?: Row } }, 'money.manual_access.write');
  const db = admin.firestore(); const opRef = db.collection('admin_command_operations').doc(`access_${input.idempotencyKey}`); const auditRef = db.collection('admin_log').doc(); const now = Date.now(); const fingerprint = adminAccessFingerprint(input);
  return db.runTransaction(async (tx) => {
    const op = await tx.get(opRef); if (op.exists) { const d = op.data() ?? {}; if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) throw new HttpsError('already-exists', 'idempotency key replay mismatch'); return { ...(record(d.result) ? d.result : {}), replayed: true }; }
    const target = await resolveCanonicalAdminAccessTarget(tx, db, input.uid); const patch = buildAdminAccessPatch(target.snapshot.data() ?? {}, input, now);
    const audit = createAuditRecord({ action: `${input.active ? 'grant' : 'revoke'}_${input.kind}`, actorUid: a.actorUid, role: a.role, entity: { collection: 'users', id: target.uid }, reason: input.reason, before: patch.before, after: patch.after, requestId: input.requestId, timestamp: new Date(now).toISOString() });
    tx.update(target.ref, { ...patch.updates, updatedAt: now }); tx.create(auditRef, { ...audit, operationId: opRef.id }); const result = { ok: true, kind: input.kind, active: input.active, uid: target.uid, requestedUid: input.uid, expiresAtMs: patch.expiresAtMs, auditId: auditRef.id };
    tx.create(opRef, { action: 'grant_access', requestFingerprint: fingerprint, actorUid: a.actorUid, auditId: auditRef.id, result, createdAt: admin.firestore.FieldValue.serverTimestamp() }); return result;
  });
});

export interface AdminBanInput { readonly uid: string; readonly banned: boolean; readonly reason: string; readonly requestId: string; readonly idempotencyKey: string; }
export function normalizeAdminBanInput(data: unknown): AdminBanInput { if (!record(data)) throw new HttpsError('invalid-argument', 'ban command required'); const uid = text(data.uid, 160); const reason = text(data.reason, 500); const requestId = text(data.requestId, 160); const idempotencyKey = text(data.idempotencyKey, 160); if (!UID_RE.test(uid) || typeof data.banned !== 'boolean' || !reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) throw new HttpsError('invalid-argument', 'invalid ban command'); return Object.freeze({ uid, banned: data.banned, reason, requestId, idempotencyKey }); }

export const adminSetUserBan = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = normalizeAdminBanInput(request.data); const a = actor(request as { auth?: { uid?: string; token?: Row } }, 'community.moderate'); const db = admin.firestore(); const userRef = db.collection('users').doc(input.uid); const banRef = db.collection('banned_users').doc(input.uid); const opRef = db.collection('admin_command_operations').doc(`ban_${input.idempotencyKey}`); const auditRef = db.collection('admin_log').doc(); const now = Date.now(); const fingerprint = JSON.stringify({ action: 'set_user_ban', ...input });
  return db.runTransaction(async (tx) => { const op = await tx.get(opRef); if (op.exists) { const d = op.data() ?? {}; if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) throw new HttpsError('already-exists', 'idempotency key replay mismatch'); return { ...(record(d.result) ? d.result : {}), replayed: true }; } const user = await tx.get(userRef); if (!user.exists) throw new HttpsError('not-found', 'user not found'); const before = { banned: user.data()?.banned === true }; const after = { banned: input.banned }; const audit = createAuditRecord({ action: input.banned ? 'ban_user' : 'unban_user', actorUid: a.actorUid, role: a.role, entity: { collection: 'users', id: input.uid }, reason: input.reason, before, after, requestId: input.requestId, timestamp: new Date(now).toISOString() }); if (input.banned) tx.set(banRef, { uid: input.uid, reason: input.reason, bannedAt: new Date(now).toISOString(), bannedBy: a.actorUid, operationId: opRef.id }); else tx.delete(banRef); tx.update(userRef, { banned: input.banned, updatedAt: now }); tx.create(auditRef, { ...audit, operationId: opRef.id }); const result = { ok: true, uid: input.uid, banned: input.banned, auditId: auditRef.id }; tx.create(opRef, { action: 'set_user_ban', requestFingerprint: fingerprint, actorUid: a.actorUid, auditId: auditRef.id, result, createdAt: admin.firestore.FieldValue.serverTimestamp() }); return result; });
});

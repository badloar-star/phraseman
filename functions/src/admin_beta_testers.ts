import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const NIMBUS_AURA_ID = 'aura_beta_nimbus';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const ACTIONS = ['set_beta', 'unset_beta', 'grant_plus', 'energy_fill', 'energy_drain'] as const;
export type BetaTesterAction = typeof ACTIONS[number];

type Row = Record<string, unknown>;

export interface BetaTesterUpdateRequest {
  readonly uid: string;
  readonly action: BetaTesterAction;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

function record(value: unknown): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const token = record(request.auth?.token);
  if (token.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(token);
  if (!role) throw new HttpsError('permission-denied', 'adminRole claim required');
  return role;
}

export function parseBetaTesterUpdateRequest(value: unknown): BetaTesterUpdateRequest {
  const data = record(value);
  const uid = String(data.uid ?? '').trim();
  const action = String(data.action ?? '') as BetaTesterAction;
  const reason = String(data.reason ?? '').trim().slice(0, 500);
  const idempotencyKey = String(data.idempotencyKey ?? '').trim();
  const requestId = String(data.requestId ?? '').trim();
  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'valid uid required');
  if (!ACTIONS.includes(action)) throw new HttpsError('invalid-argument', 'unsupported beta tester action');
  if (!reason || !idempotencyKey || idempotencyKey.length > 160 || !requestId) throw new HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
  return Object.freeze({ uid, action, reason, idempotencyKey, requestId });
}

function parseOwned(value: unknown): Row {
  if (typeof value === 'string') {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return record(value);
}

export function applyBetaTesterAction(user: Row, action: BetaTesterAction, nowMs: number): Row {
  const progress = record(user.progress);
  const now = String(nowMs);
  if (action === 'set_beta') {
    const owned = { ...parseOwned(progress.avatar_aura_owned_v1), [NIMBUS_AURA_ID]: true };
    return {
      'progress.beta_tester': 'true',
      'progress.beta_tester_since': now,
      'progress.avatar_aura_owned_v1': JSON.stringify(owned),
      'progress.avatar_aura_gift_owned_v1': NIMBUS_AURA_ID,
      'progress.user_avatar_aura': NIMBUS_AURA_ID,
      beta_admin_updated_at: new Date(nowMs).toISOString(),
    };
  }
  if (action === 'unset_beta') return { 'progress.beta_tester': 'false', beta_admin_updated_at: new Date(nowMs).toISOString() };
  if (action === 'grant_plus') return {
    'progress.vip_active': 'true', 'progress.vip_plan': 'admin_vip', 'progress.vip_from': now,
    'progress.vip_until': '0', 'progress.vip_admin_override': 'true', 'progress.vip_admin_grant_at': now,
  };
  return { 'progress.admin_energy_command': JSON.stringify({ op: action === 'energy_fill' ? 'fill' : 'drain', at: nowMs }) };
}

function betaProjection(uid: string, user: Row): Row {
  const progress = record(user.progress);
  const linked = record(user.linkedAuth);
  const owned = parseOwned(progress.avatar_aura_owned_v1);
  return {
    uid,
    name: String(progress.user_name ?? `User ${uid.slice(0, 8)}`).slice(0, 120),
    email: String(linked.email ?? '').slice(0, 320),
    betaTester: String(progress.beta_tester ?? '') === 'true',
    betaSinceMs: Number(progress.beta_tester_since ?? 0) || 0,
    ownsNimbus: owned[NIMBUS_AURA_ID] === true,
    activeAura: String(progress.user_avatar_aura ?? '').slice(0, 80),
    plusForever: String(progress.vip_active ?? '') === 'true' && String(progress.vip_until ?? '') === '0',
  };
}

export const adminListBetaTesters = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'users.read')) throw new HttpsError('permission-denied', 'Role cannot read users');
    const snapshot = await admin.firestore().collection('users').where('progress.beta_tester', '==', 'true').limit(300).get();
    const items = snapshot.docs.map((doc) => betaProjection(doc.id, doc.data() as Row)).sort((left, right) => Number(right.betaSinceMs) - Number(left.betaSinceMs));
    return { ok: true, items, count: items.length, truncated: snapshot.size >= 300 };
  },
);

export const adminUpdateBetaTester = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = roleFor(request);
    const input = parseBetaTesterUpdateRequest(request.data);
    const needsMoney = input.action === 'grant_plus';
    if (needsMoney ? !hasPermission(role, 'money.manual_access.write') : !hasPermission(role, 'users.write')) throw new HttpsError('permission-denied', 'Role cannot perform this beta tester action');
    const actorUid = request.auth!.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = JSON.stringify({ uid: input.uid, action: input.action });
    return db.runTransaction(async (tx) => {
      const [userSnap, operationSnap] = await Promise.all([tx.get(userRef), tx.get(operationRef)]);
      if (operationSnap.exists) {
        const previous = operationSnap.data() ?? {};
        if (previous.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotencyKey was already used for another payload');
        return { ok: true, replayed: true, auditId: String(previous.auditId ?? '') };
      }
      if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
      const user = userSnap.data() as Row;
      const before = betaProjection(input.uid, user);
      const patch = applyBetaTesterAction(user, input.action, Date.now());
      const after = { ...before, requestedAction: input.action };
      const timestamp = new Date().toISOString();
      const audit = createAuditRecord({ action: 'beta_tester.update', actorUid, role, entity: { collection: 'users', id: input.uid }, reason: input.reason, before, after, requestId: input.requestId, timestamp });
      tx.update(userRef, patch);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey, command: input.action });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, replayed: false, auditId: auditRef.id };
    });
  },
);

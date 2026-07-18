/**
 * Guarded individual reward grants for Admin v2 and the legacy admin fallback.
 *
 * The callable owns validation, role enforcement, idempotency, the user mutation,
 * the inbox reward row and the audit record. The browser never writes these
 * collections directly.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const SHARDS_MIN = 1;
const SHARDS_MAX = 10_000;

export const ADMIN_GRANT_REWARD_TYPES = [
  'shards',
  'xp_boost_2x_24h',
  'xp_boost_2x_48h',
  'chain_shield_1',
  'chain_shield_3',
] as const;

export type AdminGrantRewardType = (typeof ADMIN_GRANT_REWARD_TYPES)[number];
type Row = Record<string, unknown>;

export interface AdminGrantRewardInput {
  readonly uid: string;
  readonly type: AdminGrantRewardType;
  readonly amount: number;
  readonly reason: string;
  readonly comment: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

export interface AdminRewardMutation {
  readonly updates: Readonly<Row>;
  readonly shardLog: Readonly<Row> | null;
  readonly label: string;
  readonly shardsAmount: number;
  readonly before: Readonly<Row>;
  readonly after: Readonly<Row>;
}

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rewardType(value: unknown): AdminGrantRewardType {
  const candidate = text(value, 40);
  if (!(ADMIN_GRANT_REWARD_TYPES as readonly string[]).includes(candidate)) {
    throw new HttpsError('invalid-argument', 'unsupported reward type');
  }
  return candidate as AdminGrantRewardType;
}

export function normalizeAdminGrantRewardInput(data: unknown): AdminGrantRewardInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'reward command required');
  const uid = text(data.uid, 161);
  const type = rewardType(data.type);
  const rawAmount = finiteNumber(data.amount, 0);
  const amount = type === 'shards' ? Math.floor(rawAmount) : 0;
  const reason = text(data.reason, 500);
  const comment = text(data.comment, 200);
  const idempotencyKey = text(data.idempotencyKey, 161);
  const requestId = text(data.requestId, 161);

  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  if (type === 'shards' && (amount < SHARDS_MIN || amount > SHARDS_MAX)) {
    throw new HttpsError('invalid-argument', `shards amount must be ${SHARDS_MIN}..${SHARDS_MAX}`);
  }
  if (!reason) throw new HttpsError('invalid-argument', 'reason is required');
  if (!TOKEN_RE.test(idempotencyKey) || !TOKEN_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'idempotencyKey and requestId are required');
  }

  return Object.freeze({ uid, type, amount, reason, comment, idempotencyKey, requestId });
}

export function adminGrantRewardFingerprint(input: AdminGrantRewardInput): string {
  return JSON.stringify({
    action: 'grant_reward',
    uid: input.uid,
    type: input.type,
    amount: input.amount,
    reason: input.reason,
    comment: input.comment,
  });
}

function utcDate(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function buildAdminRewardMutation(
  user: Readonly<Row>,
  type: AdminGrantRewardType,
  amount: number,
  nowMs: number,
): AdminRewardMutation {
  const updates: Row = { updatedAt: nowMs };
  let shardLog: Row | null = null;
  let label = '';
  let shardsAmount = 0;
  let before: Row = {};
  let after: Row = {};

  if (type === 'shards') {
    const previous = finiteNumber(user.shards, 0);
    const next = previous + amount;
    updates.shards = next;
    updates.shards_updated_at_ms = nowMs;
    updates.shards_updated_op = 'earn';
    updates.shards_updated_reason = 'admin_grant';
    shardLog = {
      ts: new Date(nowMs).toISOString(),
      type: 'earn',
      amount,
      reason: 'admin_grant',
      balanceBefore: previous,
      balanceAfter: next,
    };
    label = `+${amount} осколков знаний`;
    shardsAmount = amount;
    before = { shards: previous };
    after = { shards: next };
  }

  if (type === 'xp_boost_2x_24h' || type === 'xp_boost_2x_48h') {
    const hours = type === 'xp_boost_2x_24h' ? 24 : 48;
    const previous = text(user.gift_xp_multiplier, 2_000) || null;
    const next = JSON.stringify({ multiplier: 2, expiresAt: nowMs + hours * 3_600_000 });
    updates.gift_xp_multiplier = next;
    label = `x2 XP на ${hours} часов`;
    before = { gift_xp_multiplier: previous };
    after = { gift_xp_multiplier: next };
  }

  if (type === 'chain_shield_1' || type === 'chain_shield_3') {
    const days = type === 'chain_shield_1' ? 1 : 3;
    let existingDays = 0;
    try {
      const parsed = JSON.parse(text(user.chain_shield, 2_000)) as { daysLeft?: unknown };
      existingDays = Math.max(0, Math.floor(finiteNumber(parsed?.daysLeft, 0)));
    } catch {
      existingDays = 0;
    }
    const previous = text(user.chain_shield, 2_000) || null;
    const next = JSON.stringify({ daysLeft: existingDays + days, grantedAt: utcDate(nowMs) });
    updates.chain_shield = next;
    label = `Щит серии на ${days} ${days === 1 ? 'день' : 'дня'}`;
    before = { chain_shield: previous };
    after = { chain_shield: next };
  }

  return Object.freeze({
    updates: Object.freeze(updates),
    shardLog: shardLog ? Object.freeze(shardLog) : null,
    label,
    shardsAmount,
    before: Object.freeze(before),
    after: Object.freeze(after),
  });
}

function requireRewardWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  actorEmail: string;
  role: AdminRole;
} {
  const actorUid = text(request.auth?.uid, 160);
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true || !hasAdminRole(token.adminRole)) {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  const role = token.adminRole;
  if (!hasPermission(role, 'users.write')) throw new HttpsError('permission-denied', 'Role cannot use users.write');
  return { actorUid, actorEmail: text(token.email, 320) || actorUid, role };
}

export function assertAdminRewardReplay(
  operation: Readonly<Row>,
  fingerprint: string,
  actorUid: string,
): void {
  if (operation.action !== 'grant_reward') {
    throw new HttpsError('already-exists', 'idempotencyKey belongs to another admin action');
  }
  if (operation.requestFingerprint !== fingerprint) {
    throw new HttpsError('already-exists', 'idempotencyKey reused for another reward command');
  }
  if (operation.actorUid && operation.actorUid !== actorUid) {
    throw new HttpsError('permission-denied', 'admin operation belongs to another actor');
  }
}

function replayResult(operation: Readonly<Row>): Row {
  const result = isRecord(operation.result) ? operation.result : {};
  return {
    ok: true,
    replayed: true,
    type: text(result.type, 40),
    amount: Math.max(0, Math.floor(finiteNumber(result.amount, 0))),
    label: text(result.label, 200),
    rewardId: text(result.rewardId, 200),
    auditId: text(operation.auditId, 200),
  };
}

export const adminGrantReward = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actor = requireRewardWriter(request as { auth?: { uid?: string; token?: Row } });
    const input = normalizeAdminGrantRewardInput(request.data);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const rewardRef = userRef.collection('shard_rewards').doc(`admin_${input.idempotencyKey}`);
    const shardLogRef = userRef.collection('shard_log').doc(`admin_${input.idempotencyKey}`);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = adminGrantRewardFingerprint(input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertAdminRewardReplay(operation, fingerprint, actor.actorUid);
        return replayResult(operation);
      }

      const userSnapshot = await tx.get(userRef);
      if (!userSnapshot.exists) throw new HttpsError('not-found', `User ${input.uid} not found`);
      const mutation = buildAdminRewardMutation(userSnapshot.data() ?? {}, input.type, input.amount, nowMs);
      const result = {
        type: input.type,
        amount: mutation.shardsAmount,
        label: mutation.label,
        rewardId: rewardRef.id,
      };
      const audit = createAuditRecord({
        action: 'grant_reward',
        actorUid: actor.actorUid,
        role: actor.role,
        entity: { collection: 'users', id: input.uid },
        reason: input.reason,
        before: mutation.before,
        after: { ...mutation.after, rewardType: input.type, rewardId: rewardRef.id },
        rollbackReference: null,
        requestId: input.requestId,
        timestamp: nowIso,
      });

      tx.update(userRef, mutation.updates);
      if (mutation.shardLog) {
        tx.create(shardLogRef, {
          ...mutation.shardLog,
          targetUid: input.uid,
          adminEmail: actor.actorEmail,
          adminUid: actor.actorUid,
          comment: input.comment || null,
          operationId: input.idempotencyKey,
        });
      }
      tx.create(rewardRef, {
        ts: nowIso,
        reason: 'admin_grant',
        amount: mutation.shardsAmount,
        rewardType: input.type,
        adminEmail: actor.actorEmail,
        adminUid: actor.actorUid,
        comment: input.comment || null,
        label: mutation.label,
        operationId: input.idempotencyKey,
        seen: false,
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        action: 'grant_reward',
        requestFingerprint: fingerprint,
        actorUid: actor.actorUid,
        auditId: auditRef.id,
        result,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, replayed: false, auditId: auditRef.id, ...result };
    });
  },
);

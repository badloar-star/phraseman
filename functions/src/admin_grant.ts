/**
 * Guarded individual reward grants for Admin v2 and the legacy admin fallback.
 *
 * The callable owns validation, role enforcement, idempotency, the user mutation,
 * the inbox reward row and the audit record. The browser never writes these
 * collections directly.
 */
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { getWeekKey, isoDateUtc } from './progress_events';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  prepareStarOperations,
  STAR_OP_MAX_ABS_DELTA,
} from './stars_ledger';

const REGION = 'us-central1';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
// зачем: D86 (владелец, 2026-09-30) — админ-выдача жемчуга заменена монетами
// (рунный кошелёк, stars_ledger, причина admin_grant). Потолок — потолок одной
// операции журнала монет. Корректировка баланса жемчуга (adminSetShardBalance)
// удалена вместе с жемчугом (D70). Дни Plus выдаёт отдельный adminGrantAccess.
const COINS_MIN = 1;
const COINS_MAX = STAR_OP_MAX_ABS_DELTA;

export const ADMIN_GRANT_REWARD_TYPES = [
  'coins',
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
  readonly label: string;
  readonly coinsAmount: number;
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
  const amount = Math.floor(rawAmount);
  const reason = text(data.reason, 500);
  const comment = text(data.comment, 200);
  const idempotencyKey = text(data.idempotencyKey, 161);
  const requestId = text(data.requestId, 161);

  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  if (amount < COINS_MIN || amount > COINS_MAX) {
    throw new HttpsError('invalid-argument', `coins amount must be ${COINS_MIN}..${COINS_MAX}`);
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

export function buildAdminRewardMutation(
  _user: Readonly<Row>,
  type: string,
  amount: number,
  nowMs: number,
): AdminRewardMutation {
  if (type !== 'coins') throw new HttpsError('invalid-argument', 'unsupported reward type');
  return Object.freeze({
    updates: Object.freeze({ updatedAt: nowMs }),
    label: `+${amount} монет`,
    coinsAmount: amount,
    before: Object.freeze({ coinsLedger: 'stars_ledger' }),
    after: Object.freeze({ coinsDelta: amount }),
  });
}

/** Детерминированный opId журнала монет: одна админ-команда = одна операция. */
export function adminGrantCoinOpId(idempotencyKey: string): string {
  return `admin_grant:${crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 64)}`;
}

function requireRewardWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  actorEmail: string;
  role: AdminRole;
} {
  const actorUid = text(request.auth?.uid, 160);
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  // зачем: adminRole в проекте никем не проставляется (setCustomUserClaims нет),
  // поэтому у действующих админов роли нет и выдача наград отваливалась. Флага admin
  // достаточно — считаем такого админа owner'ом; явная роль, если есть, всё ещё сужает права.
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
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
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireRewardWriter(request as { auth?: { uid?: string; token?: Row } });
    const input = normalizeAdminGrantRewardInput(request.data);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    // История выдач для карточки пользователя в админке (admin_user_profile читает её).
    const rewardRef = userRef.collection('shard_rewards').doc(`admin_${input.idempotencyKey}`);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = adminGrantRewardFingerprint(input);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    return db.runTransaction(async (tx) => {
      beginStarLedgerTransactionAttempt(tx);
      const operationSnapshot = await tx.get(operationRef);
      if (operationSnapshot.exists) {
        const operation = operationSnapshot.data() ?? {};
        assertAdminRewardReplay(operation, fingerprint, actor.actorUid);
        return replayResult(operation);
      }

      const userSnapshot = await tx.get(userRef);
      if (!userSnapshot.exists) throw new HttpsError('not-found', `User ${input.uid} not found`);
      const mutation = buildAdminRewardMutation(userSnapshot.data() ?? {}, input.type, input.amount, nowMs);
      // зачем: D86 — журнал монет читает расписку в этой же транзакции, поэтому
      // подготовка идёт ДО первой записи.
      const coinsPrepared = await prepareStarOperations(tx, db, input.uid, userSnapshot, [{
        opId: adminGrantCoinOpId(input.idempotencyKey),
        delta: mutation.coinsAmount,
        reason: 'admin_grant',
        sourceKind: 'admin_grant',
        sourceId: input.idempotencyKey.slice(0, 96),
        ruleVersion: 1,
        earnedAtMs: nowMs,
      }], {
        nowMs,
        activeSeasonId: '',
        weekKeyNow: getWeekKey(isoDateUtc(new Date(nowMs))),
        authUid: actor.actorUid,
      });
      const outcome = coinsPrepared.outcomes[0];
      console.log(JSON.stringify({
        event: 'admin_grant_coins_prepared',
        targetUid: input.uid,
        operationId: input.idempotencyKey,
        amount: mutation.coinsAmount,
        status: outcome?.status ?? null,
        errorCode: outcome?.errorCode ?? null,
      }));
      if (!outcome || outcome.status === 'rejected') {
        throw new HttpsError('failed-precondition', `admin_grant_coins_rejected:${outcome?.errorCode ?? 'unknown'}`);
      }
      const result = {
        type: input.type,
        amount: mutation.coinsAmount,
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

      const extraUpdates = { ...mutation.updates };
      if (Object.keys(extraUpdates).length > 0) tx.update(userRef, extraUpdates);
      // Единственный писатель кошелька монет. На телефон монеты приходят со
      // следующим серверным снапшотом кошелька (mergeLevelSpinServerStars).
      const committed = commitStarOperations(tx, coinsPrepared);
      tx.create(rewardRef, {
        ts: nowIso,
        reason: 'admin_grant',
        amount: mutation.coinsAmount,
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

      return {
        ok: true,
        replayed: false,
        auditId: auditRef.id,
        ...result,
        coinsBalanceAfter: committed.balance,
        coinsSeqAfter: committed.seq,
      };
    });
  },
);

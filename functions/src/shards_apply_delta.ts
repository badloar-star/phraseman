// ═══════════════════════════════════════════════════════════════════════════
// shards_apply_delta.ts — атомарное серверное начисление/списание осколков.
//
// K3 (UX_PROBLEMS_AUDIT_2026-07-04): основной клиентский путь записи осколков
// (shards_system.ts:applyShardDeltaToCloud / syncShardsToCloud) — это
// read-modify-write БЕЗ транзакции. Два устройства (или earn + фоновый sync)
// читают один и тот же баланс и записывают наперегонки → одна дельта теряется
// (TOCTOU). К тому же прямая клиентская запись `shards` заблокирована
// firestore.rules (hasNoShardWrites) — код рассчитан на запись, которая всегда
// падает, маскируя латентный рассинхрон.
//
// Фикс: единственная точка записи баланса — этот callable под Admin SDK
// (обходит rules), внутри runTransaction. Идемпотентность по opId
// (клиентский uuid операции) — повтор при ретрае/офлайн-очереди не удваивает
// дельту. Маркер: users/{uid}/shard_operation_receipts/{opId}.
//
// P0-B1 (2026-07-18): earn принимается только по серверному каталогу
// reason + amount. В той же транзакции расходуется ограниченный суточный
// бюджет владельца: отдельно по источнику и общий. Spend остаётся без такого
// ограничения, потому что только уменьшает баланс.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  SHARD_EARN_DAILY_COUNTERS_COLLECTION,
  applyShardEarnBudget,
  normalizeShardEarnDailyCounter,
  resolveShardEarnPolicy,
  utcShardEarnDayKey,
} from './shard_reward_catalog';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_TOMBSTONES,
} from './account_delete_job';

const SHARD_OPERATION_RECEIPTS_COLLECTION = 'shard_operation_receipts';
const AUTH_LINKS_COLLECTION = 'auth_links';
const OP_ID_RE = /^[A-Za-z0-9_:-]{8,80}$/;
const REASON_MAX_LEN = 64;

function readShardBalance(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readUpdatedAtMs(value: unknown): number | null {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type ShardsApplyDeltaInput = {
  opId: string;
  ownerStableId: string;
  delta: number;
  type: 'earn' | 'spend';
  reason: string;
};

export type ShardsApplyDeltaResult = {
  ok: boolean;
  /** true, если opId уже был применён — возвращён прежний баланс, дельта не удвоена. */
  alreadyApplied: boolean;
  /** true при type:'spend', когда баланса не хватило (next < 0). Баланс не изменён. */
  insufficient: boolean;
  balance: number;
  shardsUpdatedAtMs: number | null;
};

/**
 * Валидация входа. Чистая функция — экспортируется для юнит-тестов.
 * Возвращает нормализованный вход либо строку-код ошибки invalid-argument.
 */
export function validateShardsApplyDeltaInput(data: unknown):
  | { ok: true; value: ShardsApplyDeltaInput }
  | { ok: false; message: string } {
  const d = (data ?? {}) as Record<string, unknown>;
  const opId = typeof d.opId === 'string' ? d.opId : '';
  if (!OP_ID_RE.test(opId)) {
    return { ok: false, message: 'opId must match [A-Za-z0-9_:-]{8,80}' };
  }
  const ownerStableId = typeof d.ownerStableId === 'string' ? d.ownerStableId : '';
  if (
    !ownerStableId
    || ownerStableId !== ownerStableId.trim()
    || ownerStableId.length > 200
    || /[\/\s]/.test(ownerStableId)
  ) {
    return { ok: false, message: 'ownerStableId is required' };
  }
  const type = d.type;
  if (type !== 'earn' && type !== 'spend') {
    return { ok: false, message: "type must be 'earn' or 'spend'" };
  }
  const deltaRaw = d.delta;
  if (typeof deltaRaw !== 'number' || !Number.isSafeInteger(deltaRaw) || deltaRaw <= 0) {
    return { ok: false, message: 'delta must be a positive integer (magnitude)' };
  }
  const reason = typeof d.reason === 'string' ? d.reason : '';
  if (!reason || reason !== reason.trim() || reason.length > REASON_MAX_LEN) {
    return { ok: false, message: `reason must be 1-${REASON_MAX_LEN} trimmed characters` };
  }
  if (type === 'earn' && resolveShardEarnPolicy(reason, deltaRaw) === null) {
    return { ok: false, message: 'earn reason/amount is not in the server catalog' };
  }
  return {
    ok: true,
    value: { opId, ownerStableId, delta: deltaRaw, type, reason },
  };
}

export function shardOwnerMatchesResolvedIdentity(
  resolvedStableId: string | null | undefined,
  ownerStableId: string,
): boolean {
  return typeof resolvedStableId === 'string'
    && resolvedStableId.length > 0
    && resolvedStableId === ownerStableId;
}

export function shardReceiptMatchesOperation(
  receiptData: unknown,
  operation: {
    opId: string;
    type: 'earn' | 'spend';
    reason: string;
    signedDelta: number;
  },
): boolean {
  const receipt = (receiptData ?? {}) as Record<string, unknown>;
  return receipt.opId === operation.opId
    && receipt.type === operation.type
    && receipt.reason === operation.reason
    && receipt.delta === operation.signedDelta;
}

export function shardTransactionOwnerMatchesIdentity(input: {
  authUid: string;
  ownerStableId: string;
  authLinkExists: boolean;
  authLinkStableId: unknown;
  ownerUserExists: boolean;
  ownerUserFirebaseAuthUid: unknown;
}): boolean {
  if (!input.ownerUserExists) return false;
  if (input.authLinkExists) {
    return typeof input.authLinkStableId === 'string'
      && input.authLinkStableId === input.ownerStableId;
  }
  return input.ownerStableId === input.authUid
    || (
      typeof input.ownerUserFirebaseAuthUid === 'string'
      && input.ownerUserFirebaseAuthUid === input.authUid
    );
}

/**
 * Чистое ядро транзакции — вычисляет исход по текущему состоянию. Экспортируется
 * для юнит-тестов (идемпотентность / spend-guard) без Firestore-харнесса.
 *
 * @param claimExists   серверный receipt shard_operation_receipts/{opId} уже записан?
 * @param currentBalance текущий серверный баланс.
 * @param signedDelta    дельта со знаком (earn: +, spend: −).
 */
export function computeShardsDeltaOutcome(
  claimExists: boolean,
  currentBalance: number,
  signedDelta: number,
): { write: boolean; alreadyApplied: boolean; insufficient: boolean; balance: number } {
  const base = readShardBalance(currentBalance);
  if (claimExists) {
    return { write: false, alreadyApplied: true, insufficient: false, balance: base };
  }
  const next = base + Math.trunc(signedDelta);
  if (next < 0) {
    return { write: false, alreadyApplied: false, insufficient: true, balance: base };
  }
  return { write: true, alreadyApplied: false, insufficient: false, balance: next };
}

/**
 * Callable: атомарно применить дельту осколков.
 *
 * Вход:  { opId, delta (положительная величина), type: 'earn'|'spend', reason, stableId }
 * Ответ: { ok, alreadyApplied, insufficient, balance, shardsUpdatedAtMs }
 *
 * delta ВСЕГДА положительна — направление задаёт type. Сервер сам применяет
 * знак (earn: +delta, spend: −delta). Так клиент не может случайно/намеренно
 * передать отрицательный earn или положительный spend.
 */
export const shardsApplyDelta = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');

  const validated = validateShardsApplyDeltaInput(request.data);
  if (!validated.ok) {
    throw new HttpsError('invalid-argument', validated.message);
  }
  const { opId, ownerStableId, delta, type, reason } = validated.value;
  const earnPolicy = type === 'earn' ? resolveShardEarnPolicy(reason, delta) : null;
  if (type === 'earn' && earnPolicy === null) {
    throw new HttpsError('invalid-argument', 'earn reason/amount is not in the server catalog');
  }

  const db = admin.firestore();
  // Тот же документ, под которым клиент хранит осколки (getCanonicalUserId ===
  // stableId). Без проброса stableId сервер для юзеров с релинком (анон→Google,
  // мердж) писал бы в ДРУГОЙ документ — см. коммент в daily_tasks_shards.ts.
  const authUid = request.auth.uid;
  const resolvedStableId = await resolveStableUidForAuth(
    db,
    authUid,
    undefined,
    { repairLinks: false, requireKnownIdentity: true },
  );
  if (!shardOwnerMatchesResolvedIdentity(resolvedStableId, ownerStableId)) {
    throw new HttpsError('permission-denied', 'Shard operation owner mismatch');
  }
  const uid = ownerStableId;

  const userRef = db.collection('users').doc(uid);
  const receiptRef = userRef.collection(SHARD_OPERATION_RECEIPTS_COLLECTION).doc(opId);
  const earnDayKey = utcShardEarnDayKey(Date.now());
  const earnCounterRef = userRef
    .collection(SHARD_EARN_DAILY_COUNTERS_COLLECTION)
    .doc(earnDayKey);
  const authLinkRef = db.collection(AUTH_LINKS_COLLECTION).doc(authUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(uid);
  // Earn amount comes from the server policy after the client value has been
  // matched exactly. Spend deliberately keeps its existing client magnitude.
  const signedDelta = earnPolicy?.amount ?? -delta;

  const result = await db.runTransaction(async (tx): Promise<ShardsApplyDeltaResult> => {
    const [
      authMarkerSnap,
      tombstoneSnap,
      authLinkSnap,
      receiptSnap,
      userSnap,
    ] = await Promise.all([
      tx.get(authMarkerRef),
      tx.get(tombstoneRef),
      tx.get(authLinkRef),
      tx.get(receiptRef),
      tx.get(userRef),
    ]);
    if (authMarkerSnap.exists || tombstoneSnap.exists) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }
    if (!shardTransactionOwnerMatchesIdentity({
      authUid,
      ownerStableId,
      authLinkExists: authLinkSnap.exists,
      authLinkStableId: authLinkSnap.data()?.stable_id,
      ownerUserExists: userSnap.exists,
      ownerUserFirebaseAuthUid: userSnap.data()?.firebaseAuthUid,
    })) {
      throw new HttpsError('permission-denied', 'Shard operation owner changed');
    }
    const currentBalance = readShardBalance(userSnap.data()?.shards);
    const prevUpdatedAtMs = readUpdatedAtMs(userSnap.data()?.shards_updated_at_ms);

    if (
      receiptSnap.exists
      && !shardReceiptMatchesOperation(receiptSnap.data(), {
        opId,
        type,
        reason,
        signedDelta,
      })
    ) {
      throw new HttpsError('failed-precondition', 'shard_operation_conflict');
    }

    if (receiptSnap.exists) {
      const replayOutcome = computeShardsDeltaOutcome(true, currentBalance, signedDelta);
      return {
        ok: true,
        alreadyApplied: replayOutcome.alreadyApplied,
        insufficient: false,
        balance: replayOutcome.balance,
        shardsUpdatedAtMs: prevUpdatedAtMs,
      };
    }

    const outcome = computeShardsDeltaOutcome(false, currentBalance, signedDelta);

    if (!outcome.write) {
      // Идемпотентный повтор (alreadyApplied) ИЛИ spend без средств (insufficient):
      // ничего не пишем — ни маркер, ни баланс.
      return {
        ok: !outcome.insufficient,
        alreadyApplied: outcome.alreadyApplied,
        insufficient: outcome.insufficient,
        balance: outcome.balance,
        shardsUpdatedAtMs: prevUpdatedAtMs,
      };
    }

    let nextEarnCounter: ReturnType<typeof normalizeShardEarnDailyCounter> | null = null;
    if (earnPolicy !== null) {
      const earnCounterSnap = await tx.get(earnCounterRef);
      const currentEarnCounter = normalizeShardEarnDailyCounter(
        earnDayKey,
        earnCounterSnap.data(),
      );
      const budget = applyShardEarnBudget(currentEarnCounter, earnPolicy, false);
      if (!budget.allowed) {
        throw new HttpsError('resource-exhausted', 'shard_earn_daily_limit');
      }
      nextEarnCounter = budget.counter;
    }

    const shardsUpdatedAtMs = Date.now();
    tx.set(receiptRef, {
      source: 'shards_apply_delta',
      opId,
      type,
      reason,
      delta: signedDelta,
      balanceAfter: outcome.balance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (nextEarnCounter !== null) {
      tx.set(earnCounterRef, {
        dayKey: nextEarnCounter.dayKey,
        totalEarned: nextEarnCounter.totalEarned,
        bySource: nextEarnCounter.bySource,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    tx.set(userRef, {
      shards: outcome.balance,
      shards_updated_at_ms: shardsUpdatedAtMs,
      shards_updated_op: type,
      shards_updated_reason: reason,
    }, { merge: true });

    return {
      ok: true,
      alreadyApplied: false,
      insufficient: false,
      balance: outcome.balance,
      shardsUpdatedAtMs,
    };
  });

  return result;
});

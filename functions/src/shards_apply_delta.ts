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
// дельту. Маркер: users/{uid}/reward_claims/shard_op_{opId}.
//
// Объём (решение владельца 2026-07-04): «атомарность + идемпотентность». Сумму
// по-прежнему считает клиент (как и раньше) — сервер её НЕ ревалидирует по
// каталогу наград. Анти-фарм здесь ограничен санити-капом на earn: тампер-
// клиент не сможет прислать delta:99999 одним вызовом. Полная серверная
// валидация наград по reason — отдельный проект (не входит в K3).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const OP_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const REASON_MAX_LEN = 64;

// Санити-кап на ОДНУ earn-операцию. Крупнейшее легальное разовое начисление —
// покупка осколков в магазине (пакеты) + арена-пропуск; берём заведомо больший
// потолок, чтобы не резать легальные пути, но отсечь delta:99999 от тампера.
// Списание (spend) не капим: оно только уменьшает баланс, фарма не даёт.
const MAX_EARN_DELTA_PER_OP = 5000;

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
    return { ok: false, message: 'opId must match [A-Za-z0-9_-]{8,80}' };
  }
  const type = d.type;
  if (type !== 'earn' && type !== 'spend') {
    return { ok: false, message: "type must be 'earn' or 'spend'" };
  }
  const deltaRaw = Math.trunc(Number(d.delta));
  if (!Number.isFinite(deltaRaw) || deltaRaw <= 0) {
    return { ok: false, message: 'delta must be a positive integer (magnitude)' };
  }
  if (type === 'earn' && deltaRaw > MAX_EARN_DELTA_PER_OP) {
    return { ok: false, message: `earn delta exceeds per-op cap (${MAX_EARN_DELTA_PER_OP})` };
  }
  const reason = typeof d.reason === 'string' ? d.reason.trim().slice(0, REASON_MAX_LEN) : '';
  return {
    ok: true,
    value: { opId, delta: deltaRaw, type, reason: reason || 'unknown' },
  };
}

/**
 * Чистое ядро транзакции — вычисляет исход по текущему состоянию. Экспортируется
 * для юнит-тестов (идемпотентность / spend-guard) без Firestore-харнесса.
 *
 * @param claimExists   маркер reward_claims/shard_op_{opId} уже записан?
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
  const { opId, delta, type, reason } = validated.value;

  const db = admin.firestore();
  // Тот же документ, под которым клиент хранит осколки (getCanonicalUserId ===
  // stableId). Без проброса stableId сервер для юзеров с релинком (анон→Google,
  // мердж) писал бы в ДРУГОЙ документ — см. коммент в daily_tasks_shards.ts.
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const userRef = db.collection('users').doc(uid);
  const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`shard_op_${opId}`);
  const signedDelta = type === 'earn' ? delta : -delta;

  const result = await db.runTransaction(async (tx): Promise<ShardsApplyDeltaResult> => {
    const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);
    const currentBalance = readShardBalance(userSnap.data()?.shards);
    const prevUpdatedAtMs = readUpdatedAtMs(userSnap.data()?.shards_updated_at_ms);

    const outcome = computeShardsDeltaOutcome(claimSnap.exists, currentBalance, signedDelta);

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

    const shardsUpdatedAtMs = Date.now();
    tx.set(claimRef, {
      source: 'shards_apply_delta',
      opId,
      type,
      reason,
      delta: signedDelta,
      balanceAfter: outcome.balance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
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

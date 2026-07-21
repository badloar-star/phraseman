"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.shardsApplyDelta = void 0;
exports.validateShardsApplyDeltaInput = validateShardsApplyDeltaInput;
exports.shardOwnerMatchesResolvedIdentity = shardOwnerMatchesResolvedIdentity;
exports.shardReceiptMatchesOperation = shardReceiptMatchesOperation;
exports.shardTransactionOwnerMatchesIdentity = shardTransactionOwnerMatchesIdentity;
exports.computeShardsDeltaOutcome = computeShardsDeltaOutcome;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const shard_reward_catalog_1 = require("./shard_reward_catalog");
const account_delete_job_1 = require("./account_delete_job");
const SHARD_OPERATION_RECEIPTS_COLLECTION = 'shard_operation_receipts';
const AUTH_LINKS_COLLECTION = 'auth_links';
const OP_ID_RE = /^[A-Za-z0-9_:-]{8,80}$/;
const REASON_MAX_LEN = 64;
function readShardBalance(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}
function readUpdatedAtMs(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n > 0 ? n : null;
}
/**
 * Валидация входа. Чистая функция — экспортируется для юнит-тестов.
 * Возвращает нормализованный вход либо строку-код ошибки invalid-argument.
 */
function validateShardsApplyDeltaInput(data) {
    const d = (data ?? {});
    const opId = typeof d.opId === 'string' ? d.opId : '';
    if (!OP_ID_RE.test(opId)) {
        return { ok: false, message: 'opId must match [A-Za-z0-9_:-]{8,80}' };
    }
    const ownerStableId = typeof d.ownerStableId === 'string' ? d.ownerStableId : '';
    if (!ownerStableId
        || ownerStableId !== ownerStableId.trim()
        || ownerStableId.length > 200
        || /[\/\s]/.test(ownerStableId)) {
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
    if (type === 'earn' && (0, shard_reward_catalog_1.resolveShardEarnPolicy)(reason, deltaRaw) === null) {
        return { ok: false, message: 'earn reason/amount is not in the server catalog' };
    }
    return {
        ok: true,
        value: { opId, ownerStableId, delta: deltaRaw, type, reason },
    };
}
function shardOwnerMatchesResolvedIdentity(resolvedStableId, ownerStableId) {
    return typeof resolvedStableId === 'string'
        && resolvedStableId.length > 0
        && resolvedStableId === ownerStableId;
}
function shardReceiptMatchesOperation(receiptData, operation) {
    const receipt = (receiptData ?? {});
    return receipt.opId === operation.opId
        && receipt.type === operation.type
        && receipt.reason === operation.reason
        && receipt.delta === operation.signedDelta;
}
function shardTransactionOwnerMatchesIdentity(input) {
    if (!input.ownerUserExists)
        return false;
    if (input.authLinkExists) {
        return typeof input.authLinkStableId === 'string'
            && input.authLinkStableId === input.ownerStableId;
    }
    return input.ownerStableId === input.authUid
        || (typeof input.ownerUserFirebaseAuthUid === 'string'
            && input.ownerUserFirebaseAuthUid === input.authUid);
}
/**
 * Чистое ядро транзакции — вычисляет исход по текущему состоянию. Экспортируется
 * для юнит-тестов (идемпотентность / spend-guard) без Firestore-харнесса.
 *
 * @param claimExists   серверный receipt shard_operation_receipts/{opId} уже записан?
 * @param currentBalance текущий серверный баланс.
 * @param signedDelta    дельта со знаком (earn: +, spend: −).
 */
function computeShardsDeltaOutcome(claimExists, currentBalance, signedDelta) {
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
exports.shardsApplyDelta = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const validated = validateShardsApplyDeltaInput(request.data);
    if (!validated.ok) {
        throw new https_1.HttpsError('invalid-argument', validated.message);
    }
    const { opId, ownerStableId, delta, type, reason } = validated.value;
    const earnPolicy = type === 'earn' ? (0, shard_reward_catalog_1.resolveShardEarnPolicy)(reason, delta) : null;
    if (type === 'earn' && earnPolicy === null) {
        throw new https_1.HttpsError('invalid-argument', 'earn reason/amount is not in the server catalog');
    }
    const db = admin.firestore();
    // Тот же документ, под которым клиент хранит осколки (getCanonicalUserId ===
    // stableId). Без проброса stableId сервер для юзеров с релинком (анон→Google,
    // мердж) писал бы в ДРУГОЙ документ — см. коммент в daily_tasks_shards.ts.
    const authUid = request.auth.uid;
    const resolvedStableId = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, { repairLinks: false, requireKnownIdentity: true });
    if (!shardOwnerMatchesResolvedIdentity(resolvedStableId, ownerStableId)) {
        throw new https_1.HttpsError('permission-denied', 'Shard operation owner mismatch');
    }
    const uid = ownerStableId;
    const userRef = db.collection('users').doc(uid);
    const receiptRef = userRef.collection(SHARD_OPERATION_RECEIPTS_COLLECTION).doc(opId);
    const earnDayKey = (0, shard_reward_catalog_1.utcShardEarnDayKey)(Date.now());
    const earnCounterRef = userRef
        .collection(shard_reward_catalog_1.SHARD_EARN_DAILY_COUNTERS_COLLECTION)
        .doc(earnDayKey);
    const authLinkRef = db.collection(AUTH_LINKS_COLLECTION).doc(authUid);
    const authMarkerRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
    const tombstoneRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(uid);
    // Earn amount comes from the server policy after the client value has been
    // matched exactly. Spend deliberately keeps its existing client magnitude.
    const signedDelta = earnPolicy?.amount ?? -delta;
    const result = await db.runTransaction(async (tx) => {
        const [authMarkerSnap, tombstoneSnap, authLinkSnap, receiptSnap, userSnap,] = await Promise.all([
            tx.get(authMarkerRef),
            tx.get(tombstoneRef),
            tx.get(authLinkRef),
            tx.get(receiptRef),
            tx.get(userRef),
        ]);
        if (authMarkerSnap.exists || tombstoneSnap.exists) {
            throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
        }
        if (!shardTransactionOwnerMatchesIdentity({
            authUid,
            ownerStableId,
            authLinkExists: authLinkSnap.exists,
            authLinkStableId: authLinkSnap.data()?.stable_id,
            ownerUserExists: userSnap.exists,
            ownerUserFirebaseAuthUid: userSnap.data()?.firebaseAuthUid,
        })) {
            throw new https_1.HttpsError('permission-denied', 'Shard operation owner changed');
        }
        const currentBalance = readShardBalance(userSnap.data()?.shards);
        const prevUpdatedAtMs = readUpdatedAtMs(userSnap.data()?.shards_updated_at_ms);
        if (receiptSnap.exists
            && !shardReceiptMatchesOperation(receiptSnap.data(), {
                opId,
                type,
                reason,
                signedDelta,
            })) {
            throw new https_1.HttpsError('failed-precondition', 'shard_operation_conflict');
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
        let nextEarnCounter = null;
        if (earnPolicy !== null) {
            const earnCounterSnap = await tx.get(earnCounterRef);
            const currentEarnCounter = (0, shard_reward_catalog_1.normalizeShardEarnDailyCounter)(earnDayKey, earnCounterSnap.data());
            const budget = (0, shard_reward_catalog_1.applyShardEarnBudget)(currentEarnCounter, earnPolicy, false);
            if (!budget.allowed) {
                throw new https_1.HttpsError('resource-exhausted', 'shard_earn_daily_limit');
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
//# sourceMappingURL=shards_apply_delta.js.map
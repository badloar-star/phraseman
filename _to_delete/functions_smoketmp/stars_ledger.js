"use strict";
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
exports.STAR_OP_CLASS = exports.EMPTY_STARS_STATE = exports.STAR_OPERATIONS_COLLECTION = exports.STAR_OP_RETENTION_MS = exports.STAR_OP_MAX_BACKDATE_MS = exports.STAR_OP_MAX_ABS_DELTA = exports.STAR_OP_SCHEMA_VERSION = exports.STARS_SCHEMA_VERSION = void 0;
exports.starsWeekEarned = starsWeekEarned;
exports.starsSeasonEarned = starsSeasonEarned;
exports.starsSpendable = starsSpendable;
exports.normalizeStars = normalizeStars;
exports.prepareStarOperations = prepareStarOperations;
exports.commitStarOperations = commitStarOperations;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
/**
 * Единый журнал звёзд — ЕДИНСТВЕННЫЙ писатель звёздного баланса во всём
 * приложении.
 *
 * Владелец (2026-08-12, D-05/D-06): звезда — одна общая валюта. Любое
 * начисление в любом разделе обновляет всё сразу, расхождений между разделами
 * быть не может.
 *
 * Ключевые решения, каждое оплачено разбором кода:
 *
 * 1. Баланс лежит картой `stars` в `users/{stableUid}` — документе, который
 *    приложение и так читает один раз при старте. Ноль дополнительных чтений.
 * 2. Звёзды целые. Подъединиц нет: все правила начисления оперируют целыми,
 *    а пороги наград и сортировка лиг обязаны сравнивать целые.
 * 3. Операции принимаются МАССИВОМ. В `settleMatch` один и тот же игрок
 *    получает звёзды дважды в одной транзакции (матч и пороги мастерства);
 *    два отдельных вызова читали бы одно и то же состояние, и второй затёр бы
 *    первый.
 * 4. Две фазы: `prepareStarOperations` только читает, `commitStarOperations`
 *    только пишет. Firestore требует, чтобы все чтения шли до всех записей, а
 *    вызывающий код их перемежает.
 * 5. Ключ дедупликации — `<sourceKind>:<sourceId>`, без версии правил. Ключ,
 *    который меняется при смене суммы, дедупликацией не является.
 * 6. Четыре счётчика вместо двух. `earnedTotal` (заработано, открывает награды)
 *    отделён от `grantedTotal` (обмен монет, ручные выдачи) — иначе деньги
 *    покупали бы прогресс сезонного пропуска.
 */
exports.STARS_SCHEMA_VERSION = 'stars.v1';
exports.STAR_OP_SCHEMA_VERSION = 'star-op.v1';
/** Максимальный модуль одной операции. Защита от арифметической ошибки выше. */
exports.STAR_OP_MAX_ABS_DELTA = 5000;
/** Насколько в прошлое разрешено датировать операцию (оффлайн-отчёт). */
exports.STAR_OP_MAX_BACKDATE_MS = 8 * 24 * 60 * 60 * 1000;
exports.STAR_OP_RETENTION_MS = 400 * 24 * 60 * 60 * 1000;
exports.STAR_OPERATIONS_COLLECTION = 'star_operations';
exports.EMPTY_STARS_STATE = Object.freeze({
    schemaVersion: exports.STARS_SCHEMA_VERSION,
    balance: 0,
    earnedTotal: 0,
    grantedTotal: 0,
    spentTotal: 0,
    weekKey: '',
    weekEarned: 0,
    prevWeekKey: '',
    prevWeekEarned: 0,
    seasonId: '',
    seasonEarned: 0,
    seq: 0,
    lastOpId: '',
    updatedAtMs: 0,
});
/** Куда идёт положительная дельта. Таблица серверная, клиент её не задаёт. */
exports.STAR_OP_CLASS = Object.freeze({
    arena_match: 'earn',
    arena_mastery: 'earn',
    arena_today: 'earn',
    arena_today_mastery: 'earn',
    arena_partner: 'earn',
    spend_shop: 'spend',
    admin_revoke: 'spend',
    admin_grant: 'grant',
    coin_exchange: 'grant',
});
/* ------------------------------- проекции -------------------------------- */
/**
 * Единственный законный способ прочитать недельный счётчик.
 *
 * Устаревшая неделя читается как ноль и НЕ чинится записью — именно это делает
 * смену недели бесплатной: без ремонта нет ни одной лишней записи в понедельник.
 */
function starsWeekEarned(stars, weekKeyNow) {
    if (!stars)
        return 0;
    if (stars.weekKey === weekKeyNow)
        return Math.max(0, stars.weekEarned);
    if (stars.prevWeekKey === weekKeyNow)
        return Math.max(0, stars.prevWeekEarned);
    return 0;
}
/**
 * Единственный законный способ прочитать сезонный счётчик.
 *
 * Без этой проекции экран сезонного пропуска сравнивал бы порог награды с
 * числом ПРОШЛОГО сезона и раздавал награды бесплатно.
 */
function starsSeasonEarned(stars, activeSeasonId) {
    if (!stars || stars.seasonId !== activeSeasonId)
        return 0;
    return Math.max(0, stars.seasonEarned);
}
function starsSpendable(stars) {
    return Math.max(0, stars?.balance ?? 0);
}
/* ------------------------------ нормализация ----------------------------- */
function int(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}
function str(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function normalizeStars(raw) {
    const data = (raw ?? {});
    return {
        schemaVersion: exports.STARS_SCHEMA_VERSION,
        balance: Math.max(0, int(data.balance)),
        earnedTotal: Math.max(0, int(data.earnedTotal)),
        grantedTotal: Math.max(0, int(data.grantedTotal)),
        spentTotal: Math.max(0, int(data.spentTotal)),
        weekKey: str(data.weekKey),
        weekEarned: Math.max(0, int(data.weekEarned)),
        prevWeekKey: str(data.prevWeekKey),
        prevWeekEarned: Math.max(0, int(data.prevWeekEarned)),
        seasonId: str(data.seasonId),
        seasonEarned: Math.max(0, int(data.seasonEarned)),
        seq: Math.max(0, int(data.seq)),
        lastOpId: str(data.lastOpId),
        updatedAtMs: Math.max(0, int(data.updatedAtMs)),
    };
}
function isPristine(state) {
    return state.balance === 0 && state.earnedTotal === 0
        && state.grantedTotal === 0 && state.spentTotal === 0 && state.seq === 0;
}
/**
 * Жёсткий инвариант. Нарушение — это порча данных, а не повод для ремонта:
 * журнал, который тихо чинит сам себя, уничтожает единственную улику.
 */
function assertInvariant(state, stableUid, stage) {
    const expected = state.earnedTotal + state.grantedTotal - state.spentTotal;
    if (expected === state.balance)
        return;
    if (stage === 'before' && isPristine(state))
        return;
    console.error('[stars_ledger] INCONSISTENT', { stableUid, stage, stars: state, expected });
    throw new https_1.HttpsError('failed-precondition', 'star_ledger_inconsistent');
}
/* ------------------------------- валидация ------------------------------- */
const OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;
function validate(op, seen) {
    if (typeof op.opId !== 'string' || !OP_ID_RE.test(op.opId) || op.opId.startsWith('__'))
        return 'invalid_op_id';
    const suffix = op.opId.slice(op.opId.indexOf(':') + 1);
    if (suffix === '.' || suffix === '..')
        return 'invalid_op_id';
    if (seen.has(op.opId))
        return 'op_conflict';
    if (!Number.isSafeInteger(op.delta) || op.delta === 0
        || Math.abs(op.delta) > exports.STAR_OP_MAX_ABS_DELTA)
        return 'invalid_delta';
    const cls = exports.STAR_OP_CLASS[op.reason];
    if (!cls)
        return 'invalid_reason';
    if ((cls === 'earn' || cls === 'grant') && op.delta < 0)
        return 'invalid_reason';
    if (cls === 'spend' && op.delta > 0)
        return 'invalid_reason';
    if (op.meta) {
        const keys = Object.keys(op.meta);
        if (keys.length > 10)
            return 'meta_too_large';
        if (JSON.stringify(op.meta).length > 512)
            return 'meta_too_large';
    }
    return null;
}
/* --------------------------- защита от двойного --------------------------- */
/**
 * Механическая защита от второго `prepare` для того же игрока в одной
 * транзакции. Полагаться на ревью здесь нельзя: ошибка тихая и стоит звёзд.
 */
const preparedInTx = new WeakMap();
function assertSinglePrepare(tx, stableUid) {
    let seen = preparedInTx.get(tx);
    if (!seen) {
        seen = new Set();
        preparedInTx.set(tx, seen);
    }
    if (seen.has(stableUid)) {
        throw new https_1.HttpsError('internal', 'star_ledger_double_prepare');
    }
    seen.add(stableUid);
}
/* --------------------------------- фаза 1 -------------------------------- */
/**
 * ФАЗА 1 — ТОЛЬКО ЧТЕНИЯ. Обязана вызываться до любых записей в этой
 * транзакции. `userSnap` передаётся снаружи, чтобы документ игрока читался
 * ровно один раз на транзакцию.
 */
async function prepareStarOperations(tx, db, stableUid, userSnap, ops, ctx) {
    assertSinglePrepare(tx, stableUid);
    const userRef = userSnap.ref;
    const before = normalizeStars(userSnap.data()?.stars);
    assertInvariant(before, stableUid, 'before');
    // Ошибки хранятся ПО ИНДЕКСУ, а не по opId. При дубле в пакете обе операции
    // имеют один и тот же opId, и карта по ключу отвергла бы вместе с дублем
    // первую, законную операцию.
    const seen = new Set();
    const errorByIndex = [];
    const validIndexByOp = [];
    const valid = [];
    ops.forEach((op) => {
        const error = validate(op, seen);
        errorByIndex.push(error);
        if (error) {
            validIndexByOp.push(-1);
            return;
        }
        seen.add(op.opId);
        validIndexByOp.push(valid.length);
        valid.push(op);
    });
    const receiptsCollection = userRef.collection(exports.STAR_OPERATIONS_COLLECTION);
    const existing = valid.length
        ? await Promise.all(valid.map((op) => tx.get(receiptsCollection.doc(op.opId))))
        : [];
    const after = { ...before };
    const outcomes = [];
    const receipts = [];
    for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
        const op = ops[opIndex];
        const error = errorByIndex[opIndex];
        if (error) {
            outcomes.push({ status: 'rejected', errorCode: error, opId: String(op.opId ?? ''), seq: after.seq, appliedDelta: 0 });
            continue;
        }
        const prior = existing[validIndexByOp[opIndex]];
        if (prior?.exists) {
            outcomes.push({
                status: 'already_applied',
                opId: op.opId,
                seq: Math.max(0, int(prior.data()?.seq)),
                appliedDelta: 0,
            });
            continue;
        }
        const earnedAtMs = Math.max(ctx.nowMs - exports.STAR_OP_MAX_BACKDATE_MS, Math.min(ctx.nowMs, int(op.earnedAtMs, ctx.nowMs)));
        // Перенос недели и сезона — лениво, только в момент записи. Ни одного
        // планового прохода по базе в понедельник и в конце сезона.
        if (after.weekKey !== ctx.weekKeyNow) {
            after.prevWeekKey = after.weekKey;
            after.prevWeekEarned = after.weekEarned;
            after.weekKey = ctx.weekKeyNow;
            after.weekEarned = 0;
        }
        if (after.seasonId !== ctx.activeSeasonId) {
            after.seasonId = ctx.activeSeasonId;
            after.seasonEarned = 0;
        }
        const cls = exports.STAR_OP_CLASS[op.reason];
        if (cls === 'spend' && after.balance + op.delta < 0) {
            // Не обрезаем и не пишем: недостаток средств — это отказ, а не частичная
            // трата. Остальные операции пакета при этом не страдают.
            outcomes.push({ status: 'rejected', errorCode: 'insufficient_stars', opId: op.opId, seq: after.seq, appliedDelta: 0 });
            continue;
        }
        const balanceBefore = after.balance;
        after.balance += op.delta;
        if (cls === 'earn') {
            after.earnedTotal += op.delta;
            after.seasonEarned += op.delta;
            // Задним числом заработанное попадает в свою неделю, если она ещё
            // хранится; более старое учитывается только в счётчике за всё время.
            const opWeekKey = ctx.weekKeyForMs ? ctx.weekKeyForMs(earnedAtMs) : ctx.weekKeyNow;
            if (opWeekKey === after.weekKey)
                after.weekEarned += op.delta;
            else if (opWeekKey === after.prevWeekKey)
                after.prevWeekEarned += op.delta;
        }
        else if (cls === 'grant') {
            after.grantedTotal += op.delta;
        }
        else {
            after.spentTotal += -op.delta;
        }
        after.seq += 1;
        after.lastOpId = op.opId;
        const serverAtMs = ctx.nowMs;
        receipts.push({
            ref: receiptsCollection.doc(op.opId),
            data: {
                schemaVersion: exports.STAR_OP_SCHEMA_VERSION,
                opId: op.opId,
                seq: after.seq,
                delta: op.delta,
                reason: op.reason,
                opClass: cls,
                sourceKind: op.sourceKind,
                sourceId: op.sourceId,
                ruleVersion: int(op.ruleVersion, 1),
                balanceBefore,
                balanceAfter: after.balance,
                earnedTotalAfter: after.earnedTotal,
                grantedTotalAfter: after.grantedTotal,
                spentTotalAfter: after.spentTotal,
                weekKey: after.weekKey,
                weekEarnedAfter: after.weekEarned,
                seasonId: after.seasonId,
                seasonEarnedAfter: after.seasonEarned,
                xpDelta: Math.max(0, int(ctx.xpDelta)),
                xpTotalAfter: Math.max(0, int(ctx.xpTotalAfter)),
                authUid: ctx.authUid,
                deviceId: ctx.deviceId ?? null,
                earnedAtMs,
                serverAtMs,
                meta: op.meta ?? {},
                expireAt: admin.firestore.Timestamp.fromMillis(serverAtMs + exports.STAR_OP_RETENTION_MS),
            },
        });
        outcomes.push({ status: 'applied', opId: op.opId, seq: after.seq, appliedDelta: op.delta });
    }
    after.updatedAtMs = ctx.nowMs;
    after.schemaVersion = exports.STARS_SCHEMA_VERSION;
    assertInvariant(after, stableUid, 'after');
    const noop = receipts.length === 0 && after.seq === before.seq && after.balance === before.balance;
    return {
        stableUid,
        userRef,
        before,
        after,
        outcomes,
        receipts,
        noop,
        result: {
            outcomes,
            balance: after.balance,
            earnedTotal: after.earnedTotal,
            grantedTotal: after.grantedTotal,
            spentTotal: after.spentTotal,
            weekKey: after.weekKey,
            weekEarned: after.weekEarned,
            seasonId: after.seasonId,
            seasonEarned: after.seasonEarned,
            seq: after.seq,
            updatedAtMs: after.updatedAtMs,
            schemaVersion: exports.STARS_SCHEMA_VERSION,
        },
    };
}
/* --------------------------------- фаза 2 -------------------------------- */
/**
 * ФАЗА 2 — ТОЛЬКО ЗАПИСИ. Ровно один `tx.set` на документ игрока: сюда же
 * складывается `extraUserFields`, поэтому опыт Арены попадает в ту же запись,
 * а не во вторую.
 *
 * Чистый повтор (все операции уже применены) не пишет вообще ничего — именно
 * это делает ретрай дешёвым.
 */
function commitStarOperations(tx, prepared, extraUserFields) {
    const hasExtra = Boolean(extraUserFields && Object.keys(extraUserFields).length);
    if (prepared.noop && !hasExtra)
        return prepared.result;
    tx.set(prepared.userRef, {
        ...(extraUserFields ?? {}),
        stars: prepared.after,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    for (const receipt of prepared.receipts)
        tx.create(receipt.ref, receipt.data);
    return prepared.result;
}

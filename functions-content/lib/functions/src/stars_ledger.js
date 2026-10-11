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
exports.STAR_OP_SOURCE = exports.STAR_OP_CLASS = exports.EMPTY_STARS_STATE = exports.STAR_OPERATIONS_COLLECTION = exports.STAR_OP_RETENTION_MS = exports.STAR_OP_MAX_BACKDATE_MS = exports.STAR_OP_MAX_ABS_DELTA = exports.STAR_OP_SCHEMA_VERSION = exports.STARS_SCHEMA_VERSION = void 0;
exports.starsWeekEarned = starsWeekEarned;
exports.starsSeasonEarned = starsSeasonEarned;
exports.starsSpendable = starsSpendable;
exports.normalizeStars = normalizeStars;
exports.beginStarLedgerTransactionAttempt = beginStarLedgerTransactionAttempt;
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
exports.STAR_OP_MAX_ABS_DELTA = 5_000;
/** Насколько в прошлое разрешено датировать операцию (оффлайн-отчёт). */
exports.STAR_OP_MAX_BACKDATE_MS = 8 * 24 * 60 * 60 * 1_000;
exports.STAR_OP_RETENTION_MS = 400 * 24 * 60 * 60 * 1_000;
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
    bySource: Object.freeze({}),
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
    // Награда за взятый тир — заработок, а не подарок: её оплатили матчами.
    arena_tier: 'earn',
    spend_shop: 'spend',
    admin_revoke: 'spend',
    admin_grant: 'grant',
    coin_exchange: 'grant',
    level_spin_grant: 'grant',
    friends_together_level: 'earn',
    friends_together_chest: 'earn',
    learning_v2_session: 'earn',
    learning_v2_unlock: 'spend',
    // Учебные активности вне курса V2 — заработок наравне с сессией курса.
    practice_session: 'earn',
    welcome_gift: 'grant',
    // Просмотр видео — не учёба: grant, чтобы не двигать очки лиги (см. StarOpReason).
    video_watch: 'grant',
    dialog_extra_replies: 'spend',
    dialog_unlock: 'spend',
    community_pack_sale: 'grant',
    spire_step: 'earn',
    spire_week_reward: 'grant',
    referral_spin: 'grant',
    global_broadcast: 'grant',
    account_merge_out: 'spend',
    account_merge_in: 'grant',
});
exports.STAR_OP_SOURCE = Object.freeze({
    arena_match: 'arena',
    arena_mastery: 'arena',
    arena_today: 'arena',
    arena_today_mastery: 'arena',
    arena_partner: 'arena',
    arena_tier: 'arena',
    friends_together_level: 'friends',
    friends_together_chest: 'friends',
    learning_v2_session: 'learning',
    // Семь учебных активностей делят строку «учёба» с курсом: для игрока это один
    // и тот же смысл «заработал занимаясь», а какая именно активность — видно в
    // sourceKind расписки.
    practice_session: 'learning',
    level_spin_grant: 'spin',
    coin_exchange: 'exchange',
    // Стартовый подарок и ручные выдачи админки — «другое»: у них нет своей
    // строки на экране, но приток обязан быть виден в сумме (иначе снова 0).
    welcome_gift: 'other',
    admin_grant: 'other',
    // зачем (владелец 2026-09-03): просмотр видео НЕ идёт в строку «учёба», хотя
    // ролики обучающие. В разрезе «откуда руны» строка «учёба» означает занятия
    // внутри приложения — смешав с ней просмотр, мы бы завысили её и скрыли, что
    // руны пришли за фоновое видео, а не за упражнения.
    video_watch: 'other',
    // Траты в разрез притока не попадают вовсе — значение здесь недостижимо,
    // но тип обязан быть полным, иначе новая причина проедет незамеченной.
    spend_shop: 'other',
    admin_revoke: 'other',
    learning_v2_unlock: 'other',
    dialog_extra_replies: 'other',
    dialog_unlock: 'other',
    // Продажа своего набора — отдельного смысла в разрезе «откуда руны» пока нет,
    // поэтому «другое»: приток обязан быть виден в сумме.
    community_pack_sale: 'other',
    // Ступени Шпиля — учебные задания, для игрока это «заработал занимаясь»;
    // своей строки у Шпиля на экране «Руны» нет, новый ключ сломал бы разрез клиента.
    spire_step: 'learning',
    spire_week_reward: 'other',
    // Приз реферальной рулетки (D100) — строка «спин» разреза «откуда руны».
    referral_spin: 'spin',
    // Подарок из рассылки (D104) — «другое»: своей строки на экране «Руны» нет.
    global_broadcast: 'other',
    // Перенос при слиянии (8T) — «другое»: своей строки на экране нет, а приток
    // обязан попасть в сумму разреза (иначе bySource разойдётся с grantedTotal).
    account_merge_in: 'other',
    account_merge_out: 'other',
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
const RUNE_SOURCE_KEYS = Object.freeze([
    'arena', 'learning', 'friends', 'spin', 'exchange', 'other',
]);
/**
 * Карта источников из документа. Неизвестные ключи отбрасываются молча — это
 * не порча данных, а старая или будущая схема; главные счётчики от неё не
 * зависят, поэтому ронять транзакцию тут нечем.
 */
function normalizeBySource(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return Object.freeze({});
    const data = raw;
    const out = {};
    for (const key of RUNE_SOURCE_KEYS) {
        const value = Math.max(0, int(data[key]));
        if (value > 0)
            out[key] = value;
    }
    return Object.freeze(out);
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
        bySource: normalizeBySource(data.bySource),
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
function normalizedEarnedAtMs(op, ctx) {
    const notInFuture = Math.min(ctx.nowMs, Math.max(0, int(op.earnedAtMs, ctx.nowMs)));
    // Practice completion time is sealed into the client fingerprint before the
    // local receipt exists. Preserve it across an offline retry; rolling it to a
    // moving eight-day floor would reclassify the same immutable operation.
    if (op.reason === 'practice_session')
        return notInFuture;
    return Math.max(ctx.nowMs - exports.STAR_OP_MAX_BACKDATE_MS, notInFuture);
}
function stableMetaJson(meta) {
    return JSON.stringify(Object.fromEntries(Object.entries(meta ?? {}).sort(([left], [right]) => left.localeCompare(right))));
}
function isSameOperationReceipt(rawReceipt, op, earnedAtMs) {
    if (!rawReceipt)
        return false;
    return rawReceipt.opId === op.opId
        && rawReceipt.delta === op.delta
        && rawReceipt.reason === op.reason
        && rawReceipt.sourceKind === op.sourceKind
        && rawReceipt.sourceId === op.sourceId
        && rawReceipt.ruleVersion === int(op.ruleVersion, 1)
        && rawReceipt.earnedAtMs === earnedAtMs
        && stableMetaJson(rawReceipt.meta) === stableMetaJson(op.meta);
}
/* --------------------------- защита от двойного --------------------------- */
/**
 * Механическая защита от второго `prepare` для того же игрока в одной
 * транзакции. Полагаться на ревью здесь нельзя: ошибка тихая и стоит звёзд.
 */
const preparedInTx = new WeakMap();
/**
 * Starts one logical Firestore transaction callback attempt.
 *
 * The Admin SDK retries a callback with the same Transaction object after
 * contention. Call this only as the first statement of that callback so the
 * guard still rejects two prepares inside one attempt.
 */
function beginStarLedgerTransactionAttempt(tx) {
    preparedInTx.delete(tx);
}
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
        const earnedAtMs = normalizedEarnedAtMs(op, ctx);
        if (prior?.exists) {
            if (!isSameOperationReceipt(prior.data(), op, earnedAtMs)) {
                outcomes.push({
                    status: 'rejected',
                    errorCode: 'op_conflict',
                    opId: op.opId,
                    seq: Math.max(0, int(prior.data()?.seq)),
                    appliedDelta: 0,
                });
                continue;
            }
            outcomes.push({
                status: 'already_applied',
                opId: op.opId,
                seq: Math.max(0, int(prior.data()?.seq)),
                appliedDelta: 0,
            });
            continue;
        }
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
        let receiptWeekKey = after.weekKey;
        if (cls === 'spend' && after.balance + op.delta < 0) {
            // Не обрезаем и не пишем: недостаток средств — это отказ, а не частичная
            // трата. Остальные операции пакета при этом не страдают.
            outcomes.push({ status: 'rejected', errorCode: 'insufficient_stars', opId: op.opId, seq: after.seq, appliedDelta: 0 });
            continue;
        }
        const balanceBefore = after.balance;
        // зачем (L-1, измерение): поздние начисления на уже скрытый (слитый) аккаунт застревают на
        // нём навсегда. Только лог, поведение журнала не меняем; чинить будем по фактам логов.
        if (op.delta > 0 && userSnap.data()?.identityHidden === true) {
            console.warn(`[STARS-LEDGER] credit_to_hidden_account uid=${stableUid.slice(0, 8)} reason=${op.reason} delta=${op.delta}`);
        }
        after.balance += op.delta;
        if (cls === 'earn') {
            after.earnedTotal += op.delta;
            after.seasonEarned += op.delta;
            // Задним числом заработанное попадает в свою неделю, если она ещё
            // хранится; более старое учитывается только в счётчике за всё время.
            const opWeekKey = ctx.weekKeyForMs ? ctx.weekKeyForMs(earnedAtMs) : ctx.weekKeyNow;
            if (op.reason === 'practice_session')
                receiptWeekKey = opWeekKey;
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
        // Разрез притока: только приход, только положительная дельта. Траты сюда
        // не пишутся намеренно — экран отвечает на вопрос «откуда руны пришли»,
        // а не «сколько осталось от каждого источника».
        if (cls !== 'spend' && op.delta > 0) {
            const sourceKey = exports.STAR_OP_SOURCE[op.reason];
            after.bySource = Object.freeze({
                ...after.bySource,
                [sourceKey]: Math.max(0, int(after.bySource[sourceKey])) + op.delta,
            });
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
                weekKey: receiptWeekKey,
                weekEarnedAfter: after.weekEarned,
                seasonId: after.seasonId,
                seasonEarnedAfter: after.seasonEarned,
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
//# sourceMappingURL=stars_ledger.js.map
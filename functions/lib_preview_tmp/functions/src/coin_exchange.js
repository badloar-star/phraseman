"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// coin_exchange.ts — серверная биржа «монеты → звёзды» (план 2026-07-20, §6).
//
// Модель:
// - economy/exchange — единственный серверный документ курса (создаётся лениво
//   с дефолтами). Клиент курс не считает и не читает напрямую (rules: deny).
// - economy_exchange_history/{date} — суточный агрегат (UTC): объёмы пишут
//   каждая сделка, курс/причину — scheduled recalc ('auto') или админ ('manual').
// - coin_exchange_trades/{tradeId} — append-only журнал сделок. tradeId
//   детерминирован: `${uid}_${idempotencyKey}` → повторный вызов с тем же
//   ключом возвращает прежний результат, не списывая монеты дважды.
// - Кошелёк звёзд: users/{uid}.v2_access_stars (+ append-only подколлекция
//   users/{uid}/v2_star_journal). Монеты = переименованные осколки, баланс —
//   существующее поле users/{uid}.shards (миграция 1:1), дебет идёт через
//   ту же транзакцию, что и shardsApplyDelta (здесь — внутренний дебет, без
//   клиентского каталога earn/spend).
//
// Manual override: adminSetCoinExchangeRate выставляет currentRate и
// manualOverride{rate, reason, byUid, at}. Override действует ДО ближайшего
// scheduled recalc: recalc всегда считает следующий курс от currentRate
// (т.е. от ручного курса как новой стартовой точки) и сбрасывает
// manualOverride в null. Это задокументированное поведение, а не баг.
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
exports.claimCoinMigration = exports.adminGetCoinExchangeCenter = exports.recalcCoinExchangeRate = exports.adminSetCoinExchangeRate = exports.exchangeCoinsForStars = exports.getCoinExchangeHistory = exports.getCoinExchangeQuote = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const audit_contract_1 = require("./admin/audit_contract");
const coin_exchange_core_1 = require("./coin_exchange_core");
const REGION = 'us-central1';
function requireAdminPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const claimedRole = request.auth.token.adminRole;
    const role = (0, roles_1.hasAdminRole)(claimedRole) ? claimedRole : 'admin';
    if (!(0, permissions_1.hasPermission)(role, permission)) {
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    }
    return { actorUid: String(request.auth.uid), role };
}
async function resolveCallerStableUid(authUid) {
    const db = admin.firestore();
    const resolved = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, { repairLinks: false, requireKnownIdentity: true });
    if (typeof resolved !== 'string' || !resolved) {
        throw new https_1.HttpsError('permission-denied', 'Exchange caller identity mismatch');
    }
    return resolved;
}
function quoteFromConfig(cfg, nextRecalcAtMs) {
    return {
        rate: cfg.currentRate,
        corridorMin: cfg.corridorMin,
        corridorMax: cfg.corridorMax,
        nextRecalcAt: nextRecalcAtMs !== null ? new Date(nextRecalcAtMs).toISOString() : null,
    };
}
function readNextRecalcAtMs(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0)
        return value;
    if (value && typeof value === 'object') {
        const v = value;
        if (typeof v.toMillis === 'function') {
            try {
                const ms = Number(v.toMillis()) || 0;
                return ms > 0 ? ms : null;
            }
            catch { /* fallthrough */ }
        }
        if (typeof v.seconds === 'number')
            return v.seconds * 1000;
    }
    return null;
}
// ── getCoinExchangeQuote ────────────────────────────────────────────────────
exports.getCoinExchangeQuote = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const db = admin.firestore();
    const snap = await db.doc(coin_exchange_core_1.EXCHANGE_DOC_PATH).get();
    const cfg = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(snap.data());
    const nextRecalcAtMs = readNextRecalcAtMs(snap.data()?.nextRecalcAt)
        ?? (0, coin_exchange_core_1.computeNextRecalcAtMs)(Date.now());
    return quoteFromConfig(cfg, nextRecalcAtMs);
});
// ── getCoinExchangeHistory ──────────────────────────────────────────────────
exports.getCoinExchangeHistory = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const daysCount = (0, coin_exchange_core_1.validateExchangeHistoryDays)(request.data?.days);
    const db = admin.firestore();
    const snap = await db
        .collection(coin_exchange_core_1.EXCHANGE_HISTORY_COLLECTION)
        .orderBy('date', 'desc')
        .limit(daysCount)
        .get();
    const points = snap.docs
        .map((doc) => {
        const d = doc.data();
        return {
            date: typeof d.date === 'string' ? d.date : doc.id,
            rate: (0, coin_exchange_core_1.readNonNegativeBalance)(d.rate),
            volume: (0, coin_exchange_core_1.readNonNegativeBalance)(d.volumeCoins),
        };
    })
        .filter((p) => p.date)
        .sort((a, b) => a.date.localeCompare(b.date));
    return { points };
});
// ── exchangeCoinsForStars ───────────────────────────────────────────────────
exports.exchangeCoinsForStars = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const data = (request.data ?? {});
    const coinsV = (0, coin_exchange_core_1.validateExchangeCoinsAmount)(data.coins);
    if (!coinsV.ok)
        throw new https_1.HttpsError('invalid-argument', coinsV.message);
    const keyV = (0, coin_exchange_core_1.validateExchangeIdempotencyKey)(data.idempotencyKey);
    if (!keyV.ok)
        throw new https_1.HttpsError('invalid-argument', keyV.message);
    const coins = coinsV.value;
    const idempotencyKey = keyV.value;
    const uid = await resolveCallerStableUid(request.auth.uid);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const exchangeRef = db.doc(coin_exchange_core_1.EXCHANGE_DOC_PATH);
    const tradeRef = db.collection(coin_exchange_core_1.COIN_EXCHANGE_TRADES_COLLECTION).doc(`${uid}_${idempotencyKey}`);
    const journalRef = userRef.collection(coin_exchange_core_1.V2_STAR_JOURNAL_SUBCOLLECTION).doc(idempotencyKey);
    const todayKey = (0, coin_exchange_core_1.utcExchangeDayKey)(Date.now());
    const historyRef = db.collection(coin_exchange_core_1.EXCHANGE_HISTORY_COLLECTION).doc(todayKey);
    return db.runTransaction(async (tx) => {
        const [exchangeSnap, tradeSnap, userSnap] = await Promise.all([
            tx.get(exchangeRef),
            tx.get(tradeRef),
            tx.get(userRef),
        ]);
        const cfg = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(exchangeSnap.data());
        const outcome = (0, coin_exchange_core_1.computeExchangeOutcome)({
            existingTrade: tradeSnap.exists ? tradeSnap.data() : null,
            coinBalance: userSnap.data()?.shards,
            starBalance: userSnap.data()?.[coin_exchange_core_1.V2_ACCESS_STARS_FIELD],
            coins,
            rate: cfg.currentRate,
        });
        if (outcome.kind === 'replay') {
            return { starsGranted: outcome.starsGranted, rateUsed: outcome.rateUsed };
        }
        if (outcome.kind === 'insufficient') {
            throw new https_1.HttpsError('failed-precondition', 'insufficient_coins');
        }
        // Ленивая инициализация документа курса (первый обмен в системе).
        if (!exchangeSnap.exists) {
            tx.set(exchangeRef, {
                ...coin_exchange_core_1.DEFAULT_COIN_EXCHANGE_CONFIG,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                nextRecalcAt: (0, coin_exchange_core_1.computeNextRecalcAtMs)(Date.now()),
                manualOverride: null,
            });
        }
        tx.set(userRef, {
            shards: outcome.nextCoinBalance,
            shards_updated_at_ms: Date.now(),
            shards_updated_op: 'spend',
            shards_updated_reason: 'coin_exchange',
            [coin_exchange_core_1.V2_ACCESS_STARS_FIELD]: outcome.nextStarBalance,
            [coin_exchange_core_1.V2_ACCESS_STARS_UPDATED_AT_MS_FIELD]: Date.now(),
        }, { merge: true });
        tx.set(journalRef, {
            source: 'coin_exchange',
            tradeId: tradeRef.id,
            delta: outcome.starsGranted,
            balanceAfter: outcome.nextStarBalance,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(tradeRef, {
            uid,
            coins: outcome.coins,
            stars: outcome.starsGranted,
            rate: outcome.rateUsed,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            idempotencyKey,
        });
        tx.set(historyRef, {
            date: todayKey,
            volumeCoins: admin.firestore.FieldValue.increment(outcome.coins),
            volumeStars: admin.firestore.FieldValue.increment(outcome.starsGranted),
            trades: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
        return { starsGranted: outcome.starsGranted, rateUsed: outcome.rateUsed };
    });
});
// ── adminSetCoinExchangeRate ────────────────────────────────────────────────
exports.adminSetCoinExchangeRate = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const actor = requireAdminPermission(request, 'application.config.write');
    const db = admin.firestore();
    const exchangeRef = db.doc(coin_exchange_core_1.EXCHANGE_DOC_PATH);
    // Коридор читаем из текущего документа (или дефолты), чтобы валидировать rate.
    const preSnap = await exchangeRef.get();
    const preCfg = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(preSnap.data());
    const validated = (0, coin_exchange_core_1.validateAdminSetRateInput)(request.data, preCfg.corridorMin, preCfg.corridorMax);
    if (!validated.ok)
        throw new https_1.HttpsError('invalid-argument', validated.message);
    const { rate, reason } = validated.value;
    const todayKey = (0, coin_exchange_core_1.utcExchangeDayKey)(Date.now());
    const historyRef = db.collection(coin_exchange_core_1.EXCHANGE_HISTORY_COLLECTION).doc(todayKey);
    const auditRef = db.collection('admin_log').doc();
    const nowIso = new Date().toISOString();
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(exchangeRef);
        const before = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(snap.data());
        tx.set(exchangeRef, {
            ...before,
            currentRate: rate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            manualOverride: { rate, reason, byUid: actor.actorUid, at: nowIso },
            nextRecalcAt: (0, coin_exchange_core_1.computeNextRecalcAtMs)(Date.now()),
        });
        tx.set(historyRef, {
            date: todayKey,
            rate,
            reason: 'manual',
        }, { merge: true });
        tx.set(auditRef, (0, audit_contract_1.createAuditRecord)({
            action: 'coin_exchange_set_rate',
            actorUid: actor.actorUid,
            role: actor.role,
            entity: { collection: 'economy', id: 'exchange' },
            reason,
            before: { currentRate: before.currentRate },
            after: { currentRate: rate },
            requestId: auditRef.id,
            timestamp: nowIso,
        }));
        return { ok: true, rate, corridorMin: before.corridorMin, corridorMax: before.corridorMax };
    });
});
// ── recalcCoinExchangeRate (scheduled, ежедневно 04:17 UTC) ─────────────────
exports.recalcCoinExchangeRate = (0, scheduler_1.onSchedule)({ schedule: coin_exchange_core_1.RECALC_SCHEDULE, timeZone: coin_exchange_core_1.RECALC_TIMEZONE, region: REGION }, async () => {
    const db = admin.firestore();
    const exchangeRef = db.doc(coin_exchange_core_1.EXCHANGE_DOC_PATH);
    const nowMs = Date.now();
    const yesterdayKey = (0, coin_exchange_core_1.previousUtcExchangeDayKey)(nowMs);
    const historyRef = db.collection(coin_exchange_core_1.EXCHANGE_HISTORY_COLLECTION).doc(yesterdayKey);
    await db.runTransaction(async (tx) => {
        const [exchangeSnap, historySnap] = await Promise.all([
            tx.get(exchangeRef),
            tx.get(historyRef),
        ]);
        const cfg = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(exchangeSnap.data());
        const yesterdayVolumeCoins = (0, coin_exchange_core_1.readNonNegativeBalance)(historySnap.data()?.volumeCoins);
        const result = (0, coin_exchange_core_1.computeNextExchangeRate)({ config: cfg, yesterdayVolumeCoins });
        // Manual override уважается до этого момента: пересчёт стартует от
        // currentRate (который админ мог выставить вручную) и сбрасывает override.
        tx.set(exchangeRef, {
            ...cfg,
            currentRate: result.nextRate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            nextRecalcAt: (0, coin_exchange_core_1.computeNextRecalcAtMs)(nowMs),
            manualOverride: null,
        });
        tx.set(historyRef, {
            date: yesterdayKey,
            rate: result.nextRate,
            reason: 'auto',
        }, { merge: true });
        console.log('[coinExchange] recalc', {
            date: yesterdayKey,
            volumeCoins: yesterdayVolumeCoins,
            demandRatio: result.demandRatio,
            direction: result.direction,
            from: cfg.currentRate,
            to: result.nextRate,
        });
    });
});
// ── adminGetCoinExchangeCenter (Центр монет Admin V2) ───────────────────────
//
// Контракт ответа (admin/v2/scripts/admin-core.js → normalizeCoinCenterResult):
// {
//   exchange: { rate, baseRate, corridorMin, corridorMax, nextRecalcAtMs,
//     updatedAtMs, manualOverride: null | { rate, reason, author, atMs } },
//   history: [{ date, rate, volumeCoins, volumeStars, source: 'auto'|'manual' }],
//   stats24h: { volumeCoins, volumeStars, trades, uniqueUsers, totalCoins },
//   overrides: [{ rate, reason, author, atMs }],
// }
//
// stats24h.totalCoins: суммарный баланс монет всех пользователей не считается
// (требовал бы полного скана users) — возвращаем null; UI принимает null.
// stats24h считается по журналу coin_exchange_trades за последние 24 часа
// (окно ограничено SCAN лимитом; за пределами — честная недосказанность,
// см. stats24hTruncated).
const STATS_24H_SCAN_LIMIT = 2000;
const OVERRIDE_AUDIT_LIMIT = 20;
exports.adminGetCoinExchangeCenter = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    requireAdminPermission(request, 'money.read');
    const rangeDays = (0, coin_exchange_core_1.validateExchangeHistoryDays)(request.data?.rangeDays);
    const db = admin.firestore();
    const nowMs = Date.now();
    const [exchangeSnap, historySnap, tradesSnap, auditSnap] = await Promise.all([
        db.doc(coin_exchange_core_1.EXCHANGE_DOC_PATH).get(),
        db.collection(coin_exchange_core_1.EXCHANGE_HISTORY_COLLECTION).orderBy('date', 'desc').limit(rangeDays).get(),
        db.collection(coin_exchange_core_1.COIN_EXCHANGE_TRADES_COLLECTION)
            .where('createdAt', '>=', new Date(nowMs - 24 * 60 * 60 * 1000))
            .limit(STATS_24H_SCAN_LIMIT)
            .get(),
        db.collection('admin_log')
            .where('action', '==', 'coin_exchange_set_rate')
            .orderBy('timestamp', 'desc')
            .limit(OVERRIDE_AUDIT_LIMIT)
            .get(),
    ]);
    const exchangeRow = exchangeSnap.data() ?? {};
    const cfg = (0, coin_exchange_core_1.normalizeCoinExchangeConfig)(exchangeRow);
    const stats = (0, coin_exchange_core_1.aggregateCoinTradeStats)(tradesSnap.docs.map((doc) => doc.data()));
    return {
        exchange: {
            rate: cfg.currentRate,
            baseRate: cfg.baseRate,
            corridorMin: cfg.corridorMin,
            corridorMax: cfg.corridorMax,
            nextRecalcAtMs: readNextRecalcAtMs(exchangeRow.nextRecalcAt) ?? (0, coin_exchange_core_1.computeNextRecalcAtMs)(nowMs),
            updatedAtMs: readNextRecalcAtMs(exchangeRow.updatedAt) ?? 0,
            manualOverride: (0, coin_exchange_core_1.normalizeCoinCenterManualOverride)(exchangeRow.manualOverride),
        },
        history: historySnap.docs
            .map((doc) => (0, coin_exchange_core_1.projectCoinCenterHistoryPoint)(doc.id, doc.data()))
            .sort((a, b) => a.date.localeCompare(b.date)),
        stats24h: { ...stats, totalCoins: null },
        stats24hTruncated: tradesSnap.size >= STATS_24H_SCAN_LIMIT,
        overrides: auditSnap.docs
            .map((doc) => (0, coin_exchange_core_1.projectCoinCenterOverrideAudit)(doc.data()))
            .filter((entry) => entry !== null),
    };
});
// ── claimCoinMigration (разовая миграция осколков → монет 20:1) ─────────────
//
// Контракт (app-модалка миграции собирается под него):
//   → { alreadyMigrated, shardsBefore, coinsGranted, newBalance }
// Идемпотентность: флаг users/{uid}.coins_migration_v1 + runTransaction.
// Пользователь с нулевым балансом тоже получает флаг (coinsGranted 0), чтобы
// никогда не входить в flow позже. Пользователи, которые НЕ открывают
// приложение, здесь не мигрируются — backfill (отдельное решение владельца)
// переиспользует чистую computeCoinMigration из coin_exchange_core.ts.
exports.claimCoinMigration = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const uid = await resolveCallerStableUid(request.auth.uid);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const migrationRef = db.collection(coin_exchange_core_1.COIN_MIGRATIONS_COLLECTION).doc(uid);
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const data = userSnap.data() ?? {};
        if (data[coin_exchange_core_1.COIN_MIGRATION_FLAG_FIELD] === true) {
            const record = (data[coin_exchange_core_1.COIN_MIGRATION_RECORD_FIELD] ?? {});
            return {
                alreadyMigrated: true,
                shardsBefore: (0, coin_exchange_core_1.readNonNegativeBalance)(record.shardsBefore),
                coinsGranted: (0, coin_exchange_core_1.readNonNegativeBalance)(record.coinsGranted),
                newBalance: (0, coin_exchange_core_1.readNonNegativeBalance)(data.shards),
            };
        }
        const shardsBefore = (0, coin_exchange_core_1.readNonNegativeBalance)(data.shards);
        const coinsGranted = (0, coin_exchange_core_1.computeCoinMigration)(shardsBefore);
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        tx.set(userRef, {
            shards: coinsGranted,
            shards_updated_at_ms: nowMs,
            shards_updated_op: shardsBefore > 0 ? 'spend' : 'earn',
            shards_updated_reason: 'coins_migration_v1',
            [coin_exchange_core_1.COIN_MIGRATION_FLAG_FIELD]: true,
            [coin_exchange_core_1.COIN_MIGRATION_RECORD_FIELD]: { shardsBefore, coinsGranted, at: nowIso },
        }, { merge: true });
        tx.set(migrationRef, {
            uid,
            rate: coin_exchange_core_1.COIN_MIGRATION_RATE,
            shardsBefore,
            coinsGranted,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            alreadyMigrated: false,
            shardsBefore,
            coinsGranted,
            newBalance: coinsGranted,
        };
    });
});
//# sourceMappingURL=coin_exchange.js.map
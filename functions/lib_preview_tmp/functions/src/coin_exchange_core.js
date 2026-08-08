"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// coin_exchange_core.ts — чистая математика и валидация биржи «монеты → звёзды».
//
// Никакого Firestore/админ-SDK здесь нет: модуль детерминирован и покрывается
// юнит-тестами без харнесса. Используется из coin_exchange.ts (callables +
// scheduled recalc).
//
// Формула курса (обычными словами):
// - Спрос за сутки = сколько монет реально обменяли за прошедшие UTC-сутки
//   (volumeCoins из economy_exchange_history/{date}).
// - demandRatio = вчерашний объём / baselineDailyCoins (ожидаемый дневной объём).
// - Спрос ВЫШЕ базы (ratio > 1): курс растёт на (min(ratio, 2) − 1) ×
//   maxDailyChangePct процентов от текущего курса — то есть максимум +10%/сутки,
//   даже если спрос превысил базу более чем вдвое.
// - Спрос НИЖЕ базы (ratio ≤ 1, включая нулевой объём): курс НЕ падает в ноль,
//   а плавно дрейфует обратно к baseRate — шаг в сторону базы, ограниченный
//   тем же maxDailyChangePct от текущего курса (решение 6C плана).
// - Итог округляется до целых звёзд и жёстко зажимается в коридор
//   [corridorMin, corridorMax].
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.COIN_MIGRATION_RECORD_FIELD = exports.COIN_MIGRATION_FLAG_FIELD = exports.COIN_MIGRATIONS_COLLECTION = exports.COIN_MIGRATION_RATE = exports.RECALC_TIMEZONE = exports.RECALC_SCHEDULE = exports.DEFAULT_COIN_EXCHANGE_CONFIG = exports.V2_ACCESS_STARS_UPDATED_AT_MS_FIELD = exports.V2_ACCESS_STARS_FIELD = exports.V2_STAR_JOURNAL_SUBCOLLECTION = exports.COIN_EXCHANGE_TRADES_COLLECTION = exports.EXCHANGE_HISTORY_COLLECTION = exports.EXCHANGE_DOC_PATH = void 0;
exports.normalizeCoinExchangeConfig = normalizeCoinExchangeConfig;
exports.clampRateToCorridor = clampRateToCorridor;
exports.computeNextExchangeRate = computeNextExchangeRate;
exports.validateExchangeCoinsAmount = validateExchangeCoinsAmount;
exports.validateExchangeIdempotencyKey = validateExchangeIdempotencyKey;
exports.validateExchangeHistoryDays = validateExchangeHistoryDays;
exports.validateAdminSetRateInput = validateAdminSetRateInput;
exports.readNonNegativeBalance = readNonNegativeBalance;
exports.computeExchangeOutcome = computeExchangeOutcome;
exports.utcExchangeDayKey = utcExchangeDayKey;
exports.previousUtcExchangeDayKey = previousUtcExchangeDayKey;
exports.computeNextRecalcAtMs = computeNextRecalcAtMs;
exports.projectCoinCenterHistoryPoint = projectCoinCenterHistoryPoint;
exports.aggregateCoinTradeStats = aggregateCoinTradeStats;
exports.normalizeCoinCenterManualOverride = normalizeCoinCenterManualOverride;
exports.projectCoinCenterOverrideAudit = projectCoinCenterOverrideAudit;
exports.computeCoinMigration = computeCoinMigration;
exports.EXCHANGE_DOC_PATH = 'economy/exchange';
exports.EXCHANGE_HISTORY_COLLECTION = 'economy_exchange_history';
exports.COIN_EXCHANGE_TRADES_COLLECTION = 'coin_exchange_trades';
exports.V2_STAR_JOURNAL_SUBCOLLECTION = 'v2_star_journal';
/** Топ-уровневые поля users/{uid}, которые пишет ТОЛЬКО сервер (как shards). */
exports.V2_ACCESS_STARS_FIELD = 'v2_access_stars';
exports.V2_ACCESS_STARS_UPDATED_AT_MS_FIELD = 'v2_access_stars_updated_at_ms';
exports.DEFAULT_COIN_EXCHANGE_CONFIG = Object.freeze({
    baseRate: 80,
    currentRate: 80,
    corridorMin: 60,
    corridorMax: 100,
    maxDailyChangePct: 10,
    baselineDailyCoins: 500,
});
function readPositiveInt(value, fallback) {
    const n = Math.trunc(Number(value));
    return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}
function readNonNegativeInt(value, fallback) {
    const n = Math.trunc(Number(value));
    return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}
/**
 * Толерантное чтение конфигурации из economy/exchange. Отсутствующие/битые
 * поля заменяются дефолтами; коридор гарантированно min < max; currentRate
 * зажимается в коридор, чтобы гонка записи не выдала нерабочий курс.
 */
function normalizeCoinExchangeConfig(raw) {
    const row = raw && typeof raw === 'object' ? raw : {};
    const baseRate = readPositiveInt(row.baseRate, exports.DEFAULT_COIN_EXCHANGE_CONFIG.baseRate);
    let corridorMin = readPositiveInt(row.corridorMin, exports.DEFAULT_COIN_EXCHANGE_CONFIG.corridorMin);
    let corridorMax = readPositiveInt(row.corridorMax, exports.DEFAULT_COIN_EXCHANGE_CONFIG.corridorMax);
    if (corridorMin >= corridorMax) {
        corridorMin = exports.DEFAULT_COIN_EXCHANGE_CONFIG.corridorMin;
        corridorMax = exports.DEFAULT_COIN_EXCHANGE_CONFIG.corridorMax;
    }
    const maxDailyChangePct = Math.min(100, readPositiveInt(row.maxDailyChangePct, exports.DEFAULT_COIN_EXCHANGE_CONFIG.maxDailyChangePct));
    const baselineDailyCoins = readNonNegativeInt(row.baselineDailyCoins, exports.DEFAULT_COIN_EXCHANGE_CONFIG.baselineDailyCoins);
    const currentRateRaw = readPositiveInt(row.currentRate, baseRate);
    const currentRate = Math.min(corridorMax, Math.max(corridorMin, currentRateRaw));
    return Object.freeze({
        baseRate,
        currentRate,
        corridorMin,
        corridorMax,
        maxDailyChangePct,
        baselineDailyCoins,
    });
}
function clampRateToCorridor(rate, corridorMin, corridorMax) {
    return Math.min(corridorMax, Math.max(corridorMin, Math.round(rate)));
}
/**
 * Детерминированный пересчёт суточного курса. См. шапку файла за формулой.
 */
function computeNextExchangeRate(input) {
    const cfg = input.config;
    const volume = Math.max(0, Math.trunc(Number(input.yesterdayVolumeCoins) || 0));
    const demandRatio = cfg.baselineDailyCoins > 0 ? volume / cfg.baselineDailyCoins : 0;
    const maxStep = cfg.currentRate * (cfg.maxDailyChangePct / 100);
    let next;
    let direction;
    if (demandRatio > 1) {
        // Спрос выше базы: рост пропорционален превышению, жёсткий потолок +maxDailyChangePct.
        const growthPct = Math.min(demandRatio, 2) - 1; // ∈ (0, 1]
        next = cfg.currentRate * (1 + growthPct * (cfg.maxDailyChangePct / 100));
        direction = 'demand_up';
    }
    else {
        // Спрос ниже базы (в т.ч. ноль): дрейф к базовой цене шагом ≤ maxDailyChangePct.
        const gap = cfg.baseRate - cfg.currentRate;
        const step = Math.min(Math.abs(gap), maxStep);
        next = cfg.currentRate + Math.sign(gap) * step;
        direction = step > 0 ? 'drift_to_base' : 'flat';
    }
    const nextRate = clampRateToCorridor(next, cfg.corridorMin, cfg.corridorMax);
    return Object.freeze({ nextRate, demandRatio, direction });
}
// ── Валидация входов callables ──────────────────────────────────────────────
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_:-]{8,80}$/;
const ADMIN_REASON_MAX_LEN = 200;
const MAX_COINS_PER_TRADE = 100000;
const HISTORY_DAYS_DEFAULT = 14;
const HISTORY_DAYS_MAX = 90;
/** Сумма обмена: строго положительный целый int, с разумным потолком. */
function validateExchangeCoinsAmount(value) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        return { ok: false, message: 'coins must be a positive integer' };
    }
    if (value > MAX_COINS_PER_TRADE) {
        return { ok: false, message: `coins must be <= ${MAX_COINS_PER_TRADE}` };
    }
    return { ok: true, value };
}
function validateExchangeIdempotencyKey(value) {
    const key = typeof value === 'string' ? value : '';
    if (!IDEMPOTENCY_KEY_RE.test(key)) {
        return { ok: false, message: 'idempotencyKey must match [A-Za-z0-9_:-]{8,80}' };
    }
    return { ok: true, value: key };
}
function validateExchangeHistoryDays(value) {
    const n = Math.trunc(Number(value));
    if (!Number.isSafeInteger(n) || n <= 0)
        return HISTORY_DAYS_DEFAULT;
    return Math.min(n, HISTORY_DAYS_MAX);
}
function validateAdminSetRateInput(data, corridorMin, corridorMax) {
    const d = (data ?? {});
    const rate = d.rate;
    if (typeof rate !== 'number' || !Number.isSafeInteger(rate) || rate <= 0) {
        return { ok: false, message: 'rate must be a positive integer' };
    }
    if (rate < corridorMin || rate > corridorMax) {
        return { ok: false, message: `rate must be within corridor [${corridorMin}, ${corridorMax}]` };
    }
    const reason = typeof d.reason === 'string' ? d.reason.trim() : '';
    if (!reason || reason.length > ADMIN_REASON_MAX_LEN) {
        return { ok: false, message: `reason must be 1-${ADMIN_REASON_MAX_LEN} trimmed characters` };
    }
    return { ok: true, value: Object.freeze({ rate, reason }) };
}
// ── Чистое ядро транзакции обмена ───────────────────────────────────────────
function readNonNegativeBalance(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}
/**
 * Чистое ядро обмена: по текущему состоянию вычисляет исход.
 * replay — trade с тем же idempotencyKey уже записан (возвращаем прежний
 * результат, ничего не списываем повторно). insufficient — не хватает монет.
 */
function computeExchangeOutcome(input) {
    if (input.existingTrade) {
        const t = input.existingTrade;
        return Object.freeze({
            kind: 'replay',
            starsGranted: readNonNegativeBalance(t.stars),
            rateUsed: readNonNegativeBalance(t.rate),
        });
    }
    const balance = readNonNegativeBalance(input.coinBalance);
    if (balance < input.coins) {
        return Object.freeze({ kind: 'insufficient', balance });
    }
    const starsGranted = input.coins * input.rate;
    return Object.freeze({
        kind: 'write',
        coins: input.coins,
        starsGranted,
        rateUsed: input.rate,
        nextCoinBalance: balance - input.coins,
        nextStarBalance: readNonNegativeBalance(input.starBalance) + starsGranted,
    });
}
/** UTC-ключ суток YYYY-MM-DD — тот же формат, что utcShardEarnDayKey. */
function utcExchangeDayKey(nowMs) {
    const date = new Date(nowMs);
    if (!Number.isFinite(date.getTime()))
        throw new Error('invalid_exchange_timestamp');
    return date.toISOString().slice(0, 10);
}
/** Предыдущие UTC-сутки (для scheduled recalc). */
function previousUtcExchangeDayKey(nowMs) {
    return utcExchangeDayKey(nowMs - 24 * 60 * 60 * 1000);
}
/** Следующий пересчёт: ежедневно в 04:17 UTC (off-peak минута). */
exports.RECALC_SCHEDULE = '17 4 * * *';
exports.RECALC_TIMEZONE = 'UTC';
function computeNextRecalcAtMs(nowMs) {
    const d = new Date(nowMs);
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 4, 17, 0, 0));
    if (next.getTime() <= nowMs) {
        next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime();
}
/** Проекция строки economy_exchange_history для Центра монет. */
function projectCoinCenterHistoryPoint(docId, raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    return Object.freeze({
        date: typeof d.date === 'string' && d.date ? d.date : docId,
        rate: readNonNegativeBalance(d.rate),
        volumeCoins: readNonNegativeBalance(d.volumeCoins),
        volumeStars: readNonNegativeBalance(d.volumeStars),
        source: d.reason === 'manual' ? 'manual' : 'auto',
    });
}
/** Агрегация сделок за окно (уже отфильтрованных по времени запросом). */
function aggregateCoinTradeStats(rows) {
    const users = new Set();
    let volumeCoins = 0;
    let volumeStars = 0;
    let trades = 0;
    for (const row of rows) {
        trades += 1;
        volumeCoins += readNonNegativeBalance(row.coins);
        volumeStars += readNonNegativeBalance(row.stars);
        if (typeof row.uid === 'string' && row.uid)
            users.add(row.uid);
    }
    return Object.freeze({ volumeCoins, volumeStars, trades, uniqueUsers: users.size });
}
function readIsoMs(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0)
        return value;
    if (typeof value === 'string') {
        const ms = Date.parse(value);
        if (Number.isFinite(ms))
            return ms;
    }
    return 0;
}
/**
 * manualOverride из economy/exchange → формат карточки Центра монет
 * ({ rate, reason, author, atMs } | null).
 */
function normalizeCoinCenterManualOverride(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw;
    const rate = readNonNegativeBalance(d.rate);
    if (rate <= 0)
        return null;
    return Object.freeze({
        rate,
        reason: typeof d.reason === 'string' ? d.reason : '',
        author: typeof d.byUid === 'string' ? d.byUid : '',
        atMs: readIsoMs(d.at),
    });
}
/** Строка аудита admin_log (action coin_exchange_set_rate) → элемент списка overrides. */
function projectCoinCenterOverrideAudit(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw;
    const after = d.after && typeof d.after === 'object' ? d.after : {};
    const rate = readNonNegativeBalance(after.currentRate);
    if (rate <= 0)
        return null;
    return Object.freeze({
        rate,
        reason: typeof d.reason === 'string' ? d.reason : '',
        author: typeof d.actorUid === 'string' ? d.actorUid : '',
        atMs: readIsoMs(d.timestamp),
    });
}
// ── Миграция осколков → монет (решение владельца 2026-07-21) ────────────────
//
// Конвертация НЕ 1:1: 20 осколков = 1 монета, округление ВВЕРХ, минимум
// 1 монета любому с балансом > 0. Старый баланс осколков полностью
// поглощается конвертацией (заменяется начисленными монетами).
// Планируемый backfill для пользователей, которые не открывают приложение,
// обязан переиспользовать именно эту чистую функцию (batch-скрипт — отдельное
// решение владельца, сейчас НЕ запускается).
exports.COIN_MIGRATION_RATE = 20;
exports.COIN_MIGRATIONS_COLLECTION = 'coin_migrations';
exports.COIN_MIGRATION_FLAG_FIELD = 'coins_migration_v1';
exports.COIN_MIGRATION_RECORD_FIELD = 'coins_migration_v1_record';
/** shardsBefore → coinsGranted. Чистая функция миграции 20:1, ceil, min 1. */
function computeCoinMigration(shardsBefore) {
    const balance = readNonNegativeBalance(shardsBefore);
    if (balance <= 0)
        return 0;
    return Math.max(1, Math.ceil(balance / exports.COIN_MIGRATION_RATE));
}
//# sourceMappingURL=coin_exchange_core.js.map
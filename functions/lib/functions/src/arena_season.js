"use strict";
/**
 * ARENA SEASON — чистая математика сезона (SR на потолке, мягкий откат, id сезона).
 *
 * Вынесено отдельно, чтобы покрыть юнит-тестами и иметь ОДИН источник правды.
 * Клиентское зеркало: app/arena_season_math.ts — поведение обязано совпадать
 * (закреплено парными тестами). См. урок про дубль математики:
 * docs/.../phraseman_arena_rank_duplicate_math.
 *
 * SR живёт ТОЛЬКО на потолке (Легенда III). Ниже потолка — обычные звёзды
 * (см. arena_rank_progression.ts). Откат сезона мягкий: −N рангов с полом.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_SEASON_DEFAULTS = exports.SEASON_FLOOR_INDEX = exports.SEASON_ROLLBACK_STEPS = exports.SR_BOT_WIN = exports.SR_LOSS = exports.SR_WIN = exports.RANK_TIERS = exports.RANK_LEVELS = void 0;
exports.arenaSeasonConfigFromData = arenaSeasonConfigFromData;
exports.rankIndex = rankIndex;
exports.indexToRank = indexToRank;
exports.applySeasonRollback = applySeasonRollback;
exports.applySeasonRatingDelta = applySeasonRatingDelta;
exports.seasonIdForDate = seasonIdForDate;
exports.quarterEndMs = quarterEndMs;
exports.RANK_LEVELS = ['I', 'II', 'III'];
exports.RANK_TIERS = [
    'bronze', 'silver', 'gold', 'platinum',
    'diamond', 'master', 'grandmaster', 'legend',
];
// Базовые величины (дефолты). Это ЕДИНЫЙ источник правды и одновременно
// fallback: админ может переопределить их в Firestore (admin_runtime_config/
// arena_season), читаемом и сервером (resolveArenaSeasonConfig), и клиентом
// (app/remote_flags arena_sr_*). При отсутствии дока поведение НЕ меняется.
exports.SR_WIN = 25;
exports.SR_LOSS = 20;
exports.SR_BOT_WIN = 12;
exports.SEASON_ROLLBACK_STEPS = 3;
exports.SEASON_FLOOR_INDEX = 2; // bronze III
exports.ARENA_SEASON_DEFAULTS = {
    srWin: exports.SR_WIN,
    srLoss: exports.SR_LOSS,
    srBotWin: exports.SR_BOT_WIN,
    rollbackSteps: exports.SEASON_ROLLBACK_STEPS,
    floorIndex: exports.SEASON_FLOOR_INDEX,
};
function cleanInt(value, fallback, min, max) {
    const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    const n = typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
}
/** Нормализует сырой Firestore-док в полный конфиг (каждое поле — с fallback). */
function arenaSeasonConfigFromData(data) {
    const d = data ?? {};
    return {
        srWin: cleanInt(d.arena_sr_win, exports.SR_WIN, 0, 999),
        srLoss: cleanInt(d.arena_sr_loss, exports.SR_LOSS, 0, 999),
        srBotWin: cleanInt(d.arena_sr_bot_win, exports.SR_BOT_WIN, 0, 999),
        rollbackSteps: cleanInt(d.arena_season_rollback_steps, exports.SEASON_ROLLBACK_STEPS, 0, 23),
        floorIndex: cleanInt(d.arena_season_floor_index, exports.SEASON_FLOOR_INDEX, 0, 23),
    };
}
/** Плоский индекс ранга 0–23 (Бронза I = 0 … Легенда III = 23). */
function rankIndex(tier, level) {
    const ti = exports.RANK_TIERS.indexOf(tier);
    const li = exports.RANK_LEVELS.indexOf(level);
    return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}
/** Обратное преобразование индекса 0–23 в tier/level (с клампом в границы). */
function indexToRank(index) {
    const clamped = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(index) ? index : 0)));
    return { tier: exports.RANK_TIERS[Math.floor(clamped / 3)], level: exports.RANK_LEVELS[clamped % 3] };
}
/**
 * Мягкий сезонный откат: сдвиг вниз на `steps` рангов, но не ниже `floorIndex`.
 * Звёзды обнуляются. Низы (Бронза I/II) не наказываем — пол = Бронза III.
 */
function applySeasonRollback(tier, level, steps, floorIndex) {
    const safeSteps = Math.max(0, Math.trunc(Number.isFinite(steps) ? steps : 0));
    const safeFloor = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(floorIndex) ? floorIndex : 0)));
    const newIndex = Math.max(safeFloor, rankIndex(tier, level) - safeSteps);
    const r = indexToRank(newIndex);
    return { tier: r.tier, level: r.level, stars: 0 };
}
/**
 * Изменение SR за матч НА ПОТОЛКЕ. Победа +SR (бот = половина), поражение −SR
 * (пол 0), ничья/нейтрально без изменений. peakSR только растёт.
 */
function applySeasonRatingDelta(sr, peakSR, outcome, isBot, cfg = exports.ARENA_SEASON_DEFAULTS) {
    const base = Number.isFinite(sr) ? sr : 0;
    let next = base;
    if (outcome === 'win')
        next = base + (isBot ? cfg.srBotWin : cfg.srWin);
    else if (outcome === 'loss')
        next = Math.max(0, base - cfg.srLoss);
    const safePeak = Number.isFinite(peakSR) ? peakSR : 0;
    return { sr: next, peakSR: Math.max(safePeak, next) };
}
/** Квартальный id сезона: 2026-Q1 … 2026-Q4 (по UTC-месяцу). */
function seasonIdForDate(date) {
    const y = date.getUTCFullYear();
    const q = Math.floor(date.getUTCMonth() / 3) + 1;
    return `${y}-Q${q}`;
}
/** Миллисекунды начала следующего квартала (UTC) — конец текущего сезона. */
function quarterEndMs(date) {
    const y = date.getUTCFullYear();
    const q = Math.floor(date.getUTCMonth() / 3);
    return Date.UTC(y, q * 3 + 3, 1);
}
//# sourceMappingURL=arena_season.js.map
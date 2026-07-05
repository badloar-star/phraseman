"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/rewards.ts — чистый расчёт наград за матч (спек E1–E4).
//
// БЕЗ firebase-admin: вся денежно-рейтинговая математика тестируется юнитами.
// Firestore-начисление (arena_profiles + users.shards + shard_log + дроп) живёт
// в match_service.finalizeConstellationMatch и вызывает computeMatchRewards.
//
// Инварианты:
// - Боту награды не начисляются вообще (isBot → всё 0).
// - Защита новичка: первые newbieProtectionMatches матчей отрицательные дельты
//   ★/SR НЕ применяются (только вверх) — «−1 новичку, которого выбили» = отток.
// - Анти-бот-фарм: < 2 живых людей → пыль и звездопад режутся вдвое (как в C1).
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStarDeltaWithNewbieGuard = resolveStarDeltaWithNewbieGuard;
exports.computeMatchRewards = computeMatchRewards;
const ZERO_REWARDS = {
    xp: 0, shards: 0, starDelta: 0, srDelta: 0, collectibleEligible: false,
};
/** Индекс места 1..4 → индекс массива 0..3 (с клипом). */
function placeIdx(place) {
    return Math.min(3, Math.max(0, Math.floor(place) - 1));
}
/**
 * Защита новичка (E2): первые cfg.newbieProtectionMatches матчей режима
 * отрицательная дельта ★/SR гасится в 0 (положительная проходит всегда).
 */
function resolveStarDeltaWithNewbieGuard(delta, matchesPlayedBefore, cfg) {
    if (delta >= 0)
        return delta;
    return matchesPlayedBefore < cfg.newbieProtectionMatches ? 0 : delta;
}
/** Выплата ставки (C3): 1 место ×winMultiplier, 2 — возврат, 3-4 — сгорела. */
function wagerPayout(place, wager, cfg) {
    if (wager <= 0)
        return 0;
    if (place === 1)
        return wager * cfg.wager.winMultiplier;
    if (place === 2)
        return wager;
    return 0;
}
function computeMatchRewards(input) {
    if (input.isBot)
        return { ...ZERO_REWARDS };
    const { cfg } = input;
    const idx = placeIdx(input.place);
    const xp = cfg.rewards.xpByPlace[idx] ?? 0;
    // Анти-бот-фарм: < 2 живых людей → пыль и звездопад вдвое (C1).
    const antiFarm = input.livingHumans < 2;
    const dust = antiFarm ? Math.floor(input.dustEarned / 2) : input.dustEarned;
    const starfall = antiFarm ? Math.floor(input.starfallEarned / 2) : input.starfallEarned;
    const placeShards = cfg.rewards.shardsByPlace[idx] ?? 0;
    const shards = placeShards + dust + starfall + wagerPayout(input.place, input.wager, cfg);
    const rawStar = cfg.rewards.starDeltaByPlace[idx] ?? 0;
    const rawSr = cfg.rewards.srDeltaByPlace[idx] ?? 0;
    const starDelta = resolveStarDeltaWithNewbieGuard(rawStar, input.matchesPlayedBefore, cfg);
    const srDelta = resolveStarDeltaWithNewbieGuard(rawSr, input.matchesPlayedBefore, cfg);
    return {
        xp,
        shards,
        starDelta,
        srDelta,
        collectibleEligible: true, // туториал отсекается вызывающим кодом (не-туториал)
    };
}
//# sourceMappingURL=rewards.js.map
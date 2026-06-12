"use strict";
/**
 * ARENA RANK PROGRESSION — чистая математика повышения/понижения ранга.
 *
 * Вынесено из index.ts (транзакция onArenaSessionFinished), чтобы:
 *  - логику можно было покрыть юнит-тестами;
 *  - убрать дублирование инлайн-математики;
 *  - иметь единый источник правды для потолка (Легенда III) и пола (Бронза I).
 *
 * Звёзды: показываются 0–2; набор 3-й звезды повышает ранг (level/tier),
 * уход ниже 0 — понижает. На вершине и на дне ранг не меняется (клампы).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANK_TIERS = exports.RANK_LEVELS = void 0;
exports.applyStarDelta = applyStarDelta;
exports.isPromotion = isPromotion;
exports.RANK_LEVELS = ['I', 'II', 'III'];
exports.RANK_TIERS = [
    'bronze', 'silver', 'gold', 'platinum',
    'diamond', 'master', 'grandmaster', 'legend',
];
function clampTier(tier) {
    return exports.RANK_TIERS.includes(tier) ? tier : 'bronze';
}
function clampLevel(level) {
    return exports.RANK_LEVELS.includes(level) ? level : 'I';
}
/**
 * Применяет дельту звёзд к текущему рангу и возвращает НОВЫЙ ранг (иммутабельно).
 *
 * @param current  текущий ранг (tier/level/stars)
 * @param starDelta изменение звёзд за матч: +1 (победа), -1 (последнее место), 0 (ничья/не последний)
 *
 * Правила:
 *  - stars достигли 3 → повышение: level I→II→III, при III — следующий tier с level I.
 *    На самом верху (Легенда III) ранг не меняется, stars держим на 2 (потолок).
 *  - stars ушли ниже 0 → понижение: level III→II→I, при I — предыдущий tier с level III.
 *    На самом дне (Бронза I) ранг не меняется, stars держим на 0 (пол).
 */
function applyStarDelta(current, starDelta) {
    const tier = clampTier(current.tier);
    const level = clampLevel(current.level);
    const baseStars = Number.isFinite(current.stars) ? current.stars : 0;
    let newTier = tier;
    let newLevel = level;
    let newStars = baseStars + starDelta;
    if (newStars >= 3) {
        newStars = 0;
        const li = exports.RANK_LEVELS.indexOf(level);
        if (li < exports.RANK_LEVELS.length - 1) {
            newLevel = exports.RANK_LEVELS[li + 1];
        }
        else {
            const ti = exports.RANK_TIERS.indexOf(tier);
            if (ti < exports.RANK_TIERS.length - 1) {
                // Переход в следующий ранг — уровень с начала.
                newTier = exports.RANK_TIERS[ti + 1];
                newLevel = exports.RANK_LEVELS[0];
            }
            else {
                // Уже на вершине (Легенда III) — потолок: ранг не меняется,
                // звёзды держим на максимуме (2), а не обнуляем с откатом на уровень I.
                newStars = 2;
            }
        }
    }
    else if (newStars < 0) {
        newStars = 2;
        const li = exports.RANK_LEVELS.indexOf(level);
        if (li > 0) {
            newLevel = exports.RANK_LEVELS[li - 1];
        }
        else {
            const ti = exports.RANK_TIERS.indexOf(tier);
            if (ti > 0) {
                newTier = exports.RANK_TIERS[ti - 1];
                newLevel = exports.RANK_LEVELS[exports.RANK_LEVELS.length - 1];
            }
            else {
                // Уже на дне (Бронза I) — пол: ранг не меняется, звёзды на 0.
                newStars = 0;
            }
        }
    }
    return { tier: newTier, level: newLevel, stars: newStars };
}
/** true, если new-ранг строго выше old-ранга (для флага `promoted`). */
function isPromotion(oldRank, newRank) {
    const oldTi = exports.RANK_TIERS.indexOf(clampTier(oldRank.tier));
    const newTi = exports.RANK_TIERS.indexOf(clampTier(newRank.tier));
    if (newTi !== oldTi)
        return newTi > oldTi;
    return exports.RANK_LEVELS.indexOf(clampLevel(newRank.level)) > exports.RANK_LEVELS.indexOf(clampLevel(oldRank.level));
}
//# sourceMappingURL=arena_rank_progression.js.map
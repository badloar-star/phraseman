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

export const RANK_LEVELS = ['I', 'II', 'III'] as const;
export const RANK_TIERS = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
] as const;

export type RankLevel = (typeof RANK_LEVELS)[number];
export type RankTier = (typeof RANK_TIERS)[number];

export interface RankProgression {
  tier: RankTier;
  level: RankLevel;
  stars: 0 | 1 | 2;
}

function clampTier(tier: string): RankTier {
  return (RANK_TIERS as readonly string[]).includes(tier) ? (tier as RankTier) : 'bronze';
}

function clampLevel(level: string): RankLevel {
  return (RANK_LEVELS as readonly string[]).includes(level) ? (level as RankLevel) : 'I';
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
export function applyStarDelta(
  current: { tier: string; level: string; stars: number },
  starDelta: number,
): RankProgression {
  const tier = clampTier(current.tier);
  const level = clampLevel(current.level);
  const baseStars = Number.isFinite(current.stars) ? current.stars : 0;

  let newTier: RankTier = tier;
  let newLevel: RankLevel = level;
  let newStars = baseStars + starDelta;

  if (newStars >= 3) {
    newStars = 0;
    const li = RANK_LEVELS.indexOf(level);
    if (li < RANK_LEVELS.length - 1) {
      newLevel = RANK_LEVELS[li + 1];
    } else {
      const ti = RANK_TIERS.indexOf(tier);
      if (ti < RANK_TIERS.length - 1) {
        // Переход в следующий ранг — уровень с начала.
        newTier = RANK_TIERS[ti + 1];
        newLevel = RANK_LEVELS[0];
      } else {
        // Уже на вершине (Легенда III) — потолок: ранг не меняется,
        // звёзды держим на максимуме (2), а не обнуляем с откатом на уровень I.
        newStars = 2;
      }
    }
  } else if (newStars < 0) {
    newStars = 2;
    const li = RANK_LEVELS.indexOf(level);
    if (li > 0) {
      newLevel = RANK_LEVELS[li - 1];
    } else {
      const ti = RANK_TIERS.indexOf(tier);
      if (ti > 0) {
        newTier = RANK_TIERS[ti - 1];
        newLevel = RANK_LEVELS[RANK_LEVELS.length - 1];
      } else {
        // Уже на дне (Бронза I) — пол: ранг не меняется, звёзды на 0.
        newStars = 0;
      }
    }
  }

  return { tier: newTier, level: newLevel, stars: newStars as 0 | 1 | 2 };
}

/** true, если new-ранг строго выше old-ранга (для флага `promoted`). */
export function isPromotion(
  oldRank: { tier: string; level: string },
  newRank: { tier: string; level: string },
): boolean {
  const oldTi = RANK_TIERS.indexOf(clampTier(oldRank.tier));
  const newTi = RANK_TIERS.indexOf(clampTier(newRank.tier));
  if (newTi !== oldTi) return newTi > oldTi;
  return RANK_LEVELS.indexOf(clampLevel(newRank.level)) > RANK_LEVELS.indexOf(clampLevel(oldRank.level));
}

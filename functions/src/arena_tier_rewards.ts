/**
 * СЕРВЕРНАЯ КОПИЯ наград за тир.
 *
 * Источник — `modules/arena/tier_rewards.ts`. Файл повторяет его один в один,
 * отличие только в импорте: сервер берёт тиры из своей копии движка рангов.
 *
 * НЕ ПРАВИТЬ ЗДЕСЬ. Правишь `modules/arena/tier_rewards.ts` — переносишь сюда.
 */
import { ARENA_TIER_COUNT, ARENA_TIER_KEYS, type ArenaTierKey } from './arena_rank_engine';

export const ARENA_TIER_REWARD_RULE_VERSION = 2;

/**
 * Что даётся за тир. Бронза бесплатна: это стартовый тир, платить за вход
 * незачем. Дальше по одному предмету на тир — семь за всю жизнь.
 *
 * Идентификаторы взяты из существующего каталога косметики: заводить под ранг
 * отдельные предметы значило бы держать две косметики, которые надо
 * согласовывать между собой.
 */
export const ARENA_TIER_REWARD_ITEMS: readonly (string | null)[] = [
  null,                      // bronze — стартовый
  'title_rising_challenger', // silver
  'entry_cyan_trail',        // gold
  'title_clutch_player',     // platinum
  'result_midnight',         // diamond
  'entry_gold_burst',        // master
  'result_champion_gold',    // grandmaster
  'entry_legend_crown',      // legend
];

export type ArenaTierReward = Readonly<{
  tierIndex: number;
  tierKey: ArenaTierKey;
  itemId: string;
}>;

/**
 * Идентификатор операции. Сезона в ключе НЕТ намеренно: награда пожизненная, и
 * ключ с сезоном выдал бы её повторно в следующем сезоне.
 */
export function arenaTierRewardOpId(tierIndex: number): string {
  return `arena_tier.t${Math.trunc(tierIndex)}`;
}

export function arenaTierRewardItem(tierIndex: number): string | null {
  const index = Math.trunc(Number(tierIndex));
  if (!Number.isInteger(index) || index < 0 || index >= ARENA_TIER_COUNT) return null;
  return ARENA_TIER_REWARD_ITEMS[index] ?? null;
}

/**
 * Что причитается за только что случившийся подъём.
 *
 * Выдаются ВСЕ тиры между прошлым пожизненным лучшим и новым, а не только
 * верхний: игрок, перепрыгнувший два тира (так бывает после мягкого сброса),
 * иначе потерял бы награду за промежуточный, ничем этого не заслужив.
 */
export function arenaTierRewardsEarned(input: Readonly<{
  lifetimeBestBefore: number;
  lifetimeBestAfter: number;
}>): readonly ArenaTierReward[] {
  const before = Math.max(0, Math.trunc(Number(input.lifetimeBestBefore) || 0));
  const after = Math.min(ARENA_TIER_COUNT - 1, Math.trunc(Number(input.lifetimeBestAfter) || 0));
  if (after <= before) return [];
  const rewards: ArenaTierReward[] = [];
  for (let tierIndex = before + 1; tierIndex <= after; tierIndex += 1) {
    const itemId = arenaTierRewardItem(tierIndex);
    if (!itemId) continue;
    rewards.push({ tierIndex, tierKey: ARENA_TIER_KEYS[tierIndex], itemId });
  }
  return rewards;
}

/** Полная лестница — для экрана рангов: видно, что ждёт впереди. */
export function arenaTierRewardLadder(lifetimeBestTierIndex: number): readonly Readonly<{
  tierIndex: number;
  tierKey: ArenaTierKey;
  itemId: string | null;
  claimed: boolean;
}>[] {
  const best = Math.max(0, Math.min(ARENA_TIER_COUNT - 1, Math.trunc(Number(lifetimeBestTierIndex) || 0)));
  return ARENA_TIER_KEYS.map((tierKey, tierIndex) => ({
    tierIndex,
    tierKey,
    itemId: arenaTierRewardItem(tierIndex),
    claimed: tierIndex <= best,
  }));
}

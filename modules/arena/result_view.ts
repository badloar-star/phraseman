import { ARENA_TIER_KEYS, arenaRankView, type ArenaRankView, type ArenaTierKey } from './rank_engine';

/**
 * Что объявить игроку после матча.
 *
 * Экран результата долго умел только звучать: повышение тира и выданную
 * косметику он проигрывал звуком и НЕ показывал. Игрок, взявший тир, слышал
 * фанфару и не видел ничего — то есть не узнавал, что именно случилось и что
 * он получил.
 *
 * Владелец просил анимацию повышения ранга (D-17) и награду за тир (D-63).
 * Здесь собрано, что именно объявлять; экран это рисует.
 *
 * Чистая функция: ни сети, ни часов.
 */

export type ArenaRankAnnounce =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'tier_up'; tierKey: ArenaTierKey; tierIndex: number; before: ArenaRankView; after: ArenaRankView }>
  | Readonly<{ kind: 'tier_down'; tierKey: ArenaTierKey; tierIndex: number; before: ArenaRankView; after: ArenaRankView }>
  | Readonly<{ kind: 'rank_up'; before: ArenaRankView; after: ArenaRankView }>
  | Readonly<{ kind: 'rank_down'; before: ArenaRankView; after: ArenaRankView }>;

export type ArenaResultAnnounce = Readonly<{
  /** Изменение очков ранга. Ноль — строку не показывать вовсе. */
  ratingDelta: number;
  rank: ArenaRankAnnounce;
  /** Косметика, выданная за взятые тиры. Пусто — ничего не выдано. */
  unlockedItemIds: readonly string[];
  starsEarned: number;
  xpEarned: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function int(value: unknown): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? number : 0;
}

function rankTransition(row: Record<string, unknown>): Exclude<ArenaRankAnnounce, { kind: 'none' }> | null {
  if (typeof row.ratingAfter !== 'number' || !Number.isFinite(row.ratingAfter)) return null;
  if (typeof row.ratingDelta !== 'number' || !Number.isFinite(row.ratingDelta)) return null;
  const after = arenaRankView(row.ratingAfter);
  const before = arenaRankView(row.ratingAfter - row.ratingDelta);
  const derived = after.tierIndex > before.tierIndex ? 'tier_up'
    : after.tierIndex < before.tierIndex ? 'tier_down'
    : after.rankIndex > before.rankIndex ? 'rank_up'
    : after.rankIndex < before.rankIndex ? 'rank_down'
    : null;
  if (!derived || row.rankEvent !== derived) return null;
  return derived === 'tier_up' || derived === 'tier_down'
    ? { kind: derived, tierKey: after.tierKey, tierIndex: after.tierIndex, before, after }
    : { kind: derived, before, after };
}

/**
 * Разбирает награду матча.
 *
 * Всё, что не сошлось, превращается в «объявлять нечего», а не в выдуманное
 * событие: ложное «ты поднялся в тир» хуже молчания — игрок пойдёт проверять и
 * не найдёт подтверждения.
 */
export function arenaResultAnnounce(reward: unknown): ArenaResultAnnounce {
  const row = isRecord(reward) ? reward : {};
  const rank: ArenaRankAnnounce = rankTransition(row) ?? { kind: 'none' };

  const rewards = Array.isArray(row.tierRewards) ? row.tierRewards : [];
  const unlockedItemIds = rewards
    .map((item) => (isRecord(item) && typeof item.itemId === 'string' ? item.itemId : null))
    .filter((itemId): itemId is string => Boolean(itemId));

  return {
    ratingDelta: int(row.ratingDelta),
    rank,
    unlockedItemIds,
    starsEarned: Math.max(0, int(row.starsEarned)),
    xpEarned: Math.max(0, int(row.xpEarned)),
  };
}

/** Есть ли вообще что объявлять сверх счёта матча. */
export function arenaResultHasAnnounce(announce: ArenaResultAnnounce): boolean {
  return announce.rank.kind !== 'none'
    || announce.unlockedItemIds.length > 0
    || announce.ratingDelta !== 0;
}

/** Тир по очкам — для экрана, когда события нет, но ранг показать надо. */
export function arenaTierKeyForRating(rating: unknown): ArenaTierKey {
  return ARENA_TIER_KEYS[arenaRankView(int(rating)).tierIndex];
}

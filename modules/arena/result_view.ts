import { ARENA_TIER_KEYS, arenaRankView, type ArenaTierKey } from './rank_engine';

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
  | Readonly<{ kind: 'tier_up'; tierKey: ArenaTierKey; tierIndex: number }>
  | Readonly<{ kind: 'tier_down'; tierKey: ArenaTierKey; tierIndex: number }>
  | Readonly<{ kind: 'rank_up' }>
  | Readonly<{ kind: 'rank_down' }>;

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

function tierOf(value: unknown): { tierKey: ArenaTierKey; tierIndex: number } | null {
  // Отсутствие поля и «нулевой тир» — РАЗНЫЕ вещи. Через `Number(null) === 0`
  // пропавшее поле превращалось бы в бронзу, и экран объявлял бы подъём в неё
  // тому, кто никуда не поднимался.
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const index = Math.trunc(value);
  if (index < 0 || index >= ARENA_TIER_KEYS.length) return null;
  return { tierKey: ARENA_TIER_KEYS[index], tierIndex: index };
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
  const event = String(row.rankEvent ?? '');
  const after = tierOf(row.rankTierAfter);
  const before = tierOf(row.rankTierBefore);

  let rank: ArenaRankAnnounce = { kind: 'none' };
  if (event === 'tier_up' && after) rank = { kind: 'tier_up', ...after };
  else if (event === 'tier_down' && after) rank = { kind: 'tier_down', ...after };
  else if (event === 'rank_up') rank = { kind: 'rank_up' };
  else if (event === 'rank_down') rank = { kind: 'rank_down' };
  // Событие есть, а тира нет — молчим: назвать тир наугад значит соврать.
  void before;

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

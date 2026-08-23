import {
  ARENA_DIVISIONS_PER_TIER,
  ARENA_STARS_PER_RANK,
  ARENA_RANK_COUNT,
  ARENA_TIER_COUNT,
  ARENA_TIER_KEYS,
  arenaRankView,
  type ArenaTierKey,
} from './rank_engine';

/**
 * Модель экрана рангов.
 *
 * Владелец (D-04): вместо плоского списка на 48 строк — человеческий экран.
 * Плоский список плох не длиной: он не отвечает ни на один вопрос, который
 * игрок задаёт, глядя на ранг. Сколько мне до следующего? Какой тир я уже
 * забрал насовсем?
 *
 * Владелец (2026-08-23): шкала звёздная — победа +1 звезда, три звезды на
 * ранг. Диапазоны тиров считаются в звёздах общего счёта.
 *
 * Экран не считает ничего сам — всё здесь, чистой функцией, которую видно в
 * тесте.
 */

export type ArenaTierRow = Readonly<{
  tierIndex: number;
  tierKey: ArenaTierKey;
  /** Диапазон звёзд тира — для подписи «нужно столько-то». */
  minStars: number;
  maxStars: number;
  /** Тир, в котором игрок стоит сейчас. */
  current: boolean;
  /** Тир взят в этом сезоне и остаётся наградой, даже если ранг просел. */
  earned: boolean;
  /** Следующий тир: именно к нему идёт игрок. */
  next: boolean;
  /** Заперт: до него ещё не дошли и он не следующий. */
  locked: boolean;
}>;

export type ArenaRankScreen = Readonly<{
  stars: number;
  starsInRank: number;
  starsPerRank: number;
  rankIndex: number;
  tierIndex: number;
  tierKey: ArenaTierKey;
  division: 1 | 2 | 3;
  /** Доля заполнения пипсов до следующего деления, 0..1. */
  progress: number;
  /** Побед до следующего ранга (1 победа = 1 звезда). На вершине 0. */
  winsToNextRank: number;
  top: boolean;
  seasonBestTierIndex: number;
  tiers: readonly ArenaTierRow[];
  /** «Ты выше N % игроков». null — сравнивать пока не с кем. */
  percentileAbove: number | null;
}>;

export function arenaTierRows(input: Readonly<{
  tierIndex: number;
  seasonBestTierIndex: number;
}>): readonly ArenaTierRow[] {
  return ARENA_TIER_KEYS.map((tierKey, tierIndex) => {
    const spanStars = ARENA_DIVISIONS_PER_TIER * ARENA_STARS_PER_RANK;
    const isCurrent = tierIndex === input.tierIndex;
    // Следующий — соседний сверху. Строка «следующий» есть всегда, и игроку
    // понятно, куда идти.
    const nextIndex = Math.min(ARENA_TIER_COUNT - 1, input.tierIndex + 1);
    const isNext = !isCurrent && tierIndex === nextIndex;
    return {
      tierIndex,
      tierKey,
      minStars: tierIndex * spanStars,
      maxStars: tierIndex === ARENA_TIER_COUNT - 1
        ? ARENA_RANK_COUNT * ARENA_STARS_PER_RANK
        : (tierIndex + 1) * spanStars - 1,
      current: isCurrent,
      // Взятым считается всё, до чего игрок доходил в этом сезоне: тир —
      // награда, а не текущее положение, иначе неудачная серия матчей стирала
      // бы достижение, которое уже случилось.
      earned: tierIndex <= input.seasonBestTierIndex,
      next: isNext,
      locked: !isCurrent && !isNext && tierIndex > input.seasonBestTierIndex,
    };
  });
}

export function arenaRankScreen(input: Readonly<{
  stars: number;
  seasonBestTierIndex?: number;
  percentileAbove?: number | null;
}>): ArenaRankScreen {
  const view = arenaRankView(input.stars);
  const seasonBestTierIndex = Math.max(
    0,
    Math.min(ARENA_TIER_COUNT - 1, Math.trunc(Number(input.seasonBestTierIndex ?? 0))),
    // Текущий тир всегда считается взятым: иначе у нового игрока подсветка не
    // совпадёт с тем, где он стоит.
    view.tierIndex,
  );
  return {
    stars: view.stars,
    starsInRank: view.starsInRank,
    starsPerRank: view.starsPerRank,
    rankIndex: view.rankIndex,
    tierIndex: view.tierIndex,
    tierKey: view.tierKey,
    division: view.division,
    progress: view.starsPerRank > 0 ? Math.max(0, Math.min(1, view.starsInRank / view.starsPerRank)) : 1,
    // Наверху шкалы копить не к чему, и «осталось 3» было бы враньём.
    winsToNextRank: view.top ? 0 : Math.max(0, view.starsPerRank - view.starsInRank),
    top: view.top,
    seasonBestTierIndex,
    tiers: arenaTierRows({ tierIndex: view.tierIndex, seasonBestTierIndex }),
    percentileAbove: typeof input.percentileAbove === 'number'
      ? Math.max(0, Math.min(99, Math.trunc(input.percentileAbove)))
      : null,
  };
}

import {
  ARENA_DIVISIONS_PER_TIER,
  ARENA_RANK_COUNT,
  ARENA_RP_PER_RANK,
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
 * игрок задаёт, глядя на ранг. Сколько мне до следующего? Цел ли щит? Иду ли я
 * в серии и сколько осталось? Какой тир я уже забрал насовсем?
 *
 * Экран не считает ничего сам — всё здесь, чистой функцией, которую видно в
 * тесте.
 */

export type ArenaTierRow = Readonly<{
  tierIndex: number;
  tierKey: ArenaTierKey;
  /** Диапазон очков тира — для подписи «нужно столько-то». */
  minRp: number;
  maxRp: number;
  /** Тир, в котором игрок стоит сейчас. */
  current: boolean;
  /** Тир взят в этом сезоне и остаётся наградой, даже если ранг просел. */
  earned: boolean;
  /** Следующий тир: именно к нему идёт промо-серия. */
  next: boolean;
  /** Заперт: до него ещё не дошли и он не следующий. */
  locked: boolean;
}>;

export type ArenaRankScreen = Readonly<{
  rp: number;
  rankIndex: number;
  tierIndex: number;
  tierKey: ArenaTierKey;
  division: 1 | 2 | 3;
  /** Доля заполнения полосы до следующего деления, 0..1. */
  progress: number;
  rpToNextRank: number;
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
    const spanRp = ARENA_DIVISIONS_PER_TIER * ARENA_RP_PER_RANK;
    const isCurrent = tierIndex === input.tierIndex;
    // Следующий — соседний сверху. Строка «следующий» есть всегда, и игроку
    // понятно, куда идти.
    const nextIndex = Math.min(ARENA_TIER_COUNT - 1, input.tierIndex + 1);
    const isNext = !isCurrent && tierIndex === nextIndex;
    return {
      tierIndex,
      tierKey,
      minRp: tierIndex * spanRp,
      maxRp: tierIndex === ARENA_TIER_COUNT - 1
        ? ARENA_RANK_COUNT * ARENA_RP_PER_RANK
        : (tierIndex + 1) * spanRp - 1,
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
  rp: number;
  seasonBestTierIndex?: number;
  percentileAbove?: number | null;
}>): ArenaRankScreen {
  const view = arenaRankView(input.rp);
  const seasonBestTierIndex = Math.max(
    0,
    Math.min(ARENA_TIER_COUNT - 1, Math.trunc(Number(input.seasonBestTierIndex ?? 0))),
    // Текущий тир всегда считается взятым: иначе у нового игрока подсветка не
    // совпадёт с тем, где он стоит.
    view.tierIndex,
  );
  return {
    rp: view.rp,
    rankIndex: view.rankIndex,
    tierIndex: view.tierIndex,
    tierKey: view.tierKey,
    division: view.division,
    progress: view.rpForRank > 0 ? Math.max(0, Math.min(1, view.rpInRank / view.rpForRank)) : 1,
    // Наверху шкалы копить не к чему, и «осталось 100» было бы враньём.
    rpToNextRank: view.top ? 0 : Math.max(0, view.rpForRank - view.rpInRank),
    top: view.top,
    seasonBestTierIndex,
    tiers: arenaTierRows({ tierIndex: view.tierIndex, seasonBestTierIndex }),
    percentileAbove: typeof input.percentileAbove === 'number'
      ? Math.max(0, Math.min(99, Math.trunc(input.percentileAbove)))
      : null,
  };
}

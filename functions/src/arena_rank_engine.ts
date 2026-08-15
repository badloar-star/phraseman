/**
 * СЕРВЕРНАЯ КОПИЯ движка рангов Арены.
 *
 * Источник — `modules/arena/rank_engine.ts`. Файл повторяет его один в один.
 * Тест паритета `arena_rank_parity` падает при первом же расхождении.
 *
 * НЕ ПРАВИТЬ ЗДЕСЬ. Правишь `modules/arena/rank_engine.ts` — переносишь сюда.
 */

/** Восемь тиров по три деления. Двадцать четыре ранга — как в матчмейкинге. */
export const ARENA_TIER_COUNT = 8;
export const ARENA_DIVISIONS_PER_TIER = 3;
export const ARENA_RANK_COUNT = ARENA_TIER_COUNT * ARENA_DIVISIONS_PER_TIER;
/** Ширина деления в очках ранга. */
export const ARENA_RP_PER_RANK = 100;

export type ArenaTierKey =
  | 'bronze' | 'silver' | 'gold' | 'platinum'
  | 'diamond' | 'master' | 'grandmaster' | 'legend';

export const ARENA_TIER_KEYS: readonly ArenaTierKey[] = [
  'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend',
];

export type ArenaRankView = Readonly<{
  rankIndex: number;
  tierIndex: number;
  tierKey: ArenaTierKey;
  /** Деление внутри тира: III — низшее, I — высшее. Так принято везде. */
  division: 1 | 2 | 3;
  rp: number;
  /** Очки внутри текущего деления и сколько их всего — для полосы прогресса. */
  rpInRank: number;
  rpForRank: number;
  /** Верх шкалы: выше не поднимаются, полоса стоит полной. */
  top: boolean;
}>;

export function arenaRankIndex(rp: number): number {
  const safe = Math.max(0, Math.trunc(Number(rp) || 0));
  return Math.min(ARENA_RANK_COUNT - 1, Math.floor(safe / ARENA_RP_PER_RANK));
}

export function arenaRankView(rp: number): ArenaRankView {
  const safe = Math.max(0, Math.trunc(Number(rp) || 0));
  const rankIndex = arenaRankIndex(safe);
  const tierIndex = Math.floor(rankIndex / ARENA_DIVISIONS_PER_TIER);
  const top = rankIndex === ARENA_RANK_COUNT - 1;
  return {
    rankIndex,
    tierIndex,
    tierKey: ARENA_TIER_KEYS[tierIndex],
    // Внутри тира деления идут сверху вниз: первый ранг тира — III, последний — I.
    division: (ARENA_DIVISIONS_PER_TIER - (rankIndex % ARENA_DIVISIONS_PER_TIER)) as 1 | 2 | 3,
    rp: safe,
    rpInRank: top ? ARENA_RP_PER_RANK : safe - rankIndex * ARENA_RP_PER_RANK,
    rpForRank: ARENA_RP_PER_RANK,
    top,
  };
}

/* ------------------------------ состояние --------------------------------- */

export type ArenaRankState = Readonly<{
  rp: number;
  /** Лучший тир ТЕКУЩЕГО сезона. Обнуляется сбросом, нужен экрану. */
  seasonBestTierIndex: number;
  /** Лучший тир ЗА ВСЮ ЖИЗНЬ. Не обнуляется никогда: по нему выдаются награды. */
  lifetimeBestTierIndex: number;
}>;

export function arenaRankStateEmpty(): ArenaRankState {
  return { rp: 0, seasonBestTierIndex: 0, lifetimeBestTierIndex: 0 };
}

/* ---------------------------- применение ---------------------------------- */

export type ArenaRankOutcome = 'win' | 'loss' | 'draw';

export type ArenaRankChange = Readonly<{
  next: ArenaRankState;
  rpDelta: number;
  /** Что произошло с точки зрения игрока — по этому строится анимация. */
  event: 'none' | 'rank_up' | 'rank_down' | 'tier_up' | 'tier_down';
  tierBefore: number;
  tierAfter: number;
}>;

/**
 * Применяет исход рейтингового матча.
 *
 * Владелец (D-40): «честно и прозрачно». Очки складываются, тир следует за
 * очками, ничего не удерживает игрока сверху и ничего не спасает снизу.
 * Промежуточных состояний, в которых очки заморожены, больше нет — а значит
 * нет и способа проиграть серию и всё равно подняться.
 */
export function arenaApplyRankOutcome(input: Readonly<{
  state: ArenaRankState;
  outcome: ArenaRankOutcome;
  /** Очки за матч из общей таблицы. Знак уже учтён. */
  rpDelta: number;
}>): ArenaRankChange {
  const state = input.state;
  const viewBefore = arenaRankView(state.rp);
  const tierBefore = viewBefore.tierIndex;

  const rp = Math.max(0, state.rp + Math.trunc(input.rpDelta));
  const viewAfter = arenaRankView(rp);
  const tierAfter = viewAfter.tierIndex;

  const next: ArenaRankState = {
    rp,
    seasonBestTierIndex: Math.max(state.seasonBestTierIndex, tierAfter),
    // Взятый однажды тир не теряется НИКОГДА: награда за него выдаётся один
    // раз за всю жизнь, и откат не должен её отбирать или выдавать повторно.
    lifetimeBestTierIndex: Math.max(state.lifetimeBestTierIndex, tierAfter),
  };

  const event: ArenaRankChange['event'] = tierAfter > tierBefore ? 'tier_up'
    : tierAfter < tierBefore ? 'tier_down'
    : viewAfter.rankIndex > viewBefore.rankIndex ? 'rank_up'
    : viewAfter.rankIndex < viewBefore.rankIndex ? 'rank_down'
    : 'none';

  return { next, rpDelta: rp - state.rp, event, tierBefore, tierAfter };
}

/* ---------------------------- сброс сезона -------------------------------- */

/** Владелец (D-27): `новый = старый × 0,6 + 200`. */
export const ARENA_SOFT_RESET_FACTOR = 0.6;
export const ARENA_SOFT_RESET_BONUS = 200;

/**
 * Мягкий сброс в конце общего сезона.
 *
 * Сжимает шкалу к середине: сильные съезжают вниз, но остаются выше слабых, а
 * новичкам не приходится пробиваться сквозь тех, кто копил очки полгода.
 * Полный обнуление отбросило бы всех в бронзу и обесценило сезон целиком.
 *
 * Лучший тир сезона сохраняется наградой и НЕ сбрасывается — он и есть то, что
 * игрок унёс с собой.
 */
export function arenaSoftReset(state: ArenaRankState): ArenaRankState {
  const rp = Math.max(0, Math.floor(Math.max(0, state.rp) * ARENA_SOFT_RESET_FACTOR + ARENA_SOFT_RESET_BONUS));
  // Выше своего же значения сброс не поднимает: иначе на низких очках он стал
  // бы прибавкой, а не сбросом.
  return {
    rp: state.rp === 0 ? 0 : Math.min(rp, state.rp),
    // Счёт ТЕКУЩЕГО сезона обнуляется вместе с сезоном.
    seasonBestTierIndex: 0,
    // Пожизненный — нет: по нему выдаются награды, которые уже получены.
    lifetimeBestTierIndex: state.lifetimeBestTierIndex,
  };
}

/* ---------------------------- процентиль ---------------------------------- */

/**
 * «Ты выше N % игроков» (D-28).
 *
 * Глобального топа нет намеренно: в списке из миллиона строк место игрока
 * ничего ему не говорит, а процентиль говорит. Считается по числу тех, у кого
 * очков меньше, — так число не скачет при появлении новых игроков внизу.
 */
export function arenaPercentileAbove(ownRp: number, sortedRpAscending: readonly number[]): number {
  if (!sortedRpAscending.length) return 0;
  const below = sortedRpAscending.filter((value) => value < ownRp).length;
  return Math.max(0, Math.min(99, Math.floor((below / sortedRpAscending.length) * 100)));
}

/** Соперник по рейтингу: разрыв не больше деления (D-59 — окно расширяет сервер). */
export function arenaRankedOpponentEligible(ownRankIndex: number, opponentRankIndex: number): boolean {
  return Math.abs(Math.trunc(ownRankIndex) - Math.trunc(opponentRankIndex)) <= 1;
}

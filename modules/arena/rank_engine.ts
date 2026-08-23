/**
 * Ранги рейтинговой Арены — звёздная лестница.
 *
 * Чистая арифметика: ни сети, ни часов, ни хранилища. Файл переносится на
 * сервер один в один — начисление звёзд обязано совпасть до единицы с тем,
 * что игроку показали, иначе он увидит одно, а получит другое.
 *
 * Владелец (2026-08-23) ОТМЕНИЛ очки ранга (RP) полностью и вернул звёзды:
 * «когда ты выиграл — получаешь звезду, собрал три — переходишь на новый
 * ранг; проиграл — теряешь одну звезду». Никаких таблиц очков, никаких
 * дельт, зависящих от соперника: победа +1, поражение −1, ничья 0.
 *
 * Проигрыш при 0 звёзд роняет на ранг ниже с 2 звёздами — это НЕ отдельное
 * правило, а чистая арифметика общего счёта: (ранг·3 + 0) − 1 = (ранг−1)·3 + 2.
 * Именно поэтому весь прогресс хранится ОДНИМ числом — суммой звёзд.
 *
 * Решения D-40 остаются в силе: защиты тира нет, промо-серий нет. Мягкий
 * сброс (D-27) остаётся — формула переведена из очков в звёзды один к одному
 * (200 RP = 2 ранга = 6 звёзд).
 *
 * Лучший тир хранится ДВАЖДЫ: за сезон — для экрана, и за всю жизнь — потому
 * что награда за тир выдаётся один раз навсегда (D-63), а не каждый сезон.
 */

/** Восемь тиров по три деления. Двадцать четыре ранга — как в матчмейкинге. */
export const ARENA_TIER_COUNT = 8;
export const ARENA_DIVISIONS_PER_TIER = 3;
export const ARENA_RANK_COUNT = ARENA_TIER_COUNT * ARENA_DIVISIONS_PER_TIER;
/** Три звезды на ранг: три победы — новое деление. Решение владельца 2026-08-23. */
export const ARENA_STARS_PER_RANK = 3;
/** Потолок общего счёта: вершина лестницы с полными звёздами. */
export const ARENA_STARS_TOTAL_MAX = ARENA_RANK_COUNT * ARENA_STARS_PER_RANK;

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
  /** Общий счёт звёзд за сезон — единственное хранимое число. */
  stars: number;
  /** Звёзды внутри текущего деления и сколько их всего — для трёх пипсов. */
  starsInRank: number;
  starsPerRank: number;
  /** Верх шкалы: выше не поднимаются, пипсы стоят полными. */
  top: boolean;
}>;

export function arenaRankIndex(stars: number): number {
  const safe = Math.max(0, Math.trunc(Number(stars) || 0));
  return Math.min(ARENA_RANK_COUNT - 1, Math.floor(safe / ARENA_STARS_PER_RANK));
}

export function arenaRankView(stars: number): ArenaRankView {
  const safe = Math.max(0, Math.trunc(Number(stars) || 0));
  const rankIndex = arenaRankIndex(safe);
  const tierIndex = Math.floor(rankIndex / ARENA_DIVISIONS_PER_TIER);
  const top = rankIndex === ARENA_RANK_COUNT - 1;
  return {
    rankIndex,
    tierIndex,
    tierKey: ARENA_TIER_KEYS[tierIndex],
    // Внутри тира деления идут сверху вниз: первый ранг тира — III, последний — I.
    division: (ARENA_DIVISIONS_PER_TIER - (rankIndex % ARENA_DIVISIONS_PER_TIER)) as 1 | 2 | 3,
    stars: safe,
    // На вершине пипсы НЕ рисуются полными принудительно: звёзды там — буфер
    // против падения, и игрок должен видеть, сколько поражений он переживёт.
    starsInRank: Math.min(ARENA_STARS_PER_RANK, safe - rankIndex * ARENA_STARS_PER_RANK),
    starsPerRank: ARENA_STARS_PER_RANK,
    top,
  };
}

/* ------------------------------ состояние --------------------------------- */

export type ArenaRankState = Readonly<{
  /** Общий счёт звёзд за сезон. */
  stars: number;
  /** Лучший тир ТЕКУЩЕГО сезона. Обнуляется сбросом, нужен экрану. */
  seasonBestTierIndex: number;
  /** Лучший тир ЗА ВСЮ ЖИЗНЬ. Не обнуляется никогда: по нему выдаются награды. */
  lifetimeBestTierIndex: number;
}>;

export function arenaRankStateEmpty(): ArenaRankState {
  return { stars: 0, seasonBestTierIndex: 0, lifetimeBestTierIndex: 0 };
}

/* ---------------------------- применение ---------------------------------- */

export type ArenaRankOutcome = 'win' | 'loss' | 'draw';

/**
 * Звёзды за исход. Победа +1, поражение −1, ничья 0 — таблица из одного
 * правила, одинаковая для любого соперника: игрок должен уметь пересчитать
 * свой ранг в уме.
 */
export function arenaStarDelta(outcome: ArenaRankOutcome): number {
  return outcome === 'win' ? 1 : outcome === 'loss' ? -1 : 0;
}

export type ArenaRankChange = Readonly<{
  next: ArenaRankState;
  starsDelta: number;
  /** Что произошло с точки зрения игрока — по этому строится анимация. */
  event: 'none' | 'rank_up' | 'rank_down' | 'tier_up' | 'tier_down';
  tierBefore: number;
  tierAfter: number;
}>;

/**
 * Применяет исход рейтингового матча.
 *
 * Владелец (D-40): «честно и прозрачно». Звёзды складываются, тир следует за
 * звёздами, ничего не удерживает игрока сверху и ничего не спасает снизу.
 * Внизу шкалы звёзды не уходят в минус: с Бронзы III с нулём падать некуда.
 */
export function arenaApplyRankOutcome(input: Readonly<{
  state: ArenaRankState;
  outcome: ArenaRankOutcome;
}>): ArenaRankChange {
  const state = input.state;
  const viewBefore = arenaRankView(state.stars);
  const tierBefore = viewBefore.tierIndex;

  const stars = Math.max(0, Math.min(ARENA_STARS_TOTAL_MAX,
    state.stars + arenaStarDelta(input.outcome)));
  const viewAfter = arenaRankView(stars);
  const tierAfter = viewAfter.tierIndex;

  const next: ArenaRankState = {
    stars,
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

  return { next, starsDelta: stars - state.stars, event, tierBefore, tierAfter };
}

/* ---------------------------- сброс сезона -------------------------------- */

/** Владелец (D-27): `новый = старый × 0,6 + 2 ранга`. В звёздах бонус = 6. */
export const ARENA_SOFT_RESET_FACTOR = 0.6;
export const ARENA_SOFT_RESET_BONUS = 6;

/**
 * Мягкий сброс в конце общего сезона.
 *
 * Сжимает шкалу к середине: сильные съезжают вниз, но остаются выше слабых, а
 * новичкам не приходится пробиваться сквозь тех, кто копил звёзды полгода.
 * Полное обнуление отбросило бы всех в бронзу и обесценило сезон целиком.
 *
 * Лучший тир сезона сохраняется наградой и НЕ сбрасывается — он и есть то, что
 * игрок унёс с собой.
 */
export function arenaSoftReset(state: ArenaRankState): ArenaRankState {
  const stars = Math.max(0, Math.floor(Math.max(0, state.stars) * ARENA_SOFT_RESET_FACTOR + ARENA_SOFT_RESET_BONUS));
  // Выше своего же значения сброс не поднимает: иначе на низких звёздах он
  // стал бы прибавкой, а не сбросом.
  return {
    stars: state.stars === 0 ? 0 : Math.min(stars, state.stars),
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
 * звёзд меньше, — так число не скачет при появлении новых игроков внизу.
 */
export function arenaPercentileAbove(ownStars: number, sortedStarsAscending: readonly number[]): number {
  if (!sortedStarsAscending.length) return 0;
  const below = sortedStarsAscending.filter((value) => value < ownStars).length;
  return Math.max(0, Math.min(99, Math.floor((below / sortedStarsAscending.length) * 100)));
}

/** Соперник по рейтингу: разрыв не больше деления (D-59 — окно расширяет сервер). */
export function arenaRankedOpponentEligible(ownRankIndex: number, opponentRankIndex: number): boolean {
  return Math.abs(Math.trunc(ownRankIndex) - Math.trunc(opponentRankIndex)) <= 1;
}

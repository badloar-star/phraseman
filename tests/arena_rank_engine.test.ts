import {
  ARENA_DIVISIONS_PER_TIER,
  ARENA_RANK_COUNT,
  ARENA_SOFT_RESET_BONUS,
  ARENA_STARS_PER_RANK,
  ARENA_STARS_TOTAL_MAX,
  ARENA_TIER_COUNT,
  ARENA_TIER_KEYS,
  arenaApplyRankOutcome,
  arenaPercentileAbove,
  arenaRankIndex,
  arenaRankStateEmpty,
  arenaRankView,
  arenaRankedOpponentEligible,
  arenaSoftReset,
  arenaStarDelta,
  type ArenaRankState,
} from '../modules/arena/rank_engine';

/**
 * Ранги рейтинговой Арены — звёздная лестница.
 *
 * Владелец (2026-08-23) отменил очки ранга (RP) и вернул звёзды: победа +1,
 * поражение −1, три звезды — новый ранг. Проигрыш при нуле звёзд роняет на
 * ранг ниже с двумя звёздами — чистой арифметикой общего счёта, без
 * отдельного правила. Решение D-40 в силе: защиты тира нет, промо-серий нет.
 */

const state = (over: Partial<ArenaRankState> = {}): ArenaRankState =>
  ({ ...arenaRankStateEmpty(), ...over });

const apply = (from: ArenaRankState, outcome: 'win' | 'loss' | 'draw') =>
  arenaApplyRankOutcome({ state: from, outcome });

describe('шкала рангов', () => {
  it('двадцать четыре ранга, восемь тиров по три деления, три звезды на ранг', () => {
    expect(ARENA_RANK_COUNT).toBe(24);
    expect(ARENA_TIER_COUNT * ARENA_DIVISIONS_PER_TIER).toBe(ARENA_RANK_COUNT);
    expect(ARENA_TIER_KEYS.length).toBe(ARENA_TIER_COUNT);
    expect(ARENA_STARS_PER_RANK).toBe(3);
    expect(ARENA_STARS_TOTAL_MAX).toBe(72);
  });

  it('звёзды переводятся в ранг и не выходят за шкалу', () => {
    expect(arenaRankIndex(0)).toBe(0);
    expect(arenaRankIndex(2)).toBe(0);
    expect(arenaRankIndex(3)).toBe(1);
    expect(arenaRankIndex(999_999)).toBe(ARENA_RANK_COUNT - 1);
    expect(arenaRankIndex(-500)).toBe(0);
    expect(arenaRankIndex(NaN)).toBe(0);
  });

  /** Деления идут сверху вниз: первый ранг тира — III, последний — I. */
  it('деления внутри тира нумеруются от III к I', () => {
    expect(arenaRankView(0).division).toBe(3);
    expect(arenaRankView(3).division).toBe(2);
    expect(arenaRankView(6).division).toBe(1);
    expect(arenaRankView(9).division).toBe(3);
    expect(arenaRankView(9).tierIndex).toBe(1);
  });

  it('пипсы не переполняются и не уходят в минус', () => {
    for (const stars of [0, 1, 2, 3, 35, 71, 72, 999_999]) {
      const view = arenaRankView(stars);
      expect(view.starsInRank).toBeGreaterThanOrEqual(0);
      expect(view.starsInRank).toBeLessThanOrEqual(ARENA_STARS_PER_RANK);
    }
  });

  it('верх шкалы показывает реальный запас звёзд — это буфер против падения', () => {
    expect(arenaRankView(ARENA_STARS_TOTAL_MAX).top).toBe(true);
    expect(arenaRankView(ARENA_STARS_TOTAL_MAX).starsInRank).toBe(ARENA_STARS_PER_RANK);
    expect(arenaRankView(ARENA_STARS_TOTAL_MAX - 2).top).toBe(true);
    expect(arenaRankView(ARENA_STARS_TOTAL_MAX - 2).starsInRank).toBe(1);
  });
});

describe('дельта за исход — одно правило для любого соперника', () => {
  it('победа +1, поражение −1, ничья 0', () => {
    expect(arenaStarDelta('win')).toBe(1);
    expect(arenaStarDelta('loss')).toBe(-1);
    expect(arenaStarDelta('draw')).toBe(0);
  });
});

describe('обычное начисление', () => {
  it('третья звезда поднимает деление', () => {
    const change = apply(state({ stars: 2 }), 'win');
    expect(change.next.stars).toBe(3);
    expect(change.event).toBe('rank_up');
  });

  it('победа внутри ранга зажигает звезду без смены деления', () => {
    const change = apply(state({ stars: 3 }), 'win');
    expect(change.next.stars).toBe(4);
    expect(change.event).toBe('none');
    expect(arenaRankView(change.next.stars).starsInRank).toBe(1);
  });

  it('поражение при нуле звёзд роняет на ранг ниже с двумя звёздами', () => {
    const change = apply(state({ stars: 6 }), 'loss');
    expect(change.next.stars).toBe(5);
    expect(change.event).toBe('rank_down');
    const view = arenaRankView(change.next.stars);
    expect(view.rankIndex).toBe(1);
    expect(view.starsInRank).toBe(2);
  });

  it('звёзды не уходят в минус — с самого низа падать некуда', () => {
    const change = apply(state({ stars: 0 }), 'loss');
    expect(change.next.stars).toBe(0);
    expect(change.event).toBe('none');
  });

  it('ничья ничего не двигает', () => {
    const change = apply(state({ stars: 5 }), 'draw');
    expect(change.next.stars).toBe(5);
    expect(change.event).toBe('none');
  });

  it('на вершине звёзды упираются в потолок, а не копятся бесконечно', () => {
    const change = apply(state({ stars: ARENA_STARS_TOTAL_MAX }), 'win');
    expect(change.next.stars).toBe(ARENA_STARS_TOTAL_MAX);
    expect(change.starsDelta).toBe(0);
  });
});

describe('переход между тирами — без удержаний и спасений', () => {
  /** D-40: «упал ниже порога — выпал из тира». Без исключений. */
  it('первое же поражение на границе тира роняет тир', () => {
    const change = apply(state({ stars: 9 }), 'loss');
    expect(change.event).toBe('tier_down');
    expect(change.next.stars).toBe(8);
    expect(change.tierAfter).toBe(0);
  });

  /** Ничего не задерживает игрока на подходе к новому тиру. */
  it('победа сразу вносит в новый тир, без серии', () => {
    const change = apply(state({ stars: 8 }), 'win');
    expect(change.event).toBe('tier_up');
    expect(change.next.stars).toBe(9);
    expect(change.tierAfter).toBe(1);
  });

  it('звёзды не замораживаются ни в каком состоянии', () => {
    let current = state({ stars: 8 });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const change = apply(current, 'win');
      expect(change.starsDelta).toBe(1);
      current = change.next;
    }
  });
});

describe('лучший тир', () => {
  it('сезонный запоминается и не падает вместе с рангом', () => {
    let current = state({ stars: 8 });
    current = apply(current, 'win').next;
    expect(current.seasonBestTierIndex).toBe(1);
    for (let attempt = 0; attempt < 10; attempt += 1) current = apply(current, 'loss').next;
    expect(arenaRankView(current.stars).tierIndex).toBe(0);
    expect(current.seasonBestTierIndex).toBe(1);
  });

  /**
   * Пожизненный не обнуляется ничем: по нему выдаётся награда за тир, и
   * обнуление выдало бы её повторно.
   */
  it('пожизненный переживает и откат, и сброс сезона', () => {
    let current = apply(state({ stars: 8 }), 'win').next;
    expect(current.lifetimeBestTierIndex).toBe(1);
    for (let attempt = 0; attempt < 10; attempt += 1) current = apply(current, 'loss').next;
    current = arenaSoftReset(current);
    expect(current.seasonBestTierIndex).toBe(0);
    expect(current.lifetimeBestTierIndex).toBe(1);
  });
});

describe('мягкий сброс сезона', () => {
  /**
   * Полное обнуление отбросило бы всех в бронзу и обесценило сезон целиком.
   * Сжатие к середине оставляет сильных выше слабых, но даёт новичкам шанс.
   */
  it('сжимает шкалу к середине по формуле владельца', () => {
    expect(arenaSoftReset(state({ stars: 60 })).stars).toBe(Math.floor(60 * 0.6) + ARENA_SOFT_RESET_BONUS);
    expect(arenaSoftReset(state({ stars: 30 })).stars).toBe(Math.floor(30 * 0.6) + ARENA_SOFT_RESET_BONUS);
  });

  it('сильные остаются выше слабых', () => {
    const strong = arenaSoftReset(state({ stars: 69 })).stars;
    const weak = arenaSoftReset(state({ stars: 18 })).stars;
    expect(strong).toBeGreaterThan(weak);
  });

  it('сброс никого не поднимает', () => {
    for (const stars of [0, 3, 15, 30, 69]) {
      expect(arenaSoftReset(state({ stars })).stars).toBeLessThanOrEqual(stars);
    }
  });

  it('нулевой рейтинг остаётся нулевым — новичку прибавки не бывает', () => {
    expect(arenaSoftReset(state({ stars: 0 })).stars).toBe(0);
  });

  it('сезонный счёт лучшего тира обнуляется, пожизненный — нет', () => {
    const next = arenaSoftReset(state({
      stars: 45, seasonBestTierIndex: 5, lifetimeBestTierIndex: 6,
    }));
    expect(next.seasonBestTierIndex).toBe(0);
    expect(next.lifetimeBestTierIndex).toBe(6);
  });

  it('повторный сброс сходится, а не уносит в ноль', () => {
    let current = state({ stars: 69 });
    for (let season = 0; season < 12; season += 1) current = arenaSoftReset(current);
    expect(current.stars).toBeGreaterThan(0);
    expect(current.stars).toBeLessThanOrEqual(69);
  });
});

describe('процентиль вместо глобального топа', () => {
  it('считается по тем, у кого звёзд меньше', () => {
    expect(arenaPercentileAbove(50, [10, 20, 30, 40, 60])).toBe(80);
    expect(arenaPercentileAbove(5, [10, 20, 30])).toBe(0);
  });

  it('никогда не показывает сто процентов', () => {
    expect(arenaPercentileAbove(9_999, [1, 2, 3])).toBe(99);
  });

  it('пустая выборка не роняет и не врёт', () => {
    expect(arenaPercentileAbove(50, [])).toBe(0);
  });

  it('равные звёзды не считаются «ниже тебя»', () => {
    expect(arenaPercentileAbove(30, [30, 30, 30, 30])).toBe(0);
  });
});

describe('подбор соперника', () => {
  it('разрыв не больше деления', () => {
    expect(arenaRankedOpponentEligible(5, 5)).toBe(true);
    expect(arenaRankedOpponentEligible(5, 6)).toBe(true);
    expect(arenaRankedOpponentEligible(5, 4)).toBe(true);
    expect(arenaRankedOpponentEligible(5, 7)).toBe(false);
    expect(arenaRankedOpponentEligible(5, 3)).toBe(false);
  });
});

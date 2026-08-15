import {
  ARENA_DIVISIONS_PER_TIER,
  ARENA_RANK_COUNT,
  ARENA_RP_PER_RANK,
  ARENA_SOFT_RESET_BONUS,
  ARENA_TIER_COUNT,
  ARENA_TIER_KEYS,
  arenaApplyRankOutcome,
  arenaPercentileAbove,
  arenaRankIndex,
  arenaRankStateEmpty,
  arenaRankView,
  arenaRankedOpponentEligible,
  arenaSoftReset,
  type ArenaRankState,
} from '../modules/arena/rank_engine';

/**
 * Ранги рейтинговой Арены.
 *
 * Владелец (D-04) сначала попросил промо-серии и защиту от падения из тира,
 * а позже (D-40) отменил и то и другое дословно: «защиты нет, промо-серий нет.
 * Очки упали ниже порога — игрок выпал из тира. Честно и прозрачно». Тесты
 * держат ПОЗДНЕЕ решение и отдельно проверяют, что удержания сверху и спасения
 * снизу действительно нет.
 */

const state = (over: Partial<ArenaRankState> = {}): ArenaRankState =>
  ({ ...arenaRankStateEmpty(), ...over });

const apply = (from: ArenaRankState, outcome: 'win' | 'loss' | 'draw', rpDelta: number) =>
  arenaApplyRankOutcome({ state: from, outcome, rpDelta });

describe('шкала рангов', () => {
  it('двадцать четыре ранга, восемь тиров по три деления', () => {
    expect(ARENA_RANK_COUNT).toBe(24);
    expect(ARENA_TIER_COUNT * ARENA_DIVISIONS_PER_TIER).toBe(ARENA_RANK_COUNT);
    expect(ARENA_TIER_KEYS.length).toBe(ARENA_TIER_COUNT);
  });

  it('очки переводятся в ранг и не выходят за шкалу', () => {
    expect(arenaRankIndex(0)).toBe(0);
    expect(arenaRankIndex(99)).toBe(0);
    expect(arenaRankIndex(100)).toBe(1);
    expect(arenaRankIndex(999_999)).toBe(ARENA_RANK_COUNT - 1);
    expect(arenaRankIndex(-500)).toBe(0);
    expect(arenaRankIndex(NaN)).toBe(0);
  });

  /** Деления идут сверху вниз: первый ранг тира — III, последний — I. */
  it('деления внутри тира нумеруются от III к I', () => {
    expect(arenaRankView(0).division).toBe(3);
    expect(arenaRankView(100).division).toBe(2);
    expect(arenaRankView(200).division).toBe(1);
    expect(arenaRankView(300).division).toBe(3);
    expect(arenaRankView(300).tierIndex).toBe(1);
  });

  it('полоса прогресса не переполняется и не уходит в минус', () => {
    for (const rp of [0, 50, 99, 100, 1_150, 2_399, 999_999]) {
      const view = arenaRankView(rp);
      expect(view.rpInRank).toBeGreaterThanOrEqual(0);
      expect(view.rpInRank).toBeLessThanOrEqual(ARENA_RP_PER_RANK);
    }
  });

  it('на верху шкалы полоса стоит полной, а не пустой', () => {
    const view = arenaRankView(ARENA_RANK_COUNT * ARENA_RP_PER_RANK + 5_000);
    expect(view.top).toBe(true);
    expect(view.rpInRank).toBe(ARENA_RP_PER_RANK);
  });
});

describe('обычное начисление', () => {
  it('победа поднимает деление', () => {
    const change = apply(state({ rp: 90 }), 'win', 20);
    expect(change.next.rp).toBe(110);
    expect(change.event).toBe('rank_up');
  });

  it('поражение внутри тира опускает деление', () => {
    const change = apply(state({ rp: 210 }), 'loss', -20);
    expect(change.next.rp).toBe(190);
    expect(change.event).toBe('rank_down');
  });

  it('очки не уходят в минус', () => {
    const change = apply(state({ rp: 10 }), 'loss', -50);
    expect(change.next.rp).toBe(0);
  });

  it('ничья без изменения очков ничего не двигает', () => {
    const change = apply(state({ rp: 150 }), 'draw', 0);
    expect(change.next.rp).toBe(150);
    expect(change.event).toBe('none');
  });
});

describe('переход между тирами — без удержаний и спасений', () => {
  /** D-40: «очки упали ниже порога — игрок выпал из тира». Без исключений. */
  it('первое же поражение на границе роняет тир', () => {
    const change = apply(state({ rp: 300 }), 'loss', -20);
    expect(change.event).toBe('tier_down');
    expect(change.next.rp).toBe(280);
    expect(change.tierAfter).toBe(0);
  });

  /** Ничего не задерживает игрока на подходе к новому тиру. */
  it('победа сразу вносит в новый тир, без серии', () => {
    const change = apply(state({ rp: 280 }), 'win', 20);
    expect(change.event).toBe('tier_up');
    expect(change.next.rp).toBe(300);
    expect(change.tierAfter).toBe(1);
  });

  it('очки не замораживаются ни в каком состоянии', () => {
    let current = state({ rp: 280 });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const change = apply(current, 'win', 20);
      expect(change.rpDelta).toBe(20);
      current = change.next;
    }
  });
});

describe('лучший тир', () => {
  it('сезонный запоминается и не падает вместе с рангом', () => {
    let current = state({ rp: 280 });
    current = apply(current, 'win', 20).next;
    expect(current.seasonBestTierIndex).toBe(1);
    for (let attempt = 0; attempt < 10; attempt += 1) current = apply(current, 'loss', -24).next;
    expect(arenaRankView(current.rp).tierIndex).toBe(0);
    expect(current.seasonBestTierIndex).toBe(1);
  });

  /**
   * Пожизненный не обнуляется ничем: по нему выдаётся награда за тир, и
   * обнуление выдало бы её повторно.
   */
  it('пожизненный переживает и откат, и сброс сезона', () => {
    let current = apply(state({ rp: 280 }), 'win', 20).next;
    expect(current.lifetimeBestTierIndex).toBe(1);
    for (let attempt = 0; attempt < 10; attempt += 1) current = apply(current, 'loss', -24).next;
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
    expect(arenaSoftReset(state({ rp: 2_000 })).rp).toBe(Math.floor(2_000 * 0.6) + ARENA_SOFT_RESET_BONUS);
    expect(arenaSoftReset(state({ rp: 1_000 })).rp).toBe(Math.floor(1_000 * 0.6) + ARENA_SOFT_RESET_BONUS);
  });

  it('сильные остаются выше слабых', () => {
    const strong = arenaSoftReset(state({ rp: 2_300 })).rp;
    const weak = arenaSoftReset(state({ rp: 600 })).rp;
    expect(strong).toBeGreaterThan(weak);
  });

  it('сброс никого не поднимает', () => {
    for (const rp of [0, 100, 500, 1_000, 2_300]) {
      expect(arenaSoftReset(state({ rp })).rp).toBeLessThanOrEqual(rp);
    }
  });

  it('нулевой рейтинг остаётся нулевым — новичку прибавки не бывает', () => {
    expect(arenaSoftReset(state({ rp: 0 })).rp).toBe(0);
  });

  it('сезонный счёт лучшего тира обнуляется, пожизненный — нет', () => {
    const next = arenaSoftReset(state({
      rp: 1_500, seasonBestTierIndex: 5, lifetimeBestTierIndex: 6,
    }));
    expect(next.seasonBestTierIndex).toBe(0);
    expect(next.lifetimeBestTierIndex).toBe(6);
  });

  it('повторный сброс сходится, а не уносит в ноль', () => {
    let current = state({ rp: 2_300 });
    for (let season = 0; season < 12; season += 1) current = arenaSoftReset(current);
    expect(current.rp).toBeGreaterThan(0);
    expect(current.rp).toBeLessThanOrEqual(2_300);
  });
});

describe('процентиль вместо глобального топа', () => {
  it('считается по тем, у кого очков меньше', () => {
    expect(arenaPercentileAbove(500, [100, 200, 300, 400, 600])).toBe(80);
    expect(arenaPercentileAbove(50, [100, 200, 300])).toBe(0);
  });

  it('никогда не показывает сто процентов', () => {
    expect(arenaPercentileAbove(9_999, [1, 2, 3])).toBe(99);
  });

  it('пустая выборка не роняет и не врёт', () => {
    expect(arenaPercentileAbove(500, [])).toBe(0);
  });

  it('равные очки не считаются «ниже тебя»', () => {
    expect(arenaPercentileAbove(300, [300, 300, 300, 300])).toBe(0);
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

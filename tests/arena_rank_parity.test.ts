import * as client from '../modules/arena/rank_engine';
import * as server from '../functions/src/arena_rank_engine';

/**
 * Паритет движка рангов (звёздная лестница).
 *
 * Клиент показывает игроку повышение, сервер записывает его в базу — РАЗНЫМИ
 * файлами: сервер не может импортировать клиентский код, клиент не может
 * импортировать серверный. Расхождение означает, что экран сказал «новый
 * ранг», а в профиле оказался откат, и заметит это игрок в худший момент.
 *
 * Поэтому обе реализации прогоняются здесь на одних и тех же входах, включая
 * исчерпывающий обход всей шкалы и длинные случайные партии.
 */

const OUTCOMES = ['win', 'loss', 'draw'] as const;

describe('константы совпадают', () => {
  it('шкала', () => {
    expect(client.ARENA_TIER_COUNT).toBe(server.ARENA_TIER_COUNT);
    expect(client.ARENA_DIVISIONS_PER_TIER).toBe(server.ARENA_DIVISIONS_PER_TIER);
    expect(client.ARENA_RANK_COUNT).toBe(server.ARENA_RANK_COUNT);
    expect(client.ARENA_STARS_PER_RANK).toBe(server.ARENA_STARS_PER_RANK);
    expect(client.ARENA_STARS_TOTAL_MAX).toBe(server.ARENA_STARS_TOTAL_MAX);
    expect(client.ARENA_TIER_KEYS).toEqual(server.ARENA_TIER_KEYS);
  });

  it('сброс', () => {
    expect(client.ARENA_SOFT_RESET_FACTOR).toBe(server.ARENA_SOFT_RESET_FACTOR);
    expect(client.ARENA_SOFT_RESET_BONUS).toBe(server.ARENA_SOFT_RESET_BONUS);
  });
});

describe('вид ранга — исчерпывающе по всей шкале', () => {
  it('каждое значение звёзд даёт одинаковый ранг на обеих сторонах', () => {
    const total = client.ARENA_STARS_TOTAL_MAX + 50;
    for (let stars = -20; stars <= total; stars += 1) {
      expect(client.arenaRankIndex(stars)).toBe(server.arenaRankIndex(stars));
      expect(client.arenaRankView(stars)).toEqual(server.arenaRankView(stars));
    }
  });

  it('мусор обрабатывается одинаково', () => {
    for (const stars of [NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0]) {
      expect(client.arenaRankIndex(stars as number)).toBe(server.arenaRankIndex(stars as number));
      expect(client.arenaRankView(stars as number)).toEqual(server.arenaRankView(stars as number));
    }
  });
});

describe('дельта за исход', () => {
  it('совпадает для всех исходов', () => {
    for (const outcome of OUTCOMES) {
      expect(client.arenaStarDelta(outcome)).toBe(server.arenaStarDelta(outcome));
    }
  });
});

describe('исход матча — исчерпывающе по решётке', () => {
  it('звёзды × исход × лучший тир дают одинаковый результат', () => {
    let checked = 0;
    for (let stars = 0; stars <= client.ARENA_STARS_TOTAL_MAX; stars += 1) {
      for (const outcome of OUTCOMES) {
        for (const lifetimeBestTierIndex of [0, 3, 7]) {
          const state = { stars, seasonBestTierIndex: 0, lifetimeBestTierIndex };
          expect(client.arenaApplyRankOutcome({ state, outcome }))
            .toEqual(server.arenaApplyRankOutcome({ state, outcome } as never));
          checked += 1;
        }
      }
    }
    // Столько входов прогнать глазами нельзя, а разойтись они могут на одном.
    expect(checked).toBeGreaterThan(600);
  });
});

describe('мягкий сброс', () => {
  it('совпадает на всей шкале', () => {
    for (let stars = 0; stars <= client.ARENA_STARS_TOTAL_MAX; stars += 1) {
      const state = { stars, seasonBestTierIndex: 3, lifetimeBestTierIndex: 4 };
      expect(client.arenaSoftReset(state)).toEqual(server.arenaSoftReset(state as never));
    }
  });
});

describe('процентиль и подбор соперника', () => {
  it('процентиль совпадает', () => {
    const pool = [0, 3, 8, 8, 21, 36, 57, 69];
    for (let stars = 0; stars <= client.ARENA_STARS_TOTAL_MAX; stars += 1) {
      expect(client.arenaPercentileAbove(stars, pool)).toBe(server.arenaPercentileAbove(stars, pool));
    }
    expect(client.arenaPercentileAbove(15, [])).toBe(server.arenaPercentileAbove(15, []));
  });

  it('годность соперника совпадает', () => {
    for (let own = 0; own < client.ARENA_RANK_COUNT; own += 1) {
      for (let rival = 0; rival < client.ARENA_RANK_COUNT; rival += 1) {
        expect(client.arenaRankedOpponentEligible(own, rival))
          .toBe(server.arenaRankedOpponentEligible(own, rival));
      }
    }
  });
});

describe('длинные партии', () => {
  /**
   * Одиночный вход может совпасть случайно. Расхождение накапливается там, где
   * состояние переносится из матча в матч: звёзды, лучший тир сезона.
   */
  it('двести матчей подряд не расходятся ни на одном шаге', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      let left: client.ArenaRankState = client.arenaRankStateEmpty();
      let right = server.arenaRankStateEmpty();
      let value = seed * 7919;
      for (let game = 0; game < 200; game += 1) {
        // Детерминированный генератор: тот же ряд на обеих сторонах.
        value = (value * 1103515245 + 12345) % 2147483648;
        const outcome = OUTCOMES[Math.abs(value) % 3];
        const a = client.arenaApplyRankOutcome({ state: left, outcome });
        const b = server.arenaApplyRankOutcome({ state: right, outcome } as never);
        expect(a).toEqual(b);
        left = a.next;
        right = b.next;
        if (game % 50 === 49) {
          left = client.arenaSoftReset(left);
          right = server.arenaSoftReset(right);
          expect(left).toEqual(right);
        }
      }
    }
  });
});

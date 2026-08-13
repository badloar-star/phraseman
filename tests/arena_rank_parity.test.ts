import * as client from '../modules/arena/rank_engine';
import * as server from '../functions/src/arena_rank_engine';

/**
 * Паритет движка рангов.
 *
 * Клиент показывает игроку повышение, сервер записывает его в базу — РАЗНЫМИ
 * файлами: сервер не может импортировать клиентский код, клиент не может
 * импортировать серверный. Расхождение означает, что экран сказал «новый тир»,
 * а в профиле оказался откат, и заметит это игрок в худший момент.
 *
 * Поэтому обе реализации прогоняются здесь на одних и тех же входах, включая
 * исчерпывающий обход всей шкалы и длинные случайные партии.
 */

const OUTCOMES = ['win', 'loss', 'draw'] as const;
/** Те же значения, что в серверной таблице очков. */
const RP_DELTAS = [24, 20, 16, 4, 0, -4, -16, -20, -24];

describe('константы совпадают', () => {
  it('шкала', () => {
    expect(client.ARENA_TIER_COUNT).toBe(server.ARENA_TIER_COUNT);
    expect(client.ARENA_DIVISIONS_PER_TIER).toBe(server.ARENA_DIVISIONS_PER_TIER);
    expect(client.ARENA_RANK_COUNT).toBe(server.ARENA_RANK_COUNT);
    expect(client.ARENA_RP_PER_RANK).toBe(server.ARENA_RP_PER_RANK);
    expect(client.ARENA_TIER_KEYS).toEqual(server.ARENA_TIER_KEYS);
  });

  it('сброс', () => {
    expect(client.ARENA_SOFT_RESET_FACTOR).toBe(server.ARENA_SOFT_RESET_FACTOR);
    expect(client.ARENA_SOFT_RESET_BONUS).toBe(server.ARENA_SOFT_RESET_BONUS);
  });
});

describe('вид ранга — исчерпывающе по всей шкале', () => {
  it('каждое значение очков даёт одинаковый ранг на обеих сторонах', () => {
    const total = client.ARENA_RANK_COUNT * client.ARENA_RP_PER_RANK + 500;
    for (let rp = -200; rp <= total; rp += 1) {
      expect(client.arenaRankIndex(rp)).toBe(server.arenaRankIndex(rp));
      expect(client.arenaRankView(rp)).toEqual(server.arenaRankView(rp));
    }
  });

  it('мусор обрабатывается одинаково', () => {
    for (const rp of [NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0]) {
      expect(client.arenaRankIndex(rp as number)).toBe(server.arenaRankIndex(rp as number));
      expect(client.arenaRankView(rp as number)).toEqual(server.arenaRankView(rp as number));
    }
  });
});

describe('исход матча — исчерпывающе по решётке', () => {
  it('очки × исход × дельта × щит дают одинаковый результат', () => {
    let checked = 0;
    for (let rp = 0; rp <= 2_400; rp += 20) {
      for (const outcome of OUTCOMES) {
        for (const rpDelta of RP_DELTAS) {
          for (const lifetimeBestTierIndex of [0, 3]) {
            const state = { rp, seasonBestTierIndex: 0, lifetimeBestTierIndex };
            expect(client.arenaApplyRankOutcome({ state, outcome, rpDelta }))
              .toEqual(server.arenaApplyRankOutcome({ state, outcome, rpDelta } as never));
            checked += 1;
          }
        }
      }
    }
    // Столько входов прогнать глазами нельзя, а разойтись они могут на одном.
    expect(checked).toBeGreaterThan(6_000);
  });

});

describe('мягкий сброс', () => {
  it('совпадает на всей шкале', () => {
    for (let rp = 0; rp <= 2_400; rp += 1) {
      const state = { rp, seasonBestTierIndex: 3, lifetimeBestTierIndex: 4 };
      expect(client.arenaSoftReset(state)).toEqual(server.arenaSoftReset(state as never));
    }
  });
});

describe('процентиль и подбор соперника', () => {
  it('процентиль совпадает', () => {
    const pool = [0, 100, 250, 250, 700, 1_200, 1_900, 2_300];
    for (let rp = 0; rp <= 2_400; rp += 7) {
      expect(client.arenaPercentileAbove(rp, pool)).toBe(server.arenaPercentileAbove(rp, pool));
    }
    expect(client.arenaPercentileAbove(500, [])).toBe(server.arenaPercentileAbove(500, []));
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
   * состояние переносится из матча в матч: щит, серия, лучший тир сезона.
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
        const rpDelta = RP_DELTAS[Math.abs(Math.floor(value / 3)) % RP_DELTAS.length];
        const a = client.arenaApplyRankOutcome({ state: left, outcome, rpDelta });
        const b = server.arenaApplyRankOutcome({ state: right, outcome, rpDelta } as never);
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

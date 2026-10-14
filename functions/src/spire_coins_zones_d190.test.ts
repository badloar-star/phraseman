// Сторож D190 (владелец 14.10; решения координатора (в1)–(в3)): в режиме монет вниз уходят только k ПОСЛЕДНИХ живых
// (k = N≥15 ? 5 : max(1, floor(N/3))), нули сверх k НЕ спускаются, вверх — k лучших с монетами, без пересечения;
// нижняя лига вниз никого, верхняя вверх никого; поздно вошедшие не понижаются. Режим ступеней не меняется.
import { spireCoinsDownK, spireCoinsZoneK, spireCoinsZonesFor } from '../../shared/spire_coins_zones';
import { computeSpireRoomResults, SPIRE_FINAL_MAX_TIER } from './spire_finalize_core';

const WEEK_START = Date.UTC(2026, 9, 19);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const COINS = { weekPlace1: 300, weekPlace2: 200, weekPlace3: 150, promotionBonus: 100 };
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

function member(steps: number, joinedAtMs = WEEK_START + 1_000) {
  return { steps, reachedAtMs: steps > 0 ? WEEK_START + steps * 60_000 : 0, totalMs: steps * 90_000, name: 'x', joinedAtMs };
}

/** n живых: монеты coins[i] у uid u{i}; ступени равны 0, чтобы порядок решали монеты. */
function room(coins: number[], tier = 5, joined: Record<string, number> = {}) {
  const members: Record<string, unknown> = {};
  const weekCoinsByUid: Record<string, number> = {};
  coins.forEach((c, i) => {
    members[`u${i}`] = member(0, joined[`u${i}`]);
    weekCoinsByUid[`u${i}`] = c;
  });
  return computeSpireRoomResults({
    groupId: '2026-W43_en_t5_d0_1_room', tier, weekStartMs: WEEK_START, cohortDay: 0,
    members, coins: COINS, tuning: TUNING, rankBy: 'coins', weekCoinsByUid,
  });
}

const ups = (r: ReturnType<typeof room>) => Object.entries(r.results).filter(([, v]) => v.promoted).map(([k]) => k).sort();
const downs = (r: ReturnType<typeof room>) => Object.entries(r.results).filter(([, v]) => v.demoted).map(([k]) => k).sort();

describe('D190: размер зон', () => {
  it('k и место внизу по числу живых, без пересечения', () => {
    const table: Array<[number, number, number]> = [[0, 0, 0], [1, 1, 0], [2, 1, 1], [3, 1, 1], [5, 1, 1], [6, 2, 2], [9, 3, 3], [12, 4, 4], [14, 4, 4], [15, 5, 5], [30, 5, 5]];
    for (const [n, k, down] of table) {
      expect([n, spireCoinsZoneK(n), spireCoinsDownK(n)]).toEqual([n, k, down]);
    }
  });
});

describe('D190: итог недели в режиме монет', () => {
  it('20 живых: вверх 5 лучших, вниз 5 последних; середина остаётся', () => {
    const r = room(Array.from({ length: 20 }, (_, i) => 2_000 - i * 50));
    expect(r.zoneSize).toBe(5);
    expect(ups(r)).toEqual(['u0', 'u1', 'u2', 'u3', 'u4']);
    expect(downs(r)).toEqual(['u15', 'u16', 'u17', 'u18', 'u19']);
  });

  it('(в1) нулей больше k — вниз только k последних, остальные нули остаются', () => {
    const coins = [900, 800, 700, 600, 500, 400, 300, 200, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = room(coins);
    // 10 нулей — полная ничья; k=5 вниз не вмещает всю группу равных → никого из неразличимых наугад не спускаем.
    expect(downs(r)).toEqual([]);
    // Разные суммы у нижних — ровно 5 последних.
    const r2 = room([900, 800, 700, 600, 500, 400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 5, 4, 3, 0]);
    expect(downs(r2)).toEqual(['u15', 'u16', 'u17', 'u18', 'u19']);
  });

  it('малые комнаты: N=1 никого вниз; N=2 один вверх, один вниз; N=3 середина остаётся', () => {
    expect(downs(room([500]))).toEqual([]);
    expect(ups(room([500]))).toEqual(['u0']);
    const two = room([500, 100]);
    expect([ups(two), downs(two)]).toEqual([['u0'], ['u1']]);
    const three = room([500, 300, 100]);
    expect([ups(three), downs(three)]).toEqual([['u0'], ['u2']]);
  });

  it('вверх только с монетами; комната без монет никого не понижает', () => {
    const r = room([0, 0, 0, 0, 0, 0]);
    expect([ups(r), downs(r)]).toEqual([[], []]);
  });

  it('нижняя лига — вниз никого; верхняя — вверх никого', () => {
    expect(downs(room([500, 300, 100], 0))).toEqual([]);
    expect(ups(room([500, 300, 100], SPIRE_FINAL_MAX_TIER))).toEqual([]);
  });

  // (в3): защита поздно вошедших — прежняя, последние 10 минут недели (SPIRE_LATE_JOIN_GRACE_MS, D61), не сутки.
  it('(в3) вошедший в последние 10 минут недели не понижается', () => {
    const late = WEEK_START + WEEK_MS - 5 * 60 * 1000;
    const r = room([500, 300, 100], 5, { u2: late });
    expect(downs(r)).toEqual([]);
  });

  it('ничьи на границе — по ступеням (D184): равные монеты, разные ступени различимы', () => {
    const members = { a: member(10), b: member(5), c: member(1) };
    const r = computeSpireRoomResults({
      groupId: 'g', tier: 5, weekStartMs: WEEK_START, cohortDay: 0, members, coins: COINS, tuning: TUNING,
      rankBy: 'coins', weekCoinsByUid: { a: 100, b: 100, c: 100 },
    });
    expect(Object.entries(r.results).filter(([, v]) => v.promoted).map(([k]) => k)).toEqual(['a']);
    expect(Object.entries(r.results).filter(([, v]) => v.demoted).map(([k]) => k)).toEqual(['c']);
  });

  it('общая функция: равные на верхней границе все вверх (в пользу игрока)', () => {
    const zones = spireCoinsZonesFor([3, 3, 1, 0, 0, 0], (a, b) => b - a, (x) => x > 0);
    expect(zones.slice(0, 2)).toEqual(['up', 'up']);
  });
});

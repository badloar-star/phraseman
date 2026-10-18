// Сторож итога недели Шпиля (PM-276). Правила зон — владельца 2026-08-17
// (guard_league_demotion) и D59: зона от комнаты с ботами, ранги по живым.
// Сработал — чини логику, а не сторожа.
import {
  compareSpireStanding,
  computeSpireRoomResults,
  spireLiveStandings,
  SPIRE_FINAL_MAX_TIER,
  spireLadderMemberKey,
} from './spire_finalize_core';

const WEEK_START = Date.UTC(2026, 8, 21); // понедельник 2026-09-21
const COINS = { weekPlace1: 300, weekPlace2: 200, weekPlace3: 150, promotionBonus: 100 };
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

function member(steps: number, reachedAtMs = steps > 0 ? WEEK_START + steps * 60_000 : 0, totalMs = steps * 90_000) {
  return { steps, reachedAtMs, totalMs, name: 'x' };
}

function run(members: Record<string, unknown>, tier = 5) {
  return computeSpireRoomResults({
    groupId: '2026-W39_en_t5_d0_1_room', tier, weekStartMs: WEEK_START, cohortDay: 0,
    members, coins: COINS, tuning: TUNING,
  });
}

describe('spire finalize: порядок мест (§4.5)', () => {
  it('ступени, затем кто раньше добрался, затем меньшее время', () => {
    const a = { uid: 'a', steps: 10, reachedAtMs: 100, totalMs: 900 };
    const b = { uid: 'b', steps: 10, reachedAtMs: 200, totalMs: 100 };
    const c = { uid: 'c', steps: 10, reachedAtMs: 100, totalMs: 500 };
    expect(compareSpireStanding(a, b)).toBeLessThan(0);
    expect(compareSpireStanding(c, a)).toBeLessThan(0);
    expect(compareSpireStanding({ uid: 'z', steps: 11, reachedAtMs: 999, totalMs: 999 }, a)).toBeLessThan(0);
  });

  it('все нули — одна ничья', () => {
    expect(compareSpireStanding({ uid: 'a', steps: 0, reachedAtMs: 5, totalMs: 5 }, { uid: 'b', steps: 0, reachedAtMs: 0, totalMs: 0 })).toBe(0);
  });

  it('боты и скрытые дубли в итог не попадают', () => {
    const live = spireLiveStandings({ a: member(3), res_01: member(9), h: { ...member(2), identityHidden: true } });
    expect(live.map((m) => m.uid)).toEqual(['a']);
  });
});

describe('spire finalize: зоны (правило владельца + D59)', () => {
  it('одинокий живой с ≥1 ступенью повышается и получает 1 место без синтетических соседей', () => {
    const out = run({ solo: member(4) });
    expect(out.zoneSize).toBe(1);
    expect(out.results.solo.promoted).toBe(true);
    expect(out.results.solo.newTier).toBe(6);
    expect(out.results.solo.rewardCoins).toEqual({ place: 300, promotion: 100, total: 400 });
    expect(out.roomTotal).toBe(1);
  });

  it('ноль ступеней понижает, повышение требует ≥1 ступени', () => {
    const out = run({ a: member(8), b: member(0), c: member(0) });
    expect(out.results.a.promoted).toBe(true);
    expect(out.results.b.promoted).toBe(false);
    expect(out.results.b.demoted).toBe(true);
    expect(out.results.c.demoted).toBe(true);
    expect(out.results.b.rewardCoins.total).toBe(0);
  });

  it('комната, где никто не играл, никого не понижает', () => {
    const out = run({ a: member(0), b: member(0) });
    expect(out.hasAnyScorer).toBe(false);
    expect(Object.values(out.results).every((r) => !r.promoted && !r.demoted)).toBe(true);
  });

  it('боты не получают итогов и не отнимают место у живого', () => {
    const out = run({ a: member(2), b: member(1) });
    expect(Object.keys(out.results).sort()).toEqual(['a', 'b']);
    expect(out.results.a.roomRank).toBe(1);
    expect(out.results.b.roomRank).toBe(2);
  });

  it('10 живых: верхние и нижние 15% зоны состоят только из живых', () => {
    const members: Record<string, unknown> = {};
    for (let i = 1; i <= 10; i++) members[`p${i}`] = member(i * 3);
    const out = run(members);
    const up = Object.entries(out.results).filter(([, r]) => r.promoted).map(([u]) => u).sort();
    const down = Object.entries(out.results).filter(([, r]) => r.demoted).map(([u]) => u).sort();
    expect(up).toEqual(['p10', 'p9']);
    expect(down).toEqual(['p1', 'p2']);
  });

  it('на вершине (Алмаз) лидер не повышается и НЕ понижается', () => {
    const out = run({ a: member(9), b: member(3) }, SPIRE_FINAL_MAX_TIER);
    expect(out.results.a.promoted).toBe(false);
    expect(out.results.a.demoted).toBe(false);
    expect(out.results.a.newTier).toBe(SPIRE_FINAL_MAX_TIER);
    // Место недели платится и на вершине, бонус повышения — нет.
    expect(out.results.a.rewardCoins).toEqual({ place: 300, promotion: 0, total: 300 });
  });

  it('в Граните понижать некуда', () => {
    const out = run({ a: member(9), b: member(0) }, 0);
    expect(out.results.b.demoted).toBe(false);
    expect(out.results.b.newTier).toBe(0);
  });

  it('монеты за 2 и 3 место', () => {
    const out = run({ a: member(9), b: member(6), c: member(3), d: member(1) });
    expect(out.results.b.rewardCoins.place).toBe(200);
    expect(out.results.c.rewardCoins.place).toBe(150);
    expect(out.results.d.rewardCoins.place).toBe(0);
  });
});

// D191 (координатор 14.10): лестница комнаты и порог повышения в итоге недели — для окон m01/m02, без новых чтений.
describe('spire finalize: лестница итога недели (D191)', () => {
  function runCoins(members: Record<string, unknown>, weekCoinsByUid: Record<string, number>) {
    return computeSpireRoomResults({
      groupId: '2026-W39_en_t5_d0_1_room', tier: 5, weekStartMs: WEEK_START, cohortDay: 0,
      members, coins: COINS, tuning: TUNING, rankBy: 'coins', weekCoinsByUid,
    });
  }

  it('до 6 строк, «я» всегда среди них, чужих uid нет, имя и ранг монеты из комнаты', () => {
    const members: Record<string, unknown> = {};
    const coins: Record<string, number> = {};
    for (let i = 0; i < 15; i += 1) {
      members[`u${i}`] = { ...member(20 - i), name: `Игрок ${i}`, coinRank: i % 20 };
      coins[`u${i}`] = 1000 - i * 50;
    }
    const out = runCoins(members, coins);
    const low = out.results.u14;
    expect(low.ladder.length).toBeLessThanOrEqual(6);
    expect(low.ladder.filter((r) => r.isMe)).toHaveLength(1);
    expect(low.ladder[low.ladder.length - 1]).toMatchObject({ isMe: true, name: 'Игрок 14', coinRank: 14, coins: 300 });
    expect(JSON.stringify(low.ladder)).not.toMatch(/"uid"|u\d+"/);
    const top = out.results.u0;
    expect(top.ladder[0]).toMatchObject({ place: 1, isMe: true, name: 'Игрок 0' });
    for (const row of top.ladder) expect(Object.keys(row).sort()).toEqual(['coinRank', 'coins', 'isMe', 'memberKey', 'name', 'place']);
    // зачем (координатор 15.10, политика §5): ключ участника — 16 hex, свой у каждого, без uid; удаление аккаунта находит по нему строки.
    for (const row of top.ladder) expect(row.memberKey).toMatch(/^[0-9a-f]{16}$/);
    expect(new Set(top.ladder.map((r) => r.memberKey)).size).toBe(top.ladder.length);
    expect(top.ladder[0].memberKey).toBe(spireLadderMemberKey('2026-W39_en_t5_d0_1_room', 'u0'));
    // пустой ранг монеты — базовая монета (null), а не «ранг 0»
    const noRank = runCoins({ a: { ...member(5), name: 'А', coinRank: null }, b: member(3) }, { a: 10, b: 5 });
    expect(noRank.results.a.ladder.find((r) => r.isMe)?.coinRank).toBeNull();
  });

  it('порог повышения в режиме монет — монеты последнего живого в зоне «вверх»; в режиме ступеней — null', () => {
    const members: Record<string, unknown> = {};
    const coins: Record<string, number> = {};
    for (let i = 0; i < 15; i += 1) { members[`u${i}`] = member(10); coins[`u${i}`] = 1000 - i * 10; }
    const out = runCoins(members, coins);
    // N=15 → k=5: в зоне повышения u0..u4, последний — u4 с 960 монетами.
    expect(out.results.u9.promotionLineCoins).toBe(960);
    expect(run({ a: member(5), b: member(3) }).results.a.promotionLineCoins).toBeNull();
  });
});


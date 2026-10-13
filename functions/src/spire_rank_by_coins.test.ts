// Сторож D162 (OWNER_FINAL 10.10): переход между лигами Пика решают монеты недели всех режимов — под рубильником
// config/spire_v1.rankBy ('steps' по умолчанию), с недели 2026-W43, с потолком weekCoinsCap. Сработал — чини логику, а не сторожа.
import fs from 'fs';
import path from 'path';
import {
  SPIRE_CONFIG_DEFAULTS,
  SPIRE_RANK_BY_COINS_FROM_WEEK,
  SPIRE_WEEK_COINS_CAP_DEFAULT,
  spireBotWeekCoins,
  spireBuildConfigDoc,
  spireConfigStatus,
  spireEffectiveRankBy,
} from './spire_config_contract';
import { compareSpireStandingBy, computeSpireRoomResults } from './spire_finalize_core';
import { spireMemberStepsUpdate, spireWeekCoinsOf } from './spire_groups';
import { spireReadWeekCoins } from './spire_finalize_cron';

const WEEK_START = Date.UTC(2026, 9, 19); // понедельник 2026-10-19 (W43)
const COINS = { weekPlace1: 300, weekPlace2: 200, weekPlace3: 150, promotionBonus: 100 };
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

function member(steps: number) {
  return { steps, reachedAtMs: steps > 0 ? WEEK_START + steps * 60_000 : 0, totalMs: steps * 90_000, name: 'x' };
}

function run(members: Record<string, unknown>, extra: Partial<Parameters<typeof computeSpireRoomResults>[0]> = {}) {
  return computeSpireRoomResults({
    groupId: '2026-W43_en_t5_d0_1_room', tier: 5, weekStartMs: WEEK_START, cohortDay: 0,
    members, coins: COINS, tuning: TUNING, ...extra,
  });
}

describe('D162: рубильник rankBy в договоре config/spire_v1', () => {
  it('нет поля или мусор — ступени; явное coins — монеты; потолок по умолчанию 20 000', () => {
    expect(SPIRE_CONFIG_DEFAULTS.rankBy).toBe('steps');
    expect(spireBuildConfigDoc({}).rankBy).toBe('steps');
    expect(spireBuildConfigDoc({ rankBy: 'COINS' }).rankBy).toBe('steps');
    expect(spireBuildConfigDoc({ rankBy: 'coins' }).rankBy).toBe('coins');
    expect(spireBuildConfigDoc({}).weekCoinsCap).toBe(SPIRE_WEEK_COINS_CAP_DEFAULT);
    expect(spireBuildConfigDoc({ weekCoinsCap: -5 }).weekCoinsCap).toBe(SPIRE_WEEK_COINS_CAP_DEFAULT);
    expect(spireBuildConfigDoc({ weekCoinsCap: 9000 }).weekCoinsCap).toBe(9000);
    expect(spireConfigStatus({ schemaVersion: 'spire-v1-config.v1', enabled: true, rankBy: 'coins' }).config.rankBy).toBe('coins');
  });

  it('монеты действуют только с недели W43: текущая неделя доигрывается по ступеням', () => {
    const coins = { rankBy: 'coins' as const };
    expect(SPIRE_RANK_BY_COINS_FROM_WEEK).toBe('2026-W43');
    expect(spireEffectiveRankBy(coins, '2026-W42')).toBe('steps');
    expect(spireEffectiveRankBy(coins, '2026-W43')).toBe('coins');
    expect(spireEffectiveRankBy(coins, '2027-W01')).toBe('coins');
    expect(spireEffectiveRankBy({ rankBy: 'steps' }, '2026-W50')).toBe('steps');
  });

  it('админка не стирает рубильник: запись без rankBy берёт прежнее значение', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_spire_config.ts'), 'utf8');
    expect(source).toMatch(/rankBy: data\.rankBy \?\? beforeStatus\.config\.rankBy/);
    expect(source).toMatch(/weekCoinsCap: data\.weekCoinsCap \?\? beforeStatus\.config\.weekCoinsCap/);
  });
});

describe('D162: итог недели по монетам', () => {
  it('режим монет: больше монет — выше, даже при меньшем числе ступеней; места 1–3 и повышение по монетам', () => {
    const out = run({ climber: member(30), learner: member(2), idle: member(0) }, {
      rankBy: 'coins', weekCoinsByUid: { climber: 800, learner: 5000, idle: 0 }, weekCoinsCap: 20_000,
    });
    expect(out.rankBy).toBe('coins');
    expect(out.results.learner.liveRank).toBe(1);
    expect(out.results.climber.liveRank).toBe(2);
    expect(out.results.learner.rewardCoins.place).toBe(300);
    expect(out.results.climber.rewardCoins.place).toBe(200);
    expect(out.results.learner.weekCoins).toBe(5000);
    expect(out.results.idle.demoted).toBe(true);
  });

  it('режим ступеней не меняется, даже если монеты переданы', () => {
    const out = run({ climber: member(30), learner: member(2) }, { rankBy: 'steps', weekCoinsByUid: { climber: 10, learner: 9000 } });
    expect(out.rankBy).toBe('steps');
    expect(out.results.climber.liveRank).toBe(1);
    expect(out.results.learner.liveRank).toBe(2);
  });

  it('без rankBy — ступени (безопасный дефолт)', () => {
    const out = run({ climber: member(30), learner: member(2) }, { weekCoinsByUid: { climber: 10, learner: 9000 } });
    expect(out.results.climber.liveRank).toBe(1);
  });

  it('потолок недели: накрутка выше потолка не даёт преимущества, отмечена в итоге и в capHits', () => {
    const out = run({ honest: member(10), cheater: member(1) }, {
      rankBy: 'coins', weekCoinsByUid: { honest: 20_000, cheater: 640_000 }, weekCoinsCap: 20_000,
    });
    expect(out.results.cheater.weekCoins).toBe(20_000);
    expect(out.results.cheater.weekCoinsCapped).toBe(true);
    expect(out.results.honest.weekCoinsCapped).toBe(false);
    expect(out.capHits).toBe(1);
    // равные монеты (потолок) — дальше прежний порядок: ступени
    expect(out.results.honest.liveRank).toBe(1);
  });

  it('«играл» в режиме монет = монеты > 0: ступени без монет повышения не дают', () => {
    const out = run({ a: member(5), b: member(0) }, { rankBy: 'coins', weekCoinsByUid: { a: 0, b: 0 } });
    expect(out.hasAnyScorer).toBe(false);
    expect(out.results.a.promoted).toBe(false);
    expect(out.results.a.demoted).toBe(false);
  });

  it('ничья по монетам — ступени, затем кто раньше добрался', () => {
    const cmp = compareSpireStandingBy('coins');
    const a = { uid: 'a', steps: 10, reachedAtMs: 100, totalMs: 900, weekCoins: 500 };
    const b = { uid: 'b', steps: 12, reachedAtMs: 200, totalMs: 100, weekCoins: 500 };
    expect(cmp(b, a)).toBeLessThan(0);
    expect(cmp({ ...a, weekCoins: 501 }, b)).toBeLessThan(0);
  });

  it('боты получают монеты по формуле только для показанного места', () => {
    expect(spireBotWeekCoins(0)).toBe(0);
    expect(spireBotWeekCoins(4)).toBe(120);
    const out = run({ solo: member(4) }, { rankBy: 'coins', weekCoinsByUid: { solo: 50_000 }, weekCoinsCap: 20_000 });
    expect(out.results.solo.roomRank).toBe(1);
  });
});

describe('D162: снимок монет недели в комнату', () => {
  const NEXT = { steps: 5, reachedAtMs: 1, totalMs: 2 };
  it('пишет weekCoins той же записью, что ступени; отдельно — только если сумма изменилась', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 3, weekCoins: 10 }, NEXT, 9, null, 40)).toMatchObject({ 'members.u1.weekCoins': 40, 'members.u1.steps': 5 });
    expect(spireMemberStepsUpdate('u1', { steps: 5, weekCoins: 40 }, NEXT, 9, null, 40)).toBeNull();
    expect(spireMemberStepsUpdate('u1', { steps: 5, weekCoins: 10 }, NEXT, 9, null, 40)).toEqual({ 'members.u1.weekCoins': 40, updatedAt: 9 });
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9)).toBeNull();
  });

  it('монеты недели берутся из журнала users.stars, прошлая неделя — из prevWeekEarned', () => {
    expect(spireWeekCoinsOf({ stars: { weekKey: '2026-W43', weekEarned: 700, prevWeekKey: '2026-W42', prevWeekEarned: 300 } }, '2026-W43')).toBe(700);
    expect(spireWeekCoinsOf({ stars: { weekKey: '2026-W44', weekEarned: 5, prevWeekKey: '2026-W43', prevWeekEarned: 900 } }, '2026-W43')).toBe(900);
    expect(spireWeekCoinsOf(undefined, '2026-W43')).toBe(0);
  });

  it('финализация читает только живых одним getAll с маской stars', async () => {
    const calls: Array<{ ids: string[]; mask: unknown }> = [];
    const stars: Record<string, unknown> = {
      a: { weekKey: '2026-W44', weekEarned: 1, prevWeekKey: '2026-W43', prevWeekEarned: 1200 },
      b: { weekKey: '2026-W43', weekEarned: 300 },
    };
    const db = {
      collection: () => ({ doc: (id: string) => ({ id }) }),
      getAll: async (...args: unknown[]) => {
        const opts = args[args.length - 1] as { fieldMask: unknown };
        const refs = args.slice(0, -1) as Array<{ id: string }>;
        calls.push({ ids: refs.map((r) => r.id), mask: opts.fieldMask });
        return refs.map((r) => ({ id: r.id, exists: r.id in stars, get: () => stars[r.id] }));
      },
    };
    const out = await spireReadWeekCoins(db as never, { a: member(1), b: member(2), res_01: member(9), ghost: member(0) }, '2026-W43');
    expect(out).toEqual({ a: 1200, b: 300, ghost: 0 });
    expect(calls).toEqual([{ ids: ['a', 'b', 'ghost'], mask: ['stars'] }]);
  });
});

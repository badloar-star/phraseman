// Сторож монет Шпиля (PM-280, TOWER.md T35/§4.6). Одна ступень/этаж — одна
// операция с постоянным ключом: на этом держится защита от двойной выплаты.
// Сработал — чини расчёт, а не сторожа.
import {
  spireFloorCoins,
  spireFloorOfStep,
  spireStepCoinOps,
  spireWeekRewardOp,
  SPIRE_COINS_MAX_STEPS_PER_CALL,
} from './spire_coins';
import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';

const COINS = SPIRE_CONFIG_DEFAULTS.coins;
const BASE = { lang: 'en', weekKey: '2026-W39', coins: COINS, earnedAtMs: 1_000 };

describe('этаж ступени (T10: 5,6,7,8,9, дальше по 10)', () => {
  it('границы этажей', () => {
    expect(spireFloorOfStep(1)).toEqual({ floor: 1, isFloorEnd: false });
    expect(spireFloorOfStep(5)).toEqual({ floor: 1, isFloorEnd: true });
    expect(spireFloorOfStep(6)).toEqual({ floor: 2, isFloorEnd: false });
    expect(spireFloorOfStep(11)).toEqual({ floor: 2, isFloorEnd: true });
    expect(spireFloorOfStep(35)).toEqual({ floor: 5, isFloorEnd: true });
    expect(spireFloorOfStep(45)).toEqual({ floor: 6, isFloorEnd: true });
  });

  it('вершина — 135 ступеней (T32)', () => {
    expect(spireFloorOfStep(135)).toEqual({ floor: 15, isFloorEnd: true });
    expect(spireFloorOfStep(136)).toEqual({ floor: 16, isFloorEnd: false });
  });
});

describe('монеты за этаж (T35, T34)', () => {
  it('этаж N = 10×N, Страж ×2', () => {
    expect(spireFloorCoins(1, COINS)).toBe(10);
    expect(spireFloorCoins(4, COINS)).toBe(40);
    expect(spireFloorCoins(5, COINS)).toBe(100);
    expect(spireFloorCoins(15, COINS)).toBe(300);
  });
});

describe('операции за ступени', () => {
  it('первый этаж: 5 ступеней по 10 + этаж 10', () => {
    const plan = spireStepCoinOps({ ...BASE, fromSteps: 0, toSteps: 5 });
    expect(plan.ops.map((o) => o.opId)).toEqual([
      'spire_step:en_2026-W39_s1', 'spire_step:en_2026-W39_s2', 'spire_step:en_2026-W39_s3',
      'spire_step:en_2026-W39_s4', 'spire_step:en_2026-W39_s5', 'spire_floor:en_2026-W39_f1',
    ]);
    expect(plan.total).toBe(60);
    expect(plan.truncatedSteps).toBe(0);
  });

  it('ключ не зависит от разбиения на пачки — одна ступень, один ключ', () => {
    const whole = spireStepCoinOps({ ...BASE, fromSteps: 0, toSteps: 12 }).ops.map((o) => o.opId);
    const split = [
      ...spireStepCoinOps({ ...BASE, fromSteps: 0, toSteps: 3 }).ops,
      ...spireStepCoinOps({ ...BASE, fromSteps: 3, toSteps: 7, earnedAtMs: 2_000 }).ops,
      ...spireStepCoinOps({ ...BASE, fromSteps: 7, toSteps: 12, earnedAtMs: 3_000 }).ops,
    ].map((o) => o.opId);
    expect(split).toEqual(whole);
    expect(new Set(whole).size).toBe(whole.length);
  });

  it('без новых ступеней — ни одной операции', () => {
    expect(spireStepCoinOps({ ...BASE, fromSteps: 9, toSteps: 9 }).ops).toHaveLength(0);
    expect(spireStepCoinOps({ ...BASE, fromSteps: 9, toSteps: 3 }).ops).toHaveLength(0);
  });

  it('неделя до вершины ≈ ориентир §4.6: 1350 + этажи со Стражами + 200', () => {
    let from = 0;
    let total = 0;
    while (from < 135) {
      const to = Math.min(135, from + SPIRE_COINS_MAX_STEPS_PER_CALL);
      total += spireStepCoinOps({ ...BASE, fromSteps: from, toSteps: to }).total;
      from = to;
    }
    // ступени 135×10 = 1350; этажи 10×(1..15) = 1200 + Стражи 5,10,15 ещё раз 300 = 1500; вершина 200
    expect(total).toBe(1350 + 1500 + 200);
  });

  it('над облаками (16+) платят только ступени', () => {
    const plan = spireStepCoinOps({ ...BASE, fromSteps: 135, toSteps: 145 });
    expect(plan.ops.every((o) => o.sourceKind === 'spire_step')).toBe(true);
    expect(plan.total).toBe(100);
  });

  it('вершина платится один раз и отдельным ключом', () => {
    const ops = spireStepCoinOps({ ...BASE, fromSteps: 130, toSteps: 140 }).ops;
    expect(ops.filter((o) => o.opId === 'spire_summit:en_2026-W39')).toHaveLength(1);
  });

  it('пачка больше предела режется и сообщает об этом', () => {
    const plan = spireStepCoinOps({ ...BASE, fromSteps: 0, toSteps: 100 });
    expect(plan.truncatedSteps).toBe(100 - SPIRE_COINS_MAX_STEPS_PER_CALL);
  });

  it('все операции — целые, положительные, класс spire_step', () => {
    const plan = spireStepCoinOps({ ...BASE, coins: { ...COINS, perStep: 2.6 }, fromSteps: 0, toSteps: 5 });
    for (const op of plan.ops) {
      expect(Number.isSafeInteger(op.delta)).toBe(true);
      expect(op.delta).toBeGreaterThan(0);
      expect(op.reason).toBe('spire_step');
      expect(op.opId).toMatch(/^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/);
    }
    expect(plan.ops[0]?.delta).toBe(3);
  });
});

describe('выплата недели (О-276-1)', () => {
  const week = { weekId: '2026-W39', lang: 'en', liveRank: 1, weekEndMs: 5_000 };

  it('место + повышение одной операцией с постоянным ключом', () => {
    const op = spireWeekRewardOp({ ...week, place: 300, promotion: 100 });
    expect(op).toMatchObject({
      opId: 'spire_week:en_2026-W39', delta: 400, reason: 'spire_week_reward', earnedAtMs: 5_000,
    });
  });

  it('повтор даёт байт в байт ту же операцию (журнал ответит already_applied)', () => {
    expect(spireWeekRewardOp({ ...week, place: 200, promotion: 0 }))
      .toEqual(spireWeekRewardOp({ ...week, place: 200, promotion: 0 }));
  });

  it('ноль — не операция', () => {
    expect(spireWeekRewardOp({ ...week, place: 0, promotion: 0 })).toBeNull();
  });
});

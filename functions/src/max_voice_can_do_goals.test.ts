// Карта речевых целей учителя (ступень 2 плана обучения, владелец 2026-08-17).

import {
  CAN_DO_GOALS,
  CAN_DO_GOALS_TOTAL,
  canDoProgress,
  levelFromMastery,
  parseCanDoMastery,
  pickNextGoal,
  renderCanDoGoalBlock,
} from './max_voice_can_do_goals';
import { applyGoalProgress, mergeTutorMemory, parseTutorMemory } from './max_voice_tutor_memory';

describe('карта целей: контент', () => {
  it('60 целей: 20 A1 / 22 A2 / 18 B1, уникальные id, у каждой 3–4 фразы, названия на en/ru/uk', () => {
    expect(CAN_DO_GOALS_TOTAL).toBe(60);
    const by = (l: string) => CAN_DO_GOALS.filter((g) => g.level === l).length;
    expect([by('A1'), by('A2'), by('B1')]).toEqual([20, 22, 18]);
    expect(new Set(CAN_DO_GOALS.map((g) => g.id)).size).toBe(60);
    for (const g of CAN_DO_GOALS) {
      expect(g.phrases.length).toBeGreaterThanOrEqual(3);
      expect(g.phrases.length).toBeLessThanOrEqual(4);
      expect(g.title.en && g.title.ru && g.title.uk).toBeTruthy();
      expect(g.canDo.length).toBeGreaterThan(10);
    }
  });
});

describe('pickNextGoal / progress / level', () => {
  it('первая незакрытая цель уровня; закрытые пропускаются; уровень закрыт → следующий; всё закрыто → null', () => {
    expect(pickNextGoal({}, 'A1')!.id).toBe('a1_greet');
    expect(pickNextGoal({ a1_greet: 3 }, 'A1')!.id).toBe('a1_intro');
    expect(pickNextGoal({ a1_greet: 2 }, 'A1')!.id).toBe('a1_greet'); // 2 < 3 — ещё не закрыта
    const allA1 = Object.fromEntries(CAN_DO_GOALS.filter((g) => g.level === 'A1').map((g) => [g.id, 3]));
    expect(pickNextGoal(allA1, 'A1')!.level).toBe('A2');
    expect(pickNextGoal({}, 'A2')!.level).toBe('A2'); // ученик A2 не гоняется по A1
    expect(pickNextGoal({}, 'B2')!.level).toBe('B1'); // B2 работает с целями B1
    const all = Object.fromEntries(CAN_DO_GOALS.map((g) => [g.id, 3]));
    expect(pickNextGoal(all, 'A1')).toBeNull();
  });

  it('прогресс считает закрытые (3) по уровням; уровень по 80 % закрытых целей', () => {
    const m = { a1_greet: 3, a1_intro: 3, a2_past_day: 3, a2_plans: 1 };
    const p = canDoProgress(m);
    expect(p.done).toBe(3);
    expect(p.total).toBe(60);
    expect(p.byLevel.A1.done).toBe(2);
    expect(p.byLevel.A2.done).toBe(1);
    expect(levelFromMastery(m, 'A1')).toBe('A1');
    const a1Closed = Object.fromEntries(CAN_DO_GOALS.filter((g) => g.level === 'A1').slice(0, 16).map((g) => [g.id, 3])); // 16/20 = 80 %
    expect(levelFromMastery(a1Closed, 'A1')).toBe('A2');
  });

  it('parseCanDoMastery отбрасывает мусор и клампит 0–3; блок промпта содержит цель, фразы, сцену и карту', () => {
    expect(parseCanDoMastery({ a1_greet: 7, nope: 3, a1_intro: 'x', a2_plans: -1 })).toEqual({ a1_greet: 3, a2_plans: 0 });
    const goal = pickNextGoal({}, 'A1')!;
    const block = renderCanDoGoalBlock(goal, {}, canDoProgress({}));
    expect(block).toContain('CURRENT SPEAKING GOAL');
    expect(block).toContain('a1_greet');
    expect(block).toContain('Hi, how are you?');
    expect(block).toContain('start_scene("first_meeting")');
    expect(block).toContain('0 of 60 goals closed');
  });
});

describe('память: mastery цели только растёт и пишется разбором', () => {
  it('applyGoalProgress: рост, не убывание, неизвестная цель игнорируется', () => {
    expect(applyGoalProgress({}, { goalId: 'a1_greet', mastery: 2 })).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({ a1_greet: 2 }, { goalId: 'a1_greet', mastery: 1 })).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({ a1_greet: 2 }, { goalId: 'ghost', mastery: 3 })).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({}, null)).toEqual({});
  });

  it('mergeTutorMemory переносит mastery в память', () => {
    const prev = parseTutorMemory({ callCount: 1, goalMastery: { a1_greet: 1 } });
    const next = mergeTutorMemory(prev, { goalProgress: { goalId: 'a1_greet', mastery: 3 }, nowMs: 1_800_000_000_000 });
    expect(next.goalMastery).toEqual({ a1_greet: 3 });
  });
});

// Карта речевых целей учителя (ступень 2 плана обучения, владелец 2026-08-17).

import {
  CAN_DO_GOALS,
  CAN_DO_GOALS_TOTAL,
  MAX_TEXT_LANGS,
  canDoProgress,
  levelFromMastery,
  parseCanDoMastery,
  planUpcomingLessons,
  pickNextGoal,
  renderCanDoGoalBlock,
} from './max_voice_can_do_goals';
import { applyGoalProgress, mergeTutorMemory, parseTutorMemory, tutorLessonTypeFor } from './max_voice_tutor_memory';
import { B2_GOAL_IDS } from './max_voice_can_do_goals_b2';

describe('карта целей: контент', () => {
  it('78 целей: 20 A1 / 22 A2 / 18 B1 / 18 B2, уникальные id и полный контент', () => {
    expect(CAN_DO_GOALS_TOTAL).toBe(78);
    const by = (l: string) => CAN_DO_GOALS.filter((g) => g.level === l).length;
    expect([by('A1'), by('A2'), by('B1'), by('B2')]).toEqual([20, 22, 18, 18]);
    expect(new Set(CAN_DO_GOALS.map((g) => g.id)).size).toBe(78);
    for (const g of CAN_DO_GOALS) {
      expect(g.phrases.length).toBeGreaterThanOrEqual(3);
      expect(g.phrases.length).toBeLessThanOrEqual(4);
      expect(g.title.en && g.title.ru && g.title.uk).toBeTruthy();
      MAX_TEXT_LANGS.forEach((lang) => expect(g.title[lang].trim()).not.toBe(''));
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
    expect(pickNextGoal({}, 'B2')!.level).toBe('B2');
    const all = Object.fromEntries(CAN_DO_GOALS.map((g) => [g.id, 3]));
    expect(pickNextGoal(all, 'A1')).toBeNull();
  });

  it('прогресс считает закрытые (3) по уровням; уровень по 80 % закрытых целей', () => {
    const m = { a1_greet: 3, a1_intro: 3, a2_past_day: 3, a2_plans: 1 };
    const p = canDoProgress(m);
    expect(p.done).toBe(3);
    expect(p.total).toBe(78);
    expect(p.byLevel.A1.done).toBe(2);
    expect(p.byLevel.A2.done).toBe(1);
    expect(levelFromMastery(m, 'A1')).toBe('A1');
    const a1Closed = Object.fromEntries(CAN_DO_GOALS.filter((g) => g.level === 'A1').slice(0, 16).map((g) => [g.id, 3])); // 16/20 = 80 %
    expect(levelFromMastery(a1Closed, 'A1')).toBe('A2');
  });

  it('owns the exact B2 curriculum instead of falling back to B1', () => {
    const goals = CAN_DO_GOALS.filter((goal) => goal.level === 'B2');
    expect(goals.map((goal) => goal.id)).toEqual(B2_GOAL_IDS);
    expect(new Set(goals.flatMap((goal) => goal.phrases)).size).toBeGreaterThanOrEqual(54);
    goals.forEach((goal) => {
      expect(goal.phrases.length).toBeGreaterThanOrEqual(3);
      expect(goal.sceneIds.length).toBeGreaterThan(0);
    });
    expect(pickNextGoal({}, 'B2')?.level).toBe('B2');
  });

  it('никогда не отправляет ученика ниже исходного CEFR после первой закрытой цели', () => {
    expect(levelFromMastery({ a2_past_day: 3 }, 'A2')).toBe('A2');
    expect(levelFromMastery({ b1_experience: 3 }, 'B1')).toBe('B1');
    expect(levelFromMastery({ b1_experience: 3 }, 'B2')).toBe('B2');
  });

  it('parseCanDoMastery отбрасывает мусор и клампит 0–3; блок промпта содержит цель, фразы, сцену и карту', () => {
    expect(parseCanDoMastery({ a1_greet: 7, nope: 3, a1_intro: 'x', a2_plans: -1 })).toEqual({ a1_greet: 3, a2_plans: 0 });
    const goal = pickNextGoal({}, 'A1')!;
    const block = renderCanDoGoalBlock(goal, {}, canDoProgress({}));
    expect(block).toContain('CURRENT SPEAKING GOAL');
    expect(block).toContain('a1_greet');
    expect(block).toContain('Hi, how are you?');
    expect(block).toContain('start_scene("first_meeting")');
    expect(block).not.toContain('0 of 60 goals closed');
    expect(block).toContain('Do not announce an aggregate count of completed goals');
  });
});

describe('память: mastery цели только растёт и пишется разбором', () => {
  it('applyGoalProgress: один урок даёт не больше одной ступени, прогресс не убывает', () => {
    expect(applyGoalProgress({}, { goalId: 'a1_greet', mastery: 3 })).toEqual({ a1_greet: 1 });
    expect(applyGoalProgress({ a1_greet: 2 }, { goalId: 'a1_greet', mastery: 1 })).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({ a1_greet: 2 }, { goalId: 'ghost', mastery: 3 })).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({}, null)).toEqual({});
  });

  it('mastery 3 требует предыдущих доказательств и выполненной сцены переноса', () => {
    expect(applyGoalProgress({ a1_greet: 1 }, { goalId: 'a1_greet', mastery: 3 }, 'done')).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({ a1_greet: 2 }, { goalId: 'a1_greet', mastery: 3 }, 'partial')).toEqual({ a1_greet: 2 });
    expect(applyGoalProgress({ a1_greet: 2 }, {
      goalId: 'a1_greet', mastery: 3, evidence: 'scene', sceneId: 'first_meeting',
    }, 'done')).toEqual({ a1_greet: 3 });
  });

  it('mergeTutorMemory переносит mastery в память', () => {
    const prev = parseTutorMemory({ callCount: 1, goalMastery: { a1_greet: 1 } });
    const next = mergeTutorMemory(prev, { goalProgress: { goalId: 'a1_greet', mastery: 3 }, nowMs: 1_800_000_000_000 });
    expect(next.goalMastery).toEqual({ a1_greet: 2 });
  });

  it('сервер игнорирует прогресс другой известной цели вместо текущей', () => {
    const prev = parseTutorMemory({ callCount: 1, lastCefr: 'A1', goalMastery: { a1_greet: 1 } });
    const next = mergeTutorMemory(prev, {
      goalProgress: { goalId: 'a1_intro', mastery: 3 }, sceneOutcome: 'done', cefr: 'A1', nowMs: 1_800_000_000_000,
    });
    expect(next.goalMastery).toEqual({ a1_greet: 1 });
  });
});

describe('план ближайших уроков (ступень 3, детерминированный)', () => {
  it('5 слотов: типы чередуются, цель держится ~2 урока, потом следующая; free_talk цель не двигает', () => {
    const plan = planUpcomingLessons({}, 'A1', 0, 5, tutorLessonTypeFor);
    expect(plan.map((p) => p.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.map((p) => p.lessonType)).toEqual(['new_material', 'review_and_scene', 'free_talk', 'new_material', 'review_and_scene']);
    expect(plan[0].goal!.id).toBe('a1_greet');
    expect(plan[1].goal!.id).toBe('a1_greet');
    expect(plan[2].goal!.id).toBe('a1_intro'); // после review-слота цель «закрыта» в симуляции
    expect(plan[4].goal!.id).toBe('a1_ask_name');
  });

  it('все цели закрыты → слоты без цели, но с типами', () => {
    const all = Object.fromEntries(CAN_DO_GOALS.map((g) => [g.id, 3]));
    const plan = planUpcomingLessons(all, 'B1', 7, 3, tutorLessonTypeFor);
    expect(plan.every((p) => p.goal === null)).toBe(true);
    expect(plan[0].lessonType).toBe(tutorLessonTypeFor(7));
  });
});

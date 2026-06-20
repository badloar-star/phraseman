import { buildCompassDay, decideDayType } from '../app/compass/compass_brain';
import type { CompassSnapshot } from '../app/compass/signal_bus';

function snap(partial: Partial<CompassSnapshot>): CompassSnapshot {
  return {
    mistakes: [],
    mistakesByLesson: {},
    trainer: null,
    posMastery: [],
    planDay: null,
    passedLessons: [],
    collectedAtMs: 1_000_000,
    ...partial,
  };
}

const NOW = 1_000_000;

describe('compass_brain — выбор типа дня (правила)', () => {
  it('всё спокойно → лёгкий день', () => {
    expect(decideDayType(snap({}), NOW)).toBe('easy');
  });

  it('план застрял (carryover) → день-возврат', () => {
    const s = snap({ planDay: { isCarryover: true, dayIndex: 5 } as any });
    expect(decideDayType(s, NOW)).toBe('comeback');
  });

  it('много ошибок → день-ремонт', () => {
    const s = snap({ mistakesByLesson: { 3: 4, 5: 3 } });
    expect(decideDayType(s, NOW)).toBe('repair');
  });

  it('есть слабая тема → день-погружение', () => {
    const s = snap({ posMastery: [{ category: 'article', level: 1 } as any] });
    expect(decideDayType(s, NOW)).toBe('deep_dive');
  });
});

describe('compass_brain — сборка дня', () => {
  it('день-погружение зовёт в самую болящую непройденную сессию (мало ошибок, есть слабая тема)', () => {
    // total ошибок < порога ремонта (6), чтобы день был именно погружением
    const s = snap({
      posMastery: [{ category: 'article', level: 1 } as any],
      mistakesByLesson: { 9: 3, 2: 1 },
      passedLessons: [2],
    });
    const day = buildCompassDay(s, NOW);
    expect(day.type).toBe('deep_dive');
    expect(day.lessonInviteId).toBe(9);
    expect(day.tasks.find((t) => t.kind === 'lesson_dive')?.focus).toBe('9');
    expect(day.tasks.length).toBeLessThanOrEqual(5);
  });

  it('тяжёлые ошибки побеждают слабую тему (ремонт важнее погружения)', () => {
    const s = snap({
      posMastery: [{ category: 'article', level: 1 } as any],
      mistakesByLesson: { 9: 8 },
      passedLessons: [],
    });
    expect(buildCompassDay(s, NOW).type).toBe('repair');
  });

  it('не зовёт в уже пройденную сессию', () => {
    const s = snap({
      posMastery: [{ category: 'article', level: 1 } as any],
      mistakesByLesson: { 9: 5 },
      passedLessons: [9],
    });
    const day = buildCompassDay(s, NOW);
    expect(day.lessonInviteId).toBeUndefined();
  });

  it('лёгкий день с планом → продолжить план', () => {
    const s = snap({ planDay: { dayIndex: 12, isCarryover: false } as any });
    const day = buildCompassDay(s, NOW);
    expect(day.type).toBe('easy');
    expect(day.planDayIndex).toBe(12);
    expect(day.tasks.some((t) => t.kind === 'plan_continue')).toBe(true);
  });

  it('день-ремонт ставит разбор ошибок первым', () => {
    const s = snap({ mistakesByLesson: { 3: 8 }, trainer: { totalDue: 5 } as any });
    const day = buildCompassDay(s, NOW);
    expect(day.type).toBe('repair');
    expect(day.tasks[0].kind).toBe('mistake_repair');
  });
});

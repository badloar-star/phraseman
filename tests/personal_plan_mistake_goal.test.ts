import {
  nextTaskAfterVisibleSlice,
  type PlanDay,
} from '../app/personal_plan_catalog';

const day: PlanDay = {
  id: 'voyazh_d001',
  dayIndex: 1,
  weekIndex: 1,
  title: 'День 1',
  focus: 'Фокус',
  phraseGoal: 'Цель',
  theory: 'Теория',
  tasks: [],
};

describe('personal plan mistake goal', () => {
  test('adds one Errors task only when at least five items are ready', () => {
    expect(nextTaskAfterVisibleSlice(day, 5, 0, {
      mistakePracticeReadyCount: 4,
    })).toBeNull();

    expect(nextTaskAfterVisibleSlice(day, 5, 0, {
      mistakePracticeReadyCount: 8,
    })).toMatchObject({
      kind: 'mistake_practice',
      title: 'Исправь ошибки',
      destination: { type: 'mistake_practice', length: 5 },
    });
  });

  test('adds only one unified optional Errors task', () => {
    const first = nextTaskAfterVisibleSlice(day, 5, 0, {
      mistakePracticeReadyCount: 8,
    });
    const second = nextTaskAfterVisibleSlice(day, 5, 1, {
      mistakePracticeReadyCount: 8,
    });

    expect(first?.kind).toBe('mistake_practice');
    expect(second).toBeNull();
  });
});

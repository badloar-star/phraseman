import type { TrainerDashboard } from '../app/trainer_store';
import {
  buildPracticeHallTrend,
  clampPracticeHallTrendOffset,
  practiceHallDurationMinutes,
  selectPracticeHallQueue,
  visiblePracticeHallTrendWindow,
} from '../app/trainer_practice_hall';

const dashboard = (due: Partial<TrainerDashboard['due']>, nextQueue: TrainerDashboard['nextQueue']): TrainerDashboard => ({
  due: { words: 0, phrases: 0, arena: 0, ...due },
  totalDue: Object.values(due).reduce((sum, value) => sum + (value ?? 0), 0),
  overdue: 0,
  totalTracked: 0,
  active: 0,
  future: 0,
  archived: 0,
  hardestQueue: null,
  hardestMistakes: 0,
  hardestCategory: null,
  hardestCategoryMistakes: 0,
  hardestCategoryPriority: 0,
  hardestCategoryRecovery: 0,
  memoryScore: 0,
  posMasteryXp: 0,
  posMasteryTop: [],
  nextQueue,
});

describe('practice hall selection policy', () => {
  it('uses the dashboard recommendation when that queue still has due errors', () => {
    expect(selectPracticeHallQueue(dashboard({ words: 4, phrases: 2 }, 'words'))).toBe('words');
  });

  it('falls back in a stable phrase, word, arena order when the recommendation is unavailable', () => {
    expect(selectPracticeHallQueue(dashboard({ words: 4, arena: 2 }, 'phrases'))).toBe('words');
    expect(selectPracticeHallQueue(dashboard({ phrases: 2, arena: 2 }, null))).toBe('phrases');
  });

  it('returns no route for an empty queue and gives a bounded realistic duration', () => {
    expect(selectPracticeHallQueue(dashboard({}, null))).toBeNull();
    expect(practiceHallDurationMinutes(1)).toBe(1);
    expect(practiceHallDurationMinutes(12)).toBe(4);
    expect(practiceHallDurationMinutes(99)).toBe(12);
  });
});

describe('practice hall activity trend', () => {
  it('keeps dated activity values and omits future days', () => {
    expect(buildPracticeHallTrend([
      { date: '2026-07-10', active: true },
      { date: '2026-07-11', active: false },
      { date: '2026-07-12', active: true, future: true },
    ])).toEqual([
      { date: '2026-07-10', value: 1 },
      { date: '2026-07-11', value: 0 },
    ]);
  });

  it('keeps the selected date range bounded while panning through history', () => {
    const trend = Array.from({ length: 30 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, '0')}`, value: index % 2 as 0 | 1 }));
    expect(clampPracticeHallTrendOffset(30, 7, 99)).toBe(23);
    expect(clampPracticeHallTrendOffset(30, 7, -1)).toBe(0);
    expect(visiblePracticeHallTrendWindow(trend, 7, 23).map((point) => point.date)).toEqual([
      '2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30',
    ]);
  });
});

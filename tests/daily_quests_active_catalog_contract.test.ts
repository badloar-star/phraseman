import { getTodayTasks, getTodayTasksSafe } from '../app/daily_tasks';

const BANNED_TYPES = new Set([
  'total_answers', 'lesson_no_mistakes', 'open_theory', 'flashcard_view', 'flashcard_flip',
  'daily_phrase_read', 'morning_session', 'evening_session', 'early_all_done', 'last_chance',
  'energy_spend', 'diagnostic_complete', 'different_lessons', 'streak_freeze_use', 'correct_streak',
  'weekend_marathon', 'mentor_friend', 'perfect_big_lesson',
]);

test('daily quests expose exactly three verified, free-safe challenge families', () => {
  const tasks = getTodayTasks();

  expect(tasks).toHaveLength(3);
  expect(tasks.filter((task) => BANNED_TYPES.has(task.type)).map((task) => task.type)).toEqual([]);
  expect(new Set(tasks.map((task) => task.type)).size).toBe(3);
});

test('every rotation day keeps exactly three distinct, vetted quest families', () => {
  jest.useFakeTimers();
  try {
    for (let day = 1; day <= 31; day += 1) {
      jest.setSystemTime(new Date(`2026-08-${String(day).padStart(2, '0')}T12:00:00Z`));
      const tasks = getTodayTasks();
      expect(tasks).toHaveLength(3);
      expect(tasks.filter((task) => BANNED_TYPES.has(task.type))).toEqual([]);
      expect(new Set(tasks.map((task) => task.type)).size).toBe(3);
    }
  } finally {
    jest.useRealTimers();
  }
});

test('runtime substitutions never reintroduce a retired daily task', async () => {
  const tasks = await getTodayTasksSafe();

  expect(tasks).toHaveLength(3);
  expect(tasks.filter((task) => BANNED_TYPES.has(task.type)).map((task) => task.type)).toEqual([]);
});

test('the one daily reroll is free and weekends do not add a fourth quest', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app', 'daily_tasks.ts'), 'utf8');

  expect(source).toContain('export const DAILY_TASK_REROLL_COST_SHARDS = 0;');
  expect(source).not.toContain('appendWeekendMarathonTask(');
});

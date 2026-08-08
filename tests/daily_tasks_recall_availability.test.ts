import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayTasksSafe } from '../app/daily_tasks';
import type { RecallItem } from '../app/active_recall';
import { activeRecallItemsKey, dailyTasksProgressKey } from '../app/target_storage_keys';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => true),
}));

describe('daily tasks recall availability', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Day 2 of the active rotation contains ra1 (5 correct recall answers).
    jest.setSystemTime(new Date('2026-05-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show a recall task when there are no due review cards', async () => {
    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).not.toContain('ra1');
    expect(tasks.some((task) => task.type === 'recall_answers')).toBe(false);
    expect(new Set(tasks.map((task) => task.type))).toEqual(new Set([
      'lesson_complete',
      'total_answers',
      'correct_streak',
    ]));
  });

  it('replaces a five-card recall task when only three cards are available', async () => {
    const dueItems = ['one', 'two', 'three'].map((phrase, index): RecallItem => ({
      phrase,
      correctAnswer: phrase,
      correctAnswerUK: phrase,
      lessonId: 1,
      source: 'lesson',
      errorCount: 1,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      createdAt: Date.now() - (index + 2) * 24 * 60 * 60 * 1000,
      lastReviewed: Date.now() - 2 * 24 * 60 * 60 * 1000,
      nextDue: Date.now() - (index + 1) * 60 * 1000,
    }));
    await AsyncStorage.setItem(activeRecallItemsKey('en'), JSON.stringify(dueItems));

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).not.toContain('ra1');
    expect(tasks.some((task) => task.type === 'recall_answers')).toBe(false);
  });

  it('keeps a recall task when saved progress plus due cards can reach its target', async () => {
    const dueItem: RecallItem = {
      phrase: 'I am ready',
      correctAnswer: 'Я готов',
      correctAnswerUK: 'Я готовий',
      lessonId: 1,
      source: 'lesson',
      errorCount: 1,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      lastReviewed: Date.now() - 2 * 24 * 60 * 60 * 1000,
      nextDue: Date.now() - 60 * 1000,
    };
    await AsyncStorage.multiSet([
      [activeRecallItemsKey('en'), JSON.stringify([dueItem, { ...dueItem, phrase: 'I can continue' }, { ...dueItem, phrase: 'I will finish' }])],
      [dailyTasksProgressKey('2026-05-02', 'en'), JSON.stringify([
        { taskId: 'ra1', current: 2, completed: false, claimed: false },
      ])],
    ]);

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).toContain('ra1');
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayTasksSafe } from '../app/daily_tasks';
import { countDueItemsToday, type RecallItem } from '../app/active_recall';
import { activeRecallItemsKey } from '../app/target_storage_keys';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => true),
}));

describe('daily tasks recall availability', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-24T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show recall session task when there are no due review cards', async () => {
    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).not.toContain('rs1');
    expect(tasks.some((task) => task.type === 'recall_session')).toBe(false);
  });

  it('keeps the active recall-answer task when the review queue has enough due cards', async () => {
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
    await AsyncStorage.setItem(
      activeRecallItemsKey('en'),
      JSON.stringify(
        Array.from({ length: 5 }, (_, index) => ({
          ...dueItem,
          phrase: `${dueItem.phrase} ${index + 1}`,
        })),
      ),
    );
    expect(await countDueItemsToday('en')).toBe(5);

    const tasks = await getTodayTasksSafe('en');

    expect(tasks.map((task) => task.id)).toContain('ra1');
  });
});

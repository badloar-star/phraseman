import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAllItems,
  markReviewed,
  recordMistake,
} from '../app/active_recall';
import { activeRecallItemsKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn(async () => undefined) }));

const DAY = 24 * 60 * 60 * 1000;
const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(storage)) delete storage[key];
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
});

describe('active recall learning outcome persistence', () => {
  it('assigns opaque analytics item ids without deriving them from phrase text', async () => {
    await recordMistake('I am ready', 'Я готов', 1);
    const [item] = await getAllItems();

    expect(item.analyticsItemId).toMatch(/^[A-Za-z0-9_-]{12,120}$/);
    expect(item.analyticsItemId).not.toContain('ready');
  });

  it('idempotently migrates legacy items and repairs colliding ids', async () => {
    const now = Date.now();
    storage[activeRecallItemsKey('en')] = JSON.stringify([
      {
        phrase: 'First phrase', correctAnswer: 'Первая', lessonId: 1,
        analyticsItemId: 'collision_id', errorCount: 1, repetitions: 0,
        interval: 1, easeFactor: 2.5, createdAt: now, lastReviewed: now, nextDue: now + DAY,
      },
      {
        phrase: 'Second phrase', correctAnswer: 'Вторая', lessonId: 2,
        analyticsItemId: 'collision_id', errorCount: 1, repetitions: 0,
        interval: 1, easeFactor: 2.5, createdAt: now, lastReviewed: now, nextDue: now + DAY,
      },
      {
        phrase: 'Legacy phrase', correctAnswer: 'Старая', lessonId: 3,
        errorCount: 1, repetitions: 0, interval: 1, easeFactor: 2.5,
        createdAt: now, lastReviewed: now, nextDue: now + DAY,
      },
    ]);

    const firstRead = await getAllItems('en');
    const firstIds = firstRead.map((item) => item.analyticsItemId);
    const secondRead = await getAllItems('en');

    expect(new Set(firstIds).size).toBe(3);
    expect(secondRead.map((item) => item.analyticsItemId)).toEqual(firstIds);
    expect(JSON.parse(storage[activeRecallItemsKey('en')]).every((item: { analyticsItemId?: string }) => item.analyticsItemId)).toBe(true);
  });

  it('returns a privacy-safe persisted transition based on actual elapsed time', async () => {
    const exposureAt = Date.UTC(2026, 0, 1, 12);
    const reviewedAt = exposureAt + 7 * DAY;
    jest.spyOn(Date, 'now').mockReturnValue(exposureAt);
    await recordMistake('Delayed phrase', 'Отложенная', 4);

    jest.spyOn(Date, 'now').mockReturnValue(reviewedAt);
    const transition = await markReviewed('Delayed phrase', true, undefined, 'en');

    expect(transition).toEqual(expect.objectContaining({
      lessonId: 4,
      correct: true,
      actualDelayBucket: 'd7_to_d29',
      previousMasteryState: 'learning',
      nextMasteryState: 'mastered',
      masteryTransition: 'mastered',
      previousRepetitions: 0,
      nextRepetitions: 1,
    }));
    expect(JSON.stringify(transition)).not.toContain('Delayed phrase');
    expect(JSON.stringify(transition)).not.toContain('Отложенная');
    jest.restoreAllMocks();
  });

  it('does not return an analytics transition when persistence fails', async () => {
    await recordMistake('Storage failure phrase', 'Ошибка', 5);
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk_full'));

    await expect(markReviewed('Storage failure phrase', true)).rejects.toThrow('disk_full');
  });

  it('returns mastered evidence to learning when the item is missed outside review', async () => {
    const exposureAt = Date.UTC(2026, 0, 1, 12);
    jest.spyOn(Date, 'now').mockReturnValue(exposureAt);
    await recordMistake('Mastered then missed', 'Освоено и забыто', 6);
    jest.spyOn(Date, 'now').mockReturnValue(exposureAt + 7 * DAY);
    await markReviewed('Mastered then missed', true);
    expect((await getAllItems())[0].masteryState).toBe('mastered');

    const missedAt = exposureAt + 8 * DAY;
    jest.spyOn(Date, 'now').mockReturnValue(missedAt);
    await recordMistake('Mastered then missed', 'Освоено и забыто', 6);
    const [item] = await getAllItems();

    expect(item.masteryState).toBe('learning');
    expect(item.lastLapsedAtMs).toBe(missedAt);
    jest.restoreAllMocks();
  });

  it('serializes concurrent recordMistake mutations so neither item is lost', async () => {
    await Promise.all([
      recordMistake('Concurrent one', 'Один', 1),
      recordMistake('Concurrent two', 'Два', 2),
    ]);

    expect((await getAllItems()).map((item) => item.phrase).sort()).toEqual([
      'Concurrent one',
      'Concurrent two',
    ]);
  });
});

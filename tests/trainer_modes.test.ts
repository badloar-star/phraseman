import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainerItems, getTrainerModeCounts, SESSION_LIMIT } from '../app/active_recall';
import { getFreeSessionsLeftToday } from '../app/trainer_session';
import { logMistake, getTopMistakePhrases, clearMistakeLog, getWeakPhrases, flushMistakeLog } from '../app/mistake_log';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const NOW = Date.now();
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

// ── Helper: seed recall items ─────────────────────────────────────────────────
const MS_DAY = 24 * 60 * 60 * 1000;

const makeItem = (override: Partial<{
  phrase: string; lessonId: number; easeFactor: number; errorCount: number;
  nextDue: number; createdAt: number; repetitions: number;
}>) => ({
  phrase: override.phrase ?? 'test phrase',
  correctAnswer: 'тестовая фраза',
  lessonId: override.lessonId ?? 1,
  source: 'lesson' as const,
  errorCount: override.errorCount ?? 0,
  repetitions: override.repetitions ?? 0,
  interval: 1,
  easeFactor: override.easeFactor ?? 2.5,
  createdAt: override.createdAt ?? NOW - 10 * MS_DAY,
  lastReviewed: NOW - 5 * MS_DAY,
  nextDue: override.nextDue ?? NOW + MS_DAY,
});

const seedItems = (items: ReturnType<typeof makeItem>[]) => {
  mockStorage.active_recall_items = JSON.stringify(items);
};

// ── Trainer mode tests ────────────────────────────────────────────────────────
describe('getTrainerItems — due mode', () => {
  it('returns only items due today (nextDue ≤ end of today)', async () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    seedItems([
      makeItem({ phrase: 'due_now', nextDue: NOW - 1000 }),
      makeItem({ phrase: 'future', nextDue: NOW + 48 * MS_DAY }),
    ]);
    const items = await getTrainerItems('due', 10);
    expect(items.map((i) => i.phrase)).toContain('due_now');
    expect(items.map((i) => i.phrase)).not.toContain('future');
  });

  it('respects session limit', async () => {
    seedItems(Array.from({ length: 20 }, (_, i) => makeItem({ phrase: `phrase_${i}`, nextDue: NOW - 1000 })));
    const items = await getTrainerItems('due', SESSION_LIMIT);
    expect(items.length).toBeLessThanOrEqual(SESSION_LIMIT);
  });
});

describe('getTrainerItems — fresh mode', () => {
  it('returns recently added items with low repetitions', async () => {
    const recent = makeItem({ phrase: 'fresh_one', createdAt: NOW - 2 * MS_DAY, repetitions: 0 });
    const old = makeItem({ phrase: 'old_one', createdAt: NOW - 30 * MS_DAY, repetitions: 0 });
    seedItems([recent, old]);
    const items = await getTrainerItems('fresh', 10);
    expect(items.map((i) => i.phrase)).toContain('fresh_one');
    expect(items.map((i) => i.phrase)).not.toContain('old_one');
  });
});

describe('getTrainerItems — weak mode', () => {
  it('returns items with easeFactor ≤ 1.7, sorted ASC', async () => {
    seedItems([
      makeItem({ phrase: 'weak_1', easeFactor: 1.3 }),
      makeItem({ phrase: 'strong', easeFactor: 2.5 }),
      makeItem({ phrase: 'weak_2', easeFactor: 1.6 }),
    ]);
    const items = await getTrainerItems('weak', 10);
    const phrases = items.map((i) => i.phrase);
    expect(phrases).toContain('weak_1');
    expect(phrases).toContain('weak_2');
    expect(phrases).not.toContain('strong');
    // Sorted ASC by easeFactor
    if (phrases.includes('weak_1') && phrases.includes('weak_2')) {
      expect(phrases.indexOf('weak_1')).toBeLessThan(phrases.indexOf('weak_2'));
    }
  });
});

describe('getTrainerItems — hard mode', () => {
  it('returns items with errorCount ≥ 3', async () => {
    seedItems([
      makeItem({ phrase: 'hard', errorCount: 5 }),
      makeItem({ phrase: 'easy', errorCount: 1 }),
    ]);
    const items = await getTrainerItems('hard', 10);
    expect(items.map((i) => i.phrase)).toContain('hard');
    expect(items.map((i) => i.phrase)).not.toContain('easy');
  });
});

describe('getTrainerItems — by_topic mode', () => {
  it('filters by lessonId', async () => {
    seedItems([
      makeItem({ phrase: 'lesson5', lessonId: 5 }),
      makeItem({ phrase: 'lesson7', lessonId: 7 }),
    ]);
    const items = await getTrainerItems('by_topic', 10, 5);
    expect(items.map((i) => i.phrase)).toContain('lesson5');
    expect(items.map((i) => i.phrase)).not.toContain('lesson7');
  });
});

describe('getTrainerModeCounts', () => {
  it('returns counts for all modes', async () => {
    seedItems([
      makeItem({ phrase: 'due_item', nextDue: NOW - 1000 }),
      makeItem({ phrase: 'fresh_item', createdAt: NOW - 1 * MS_DAY, repetitions: 0 }),
      makeItem({ phrase: 'weak_item', easeFactor: 1.4 }),
    ]);
    const counts = await getTrainerModeCounts();
    expect(counts.due).toBeGreaterThanOrEqual(1);
    expect(counts.fresh).toBeGreaterThanOrEqual(1);
    expect(typeof counts.weak).toBe('number');
    expect(typeof counts.smart_mix).toBe('number');
  });
});

describe('trainer — free session limit', () => {
  it('starts with 1 session available', async () => {
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });

  it('returns 0 after session marked used today', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockStorage.trainer_free_session_v1 = JSON.stringify({ date: today, count: 1 });
    await expect(getFreeSessionsLeftToday()).resolves.toBe(0);
  });

  it('resets to 1 on a new day', async () => {
    mockStorage.trainer_free_session_v1 = JSON.stringify({ date: '2000-01-01', count: 1 });
    await expect(getFreeSessionsLeftToday()).resolves.toBe(1);
  });
});

describe('mistake_log analytics', () => {
  beforeEach(async () => { await clearMistakeLog(); });

  it('logMistake stores entries and getTopMistakePhrases returns them', async () => {
    logMistake('pick up', 5, 'lesson', 'wrong_pick');
    logMistake('pick up', 5, 'quiz', 'wrong_pick');
    logMistake('let down', 3, 'lesson', 'wrong_pick');
    await flushMistakeLog();
    const top = await getTopMistakePhrases(5);
    const phrases = top.map((t) => t.phrase);
    expect(phrases).toContain('pick up');
    expect(top.find((t) => t.phrase === 'pick up')?.count).toBe(2);
  });

  it('getWeakPhrases filters by minCount', async () => {
    logMistake('once', 1, 'lesson', 'wrong_pick');
    logMistake('twice', 1, 'lesson', 'wrong_pick');
    logMistake('twice', 1, 'quiz', 'wrong_pick');
    await flushMistakeLog();
    const weak = await getWeakPhrases(10, 2);
    expect(weak).toContain('twice');
    expect(weak).not.toContain('once');
  });
});

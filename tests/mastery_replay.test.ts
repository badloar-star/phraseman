import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  isLessonFinishedOnce,
  markLessonFinishedOnce,
  executeReplay,
  MASTERY_REPLAY_BASE_SHARDS,
  MASTERY_REPLAY_PRICE_STEP_SHARDS,
  computeMasteryReplayPriceFromCount,
} from '../app/mastery';
import { emitAppEvent } from '../app/events';
import {
  masteryFinishedOnceKey,
  masteryReplayCountKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));

const mockStorage: Record<string, string> = {};
const ROOT = path.join(__dirname, '..');

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
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('mastery — finished_once flag', () => {
  it('isLessonFinishedOnce returns false when not finished', async () => {
    await expect(isLessonFinishedOnce(7)).resolves.toBe(false);
  });

  it('markLessonFinishedOnce sets the flag and reports firstTime on first call only', async () => {
    const r1 = await markLessonFinishedOnce(7);
    expect(r1.firstTime).toBe(true);
    await expect(isLessonFinishedOnce(7)).resolves.toBe(true);
    const r2 = await markLessonFinishedOnce(7);
    expect(r2.firstTime).toBe(false);
  });

  it('keeps French finished/replay flags outside legacy English mastery keys', async () => {
    mockStorage.shards_balance = '500';

    await expect(markLessonFinishedOnce(3, 'fr')).resolves.toEqual({ firstTime: true });
    expect(mockStorage[masteryFinishedOnceKey(3, 'fr')]).toBe('1');
    expect(mockStorage.lesson_finished_once_v1_3).toBeUndefined();
    expect(emitAppEvent).toHaveBeenCalledWith('lesson_finished_once', {
      lessonId: 3,
      studyTarget: 'fr',
    });

    const r = await executeReplay(3, false, 'fr');
    expect(r.ok).toBe(true);
    expect(mockStorage[masteryReplayCountKey(3, 'fr')]).toBe('1');
    expect(mockStorage.lesson_replay_count_v1_3).toBeUndefined();
    expect(emitAppEvent).toHaveBeenCalledWith('lesson_replay_started', {
      lessonId: 3,
      spent: MASTERY_REPLAY_BASE_SHARDS,
      studyTarget: 'fr',
    });
  });
});

describe('mastery — executeReplay', () => {
  it('rejects replay when lesson is not finished_once yet', async () => {
    mockStorage.shards_balance = '500';
    const r = await executeReplay(3, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_finished_yet');
  });

  it('non-premium with sufficient balance: spends replay price, keeps lesson progress, returns ok', async () => {
    const savedProg = JSON.stringify(['correct', 'wrong', 'correct']);
    mockStorage.shards_balance = '500';
    mockStorage.lesson_finished_once_v1_3 = '1';
    mockStorage.lesson3_progress = savedProg;
    mockStorage.lesson3_cellIndex = '12';
    mockStorage.lesson3_phraseOrder = JSON.stringify([1, 0, 2]);
    mockStorage.lesson3_errorReplayQueue = '[]';

    const r = await executeReplay(3, false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spent).toBe(MASTERY_REPLAY_BASE_SHARDS);
    expect(mockStorage.shards_balance).toBe(String(500 - MASTERY_REPLAY_BASE_SHARDS));
    expect(mockStorage.lesson3_progress).toBe(savedProg);
    expect(mockStorage.lesson3_cellIndex).toBe('12');
    expect(mockStorage.lesson3_phraseOrder).toBe(JSON.stringify([1, 0, 2]));
    expect(mockStorage.lesson3_errorReplayQueue).toBe('[]');
    expect(mockStorage.lesson_replay_count_v1_3).toBe('1');
  });

  it('second non-premium replay uses base + step and increments count', async () => {
    mockStorage.shards_balance = '500';
    mockStorage.lesson_finished_once_v1_3 = '1';
    mockStorage.lesson_replay_count_v1_3 = '1';
    mockStorage.lesson3_progress = JSON.stringify(['correct']);
    const expected = computeMasteryReplayPriceFromCount(1);
    expect(expected).toBe(MASTERY_REPLAY_BASE_SHARDS + MASTERY_REPLAY_PRICE_STEP_SHARDS);
    const r = await executeReplay(3, false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spent).toBe(expected);
    expect(mockStorage.shards_balance).toBe(String(500 - expected));
    expect(mockStorage.lesson_replay_count_v1_3).toBe('2');
  });

  it('non-premium with insufficient balance: returns insufficient_shards, no progress reset', async () => {
    mockStorage.shards_balance = '3';
    mockStorage.lesson_finished_once_v1_3 = '1';
    mockStorage.lesson3_progress = JSON.stringify(['correct']);
    const r = await executeReplay(3, false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('insufficient_shards');
    expect(mockStorage.shards_balance).toBe('3');
    expect(mockStorage.lesson3_progress).toBe(JSON.stringify(['correct']));
    expect(mockStorage.lesson_replay_count_v1_3).toBeUndefined();
  });

  it('premium: free replay (no spend), keeps lesson progress, returns ok with spent=0', async () => {
    const savedProg = JSON.stringify(['correct']);
    mockStorage.shards_balance = '500';
    mockStorage.lesson_finished_once_v1_3 = '1';
    mockStorage.lesson3_progress = savedProg;
    const r = await executeReplay(3, true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spent).toBe(0);
    expect(mockStorage.shards_balance).toBe('500');
    expect(mockStorage.lesson3_progress).toBe(savedProg);
    expect(mockStorage.lesson_replay_count_v1_3).toBe('1');
  });

  it('rejects bad lessonId', async () => {
    const r1 = await executeReplay(0, true);
    expect(r1.ok).toBe(false);
    const r2 = await executeReplay(NaN, true);
    expect(r2.ok).toBe(false);
  });

  it('filters mastery lesson-menu events by active study target', () => {
    const lessonMenuSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');
    const eventsSource = fs.readFileSync(path.join(ROOT, 'app', 'events.ts'), 'utf8');

    expect(eventsSource).toContain('lesson_finished_once: { lessonId: number; studyTarget?: string }');
    expect(eventsSource).toContain('lesson_replay_started: { lessonId: number; spent: number; studyTarget?: string }');
    expect(lessonMenuSource).toContain("if ((payload.studyTarget ?? 'en') !== storageStudyTarget(studyTarget)) return");
    expect(lessonMenuSource).toContain("if ((payload?.studyTarget ?? 'en') !== storageStudyTarget(studyTarget)) return");
  });
});

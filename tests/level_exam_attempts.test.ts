import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activeLevelExamAttemptKey,
  clearActiveLevelExamAttempt,
  loadActiveLevelExamAttempt,
  normalizeLevelExamAttemptCount,
  persistActiveLevelExamAttempt,
  recordCompletedLevelExamAttemptOnce,
  recordLevelExamAttempt,
} from '../app/level_exam_attempts';
import { createLevelExamAttempt } from '../app/level_exam_attempt_state';
import { assertTargetKey, levelExamKey } from '../app/target_storage_keys';

describe('level exam attempt counter', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('starts visible attempts from one instead of zero', async () => {
    await expect(recordLevelExamAttempt('A1')).resolves.toBe(1);
    await expect(AsyncStorage.getItem(levelExamKey('A1', 'attempt_count'))).resolves.toBe('1');
  });

  it('increments every completed exam separately from perfect-pass medal count', async () => {
    await AsyncStorage.setItem(levelExamKey('A1', 'pass_count'), '0');

    await expect(recordLevelExamAttempt('A1')).resolves.toBe(1);
    await expect(recordLevelExamAttempt('A1')).resolves.toBe(2);

    await expect(AsyncStorage.getItem(levelExamKey('A1', 'attempt_count'))).resolves.toBe('2');
    await expect(AsyncStorage.getItem(levelExamKey('A1', 'pass_count'))).resolves.toBe('0');
  });

  it('normalizes corrupted stored counts before incrementing', async () => {
    expect(normalizeLevelExamAttemptCount(null)).toBe(0);
    expect(normalizeLevelExamAttemptCount('-4')).toBe(0);
    expect(normalizeLevelExamAttemptCount('oops')).toBe(0);
    expect(normalizeLevelExamAttemptCount('7')).toBe(7);
  });

  it('scopes French attempt counts and blocks raw target-sensitive keys', async () => {
    await expect(recordLevelExamAttempt('A1', 'fr')).resolves.toBe(1);

    const frenchKey = levelExamKey('A1', 'attempt_count', 'fr');
    expect(frenchKey).toBe('level_exams_v2::fr::level_exam_A1_attempt_count');
    await expect(AsyncStorage.getItem(frenchKey)).resolves.toBe('1');
    expect(() => assertTargetKey('level_exam_A1_attempt_count')).toThrow(/Raw target-sensitive key/);
  });

  it('round-trips active attempts in owner-scoped storage', async () => {
    const attempt = createLevelExamAttempt({
      energySpent: true,
      ownerStableUid: 'owner-a',
      startToken: 'start-a',
      level: 'A2',
      studyTarget: 'en',
      sourceLocale: 'ru',
      blueprintVersion: 2,
      seed: 'seed-a',
      orderedTaskIds: ['task-a'],
      scoredUnitIds: ['score-a'],
      startedAtMs: 1_000,
      durationMs: 780_000,
    });

    await persistActiveLevelExamAttempt(attempt);

    await expect(loadActiveLevelExamAttempt('owner-a', 'A2', 'en')).resolves.toEqual(attempt);
    await expect(loadActiveLevelExamAttempt('owner-b', 'A2', 'en')).resolves.toBeNull();
    expect(activeLevelExamAttemptKey('owner-a', 'A2', 'en'))
      .not.toBe(activeLevelExamAttemptKey('owner-b', 'A2', 'en'));

    await clearActiveLevelExamAttempt('owner-a', 'A2', 'en');
    await expect(loadActiveLevelExamAttempt('owner-a', 'A2', 'en')).resolves.toBeNull();
  });

  it('removes corrupt active-attempt snapshots instead of resuming them', async () => {
    const key = activeLevelExamAttemptKey('owner-a', 'A1', 'en');
    await AsyncStorage.setItem(key, JSON.stringify({ status: 'active', ownerStableUid: 'owner-a' }));

    await expect(loadActiveLevelExamAttempt('owner-a', 'A1', 'en')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
  });

  it('records a completed finish token exactly once under concurrent calls', async () => {
    const results = await Promise.all([
      recordCompletedLevelExamAttemptOnce('owner-a', 'A1', 'finish-token-a', 'en'),
      recordCompletedLevelExamAttemptOnce('owner-a', 'A1', 'finish-token-a', 'en'),
    ]);

    expect(results).toEqual([1, 1]);
    await expect(AsyncStorage.getItem(levelExamKey('A1', 'attempt_count'))).resolves.toBe('1');

    await expect(recordCompletedLevelExamAttemptOnce('owner-a', 'A1', 'finish-token-b', 'en'))
      .resolves.toBe(2);
  });
});

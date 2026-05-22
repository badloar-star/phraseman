import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeLevelExamAttemptCount,
  recordLevelExamAttempt,
} from '../app/level_exam_attempts';
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
});

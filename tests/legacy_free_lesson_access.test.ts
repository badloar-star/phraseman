import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deriveLegacyFreeLessonCap,
  migrateLegacyFreeLessonAccess,
  normalizeLegacyFreeLessonCap,
  readLegacyFreeLessonCap,
} from '../app/legacy_free_lesson_access';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  unlockedLessonsKey,
  type RuntimeStudyTarget,
} from '../app/target_storage_keys';

async function seedUnlocked(
  unlocked: number[],
  studyTarget: RuntimeStudyTarget = 'en',
): Promise<void> {
  await AsyncStorage.setItem(unlockedLessonsKey(studyTarget), JSON.stringify(unlocked));
}

describe('legacy free lesson access migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test.each([
    { unlocked: [1, 2, 3], expected: 3 },
    { unlocked: [1, 2, 3, 4, 5, 6], expected: 6 },
    { unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9], expected: 8 },
  ])('derives cap $expected from unlocked lessons', ({ unlocked, expected }) => {
    expect(deriveLegacyFreeLessonCap({
      persistedUnlocked: unlocked,
      scores: [],
      progressCounts: [],
      passCounts: [],
    })).toBe(expected);
  });

  test('uses score, progress, and pass-count evidence when unlocked_lessons is incomplete', () => {
    expect(deriveLegacyFreeLessonCap({
      persistedUnlocked: [1, 2, 3],
      scores: [0, 0, 0, 0.5],
      progressCounts: [0, 0, 0, 0, 1],
      passCounts: [0, 0, 0, 0, 0, 1],
    })).toBe(6);
  });

  test('normalizes cloud and storage values into the immutable 3..8 range', () => {
    expect(normalizeLegacyFreeLessonCap(null)).toBeNull();
    expect(normalizeLegacyFreeLessonCap('not-a-number')).toBeNull();
    expect(normalizeLegacyFreeLessonCap('2')).toBe(3);
    expect(normalizeLegacyFreeLessonCap('6')).toBe(6);
    expect(normalizeLegacyFreeLessonCap('99')).toBe(8);
  });

  test('finalizes cap 3 after a successful not_found restore', async () => {
    await expect(migrateLegacyFreeLessonAccess('not_found', 'en')).resolves.toEqual({
      status: 'finalized',
      cap: 3,
    });
    await expect(readLegacyFreeLessonCap('en')).resolves.toBe(3);
    await expect(AsyncStorage.getItem(legacyFreeLessonMigrationKey('en'))).resolves.toBe('complete');
  });

  test('keeps migration pending when restore failed and no evidence exists', async () => {
    await expect(migrateLegacyFreeLessonAccess('failed', 'en')).resolves.toEqual({
      status: 'pending',
      cap: null,
    });
    await expect(AsyncStorage.getItem(legacyFreeLessonCapKey('en'))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(legacyFreeLessonMigrationKey('en'))).resolves.toBeNull();
  });

  test('finalizes from meaningful local evidence even when restore failed', async () => {
    await AsyncStorage.multiSet([
      [unlockedLessonsKey('en'), JSON.stringify([1, 2, 3])],
      [lessonBestScoreKey(4, 'en'), '0.5'],
      [lessonProgressKey(5, 'en'), JSON.stringify(['correct'])],
      [lessonPassCountKey(6, 'en'), '1'],
    ]);

    await expect(migrateLegacyFreeLessonAccess('failed', 'en')).resolves.toEqual({
      status: 'finalized',
      cap: 6,
    });
  });

  test('never expands a completed cap after later Plus progress', async () => {
    await seedUnlocked([1, 2, 3, 4, 5]);
    await expect(migrateLegacyFreeLessonAccess('restored', 'en')).resolves.toEqual({
      status: 'finalized',
      cap: 5,
    });

    await seedUnlocked([1, 2, 3, 4, 5, 6, 7, 8]);
    await AsyncStorage.setItem(lessonBestScoreKey(8, 'en'), '5');

    await expect(migrateLegacyFreeLessonAccess('restored', 'en')).resolves.toEqual({
      status: 'already_final',
      cap: 5,
    });
    await expect(readLegacyFreeLessonCap('en')).resolves.toBe(5);
  });

  test('keeps English and French caps isolated', async () => {
    await seedUnlocked([1, 2, 3, 4, 5], 'en');
    await seedUnlocked([1, 2, 3, 4, 5, 6, 7], 'fr');

    await migrateLegacyFreeLessonAccess('restored', 'en');
    await migrateLegacyFreeLessonAccess('restored', 'fr');

    await expect(readLegacyFreeLessonCap('en')).resolves.toBe(5);
    await expect(readLegacyFreeLessonCap('fr')).resolves.toBe(7);
  });
});

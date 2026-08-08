import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLessonsTabInitialState,
  loadLessonsTabStateFromStorage,
} from '../app/lessons_tab_state';
import {
  legacyFreeLessonCapKey,
  lessonBestScoreKey,
  lessonProgressKey,
  levelExamKey,
  unlockedLessonsKey,
} from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null])),
  );
});

describe('Gustav lessons tab state target isolation', () => {
  it('loads French lesson and exam snapshot from scoped keys only', async () => {
    mockStorage[unlockedLessonsKey('fr')] = JSON.stringify([1, 2, 3]);
    mockStorage[legacyFreeLessonCapKey('fr')] = '7';
    mockStorage[lessonBestScoreKey(1, 'fr')] = '5';
    mockStorage[lessonProgressKey(2, 'fr')] = JSON.stringify(new Array(45).fill('correct'));
    mockStorage[levelExamKey('A1', 'pct', 'fr')] = '91';
    mockStorage[levelExamKey('A1', 'passed', 'fr')] = '1';
    mockStorage[levelExamKey('A1', 'best_pct', 'fr')] = '96';
    mockStorage[levelExamKey('A1', 'pass_count', 'fr')] = '2';

    mockStorage[unlockedLessonsKey('en')] = JSON.stringify([1, 9]);
    mockStorage[legacyFreeLessonCapKey('en')] = '5';
    mockStorage[lessonBestScoreKey(1, 'en')] = '2.5';
    mockStorage[levelExamKey('A1', 'passed', 'en')] = '0';

    const snap = await loadLessonsTabStateFromStorage('fr');

    expect(snap.persistedUnlocked).toEqual([1, 2, 3]);
    expect(snap.legacyFreeLessonCap).toBe(7);
    expect(snap.scores[0]).toBe(5);
    expect(snap.scores[1]).toBeGreaterThan(0);
    expect(snap.examResults.A1).toEqual({ pct: 91, passed: true });
    expect(snap.examBestPcts.A1).toBe(96);
    expect(snap.examPassCounts.A1).toBe(2);
    expect(getLessonsTabInitialState('fr')).toEqual(snap);
    expect(getLessonsTabInitialState('en')?.scores[0]).not.toBe(5);

    const requestedKeys = (AsyncStorage.multiGet as jest.Mock).mock.calls.flatMap(([keys]) => keys);
    expect(requestedKeys).toContain(lessonBestScoreKey(1, 'fr'));
    expect(requestedKeys).toContain(legacyFreeLessonCapKey('fr'));
    expect(requestedKeys).toContain(lessonProgressKey(1, 'fr'));
    expect(requestedKeys).toContain(levelExamKey('A1', 'passed', 'fr'));
    expect(requestedKeys).not.toContain(lessonBestScoreKey(1, 'en'));
    expect(requestedKeys).not.toContain(legacyFreeLessonCapKey('en'));
    expect(requestedKeys).not.toContain(levelExamKey('A1', 'passed', 'en'));
  });

  it('keeps the legacy English snapshot separate from French', async () => {
    mockStorage[legacyFreeLessonCapKey('en')] = '4';
    mockStorage[legacyFreeLessonCapKey('fr')] = '8';
    mockStorage[lessonBestScoreKey(1, 'en')] = '3.5';
    mockStorage[lessonBestScoreKey(1, 'fr')] = '5';

    const english = await loadLessonsTabStateFromStorage('en');
    const french = await loadLessonsTabStateFromStorage('fr');

    expect(english.scores[0]).toBe(3.5);
    expect(french.scores[0]).toBe(5);
    expect(english.legacyFreeLessonCap).toBe(4);
    expect(french.legacyFreeLessonCap).toBe(8);
    expect(getLessonsTabInitialState('en')).toEqual(english);
    expect(getLessonsTabInitialState('fr')).toEqual(french);
  });
});

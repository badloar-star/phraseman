import { beginAccountGeneration } from '../app/account_generation';
import { patchAppSnapshot, resetAppSnapshotForAccountSwitch } from '../app/app_snapshot_store';
import {
  __resetHomeScreenHydrationForTests,
  buildLastLessonFromHydration,
  rememberHomeScreenHydration,
} from '../app/home_screen_hydration';
import { storageStudyTarget } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');

// зачем (пакет 07:26 [HOME-COLD]: lessonCard=empty на холодном старте): карточка «Продолжить урок» в первом кадре берёт
// последний урок из стартового снимка, если памяти процесса ещё нет; язык изучения обязан совпасть; память — главнее.
function primeBootLessons(lastOpenedLesson: string | null, correct: number | null, target: string): void {
  patchAppSnapshot(() => ({
    lessons: {
      source: 'storage', updatedAt: 1, primedCount: 0,
      lastOpenedLesson, lastOpenedLessonCorrect: correct, studyTarget: target,
    },
  }));
}

beforeEach(() => {
  beginAccountGeneration('account-a');
  resetAppSnapshotForAccountSwitch();
  __resetHomeScreenHydrationForTests();
});

test('cold start: no memory, boot snapshot has the last lesson → card is built from the snapshot', () => {
  primeBootLessons('3', 20, storageStudyTarget('en'));
  expect(buildLastLessonFromHydration('ru', 'en')).toMatchObject({ id: 3, progress: 20, score: '2.0' });
});

test('boot snapshot for another study target is ignored', () => {
  primeBootLessons('3', 20, storageStudyTarget('es'));
  expect(buildLastLessonFromHydration('ru', 'en')).toBeNull();
});

test('no last lesson or unknown correct count → no card (Home waits for loadData as before)', () => {
  primeBootLessons(null, null, storageStudyTarget('en'));
  expect(buildLastLessonFromHydration('ru', 'en')).toBeNull();
  primeBootLessons('3', null, storageStudyTarget('en'));
  expect(buildLastLessonFromHydration('ru', 'en')).toBeNull();
});

test('process memory wins over the boot snapshot', () => {
  primeBootLessons('3', 20, storageStudyTarget('en'));
  rememberHomeScreenHydration({
    userName: 'x', streak: 0, displayStreak: 0, weekDone: [], weekPoints: 0, lessonsCompleted: 0,
    userAvatar: '1', userFrame: '', lastLessonId: 5, lastLessonProgress: 40, lastLessonScore: '4.0',
  }, 'en');
  expect(buildLastLessonFromHydration('ru', 'en')).toMatchObject({ id: 5, progress: 40, score: '4.0' });
});

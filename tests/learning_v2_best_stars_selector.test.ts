// зачем (координатор 05.10, макет startModal «★★☆ Лучший результат»): селектор лучших звёзд за занятие.
// Сторожим: повтор хуже не понижает (max), значения нет — undefined (не выдумываем), чужой scope — undefined.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetLearningV2SessionStarResultsForTests,
  getLessonBestStars,
  hydrateLearningV2SessionStarResults,
  recordLearningV2SessionStarResult,
} from '../app/learning_v2_session_star_results_store';

jest.mock('@react-native-async-storage/async-storage');

const SCOPE_A = 'a'.repeat(64);
const SCOPE_B = 'b'.repeat(64);
const SESSION = 'en:l01:s03';
const storage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  __resetLearningV2SessionStarResultsForTests();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
});

test('нет значения (старое занятие или витрина не поднята) — undefined', async () => {
  expect(getLessonBestStars(SESSION)).toBeUndefined();
  await hydrateLearningV2SessionStarResults(SCOPE_A);
  expect(getLessonBestStars(SESSION)).toBeUndefined();
  expect(getLessonBestStars(SESSION, SCOPE_A)).toBeUndefined();
});

test('хранится максимум: 2 → 1 оставляет 2, 2 → 3 даёт 3; 0 — валидное значение', async () => {
  await hydrateLearningV2SessionStarResults(SCOPE_A);
  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: SESSION, stars: 2 });
  expect(getLessonBestStars(SESSION)).toBe(2);
  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: SESSION, stars: 1 });
  expect(getLessonBestStars(SESSION)).toBe(2);
  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: SESSION, stars: 3 });
  expect(getLessonBestStars(SESSION, SCOPE_A)).toBe(3);

  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: 'en:l01:s04', stars: 0 });
  expect(getLessonBestStars('en:l01:s04')).toBe(0);
});

test('после перезапуска значение поднимается с диска', async () => {
  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: SESSION, stars: 2 });
  __resetLearningV2SessionStarResultsForTests();
  expect(getLessonBestStars(SESSION)).toBeUndefined();
  await hydrateLearningV2SessionStarResults(SCOPE_A);
  expect(getLessonBestStars(SESSION)).toBe(2);
});

test('чужой аккаунт: для другого scope — undefined', async () => {
  await hydrateLearningV2SessionStarResults(SCOPE_A);
  await recordLearningV2SessionStarResult({ accountScopeHash: SCOPE_A, courseSessionId: SESSION, stars: 3 });
  expect(getLessonBestStars(SESSION, SCOPE_B)).toBeUndefined();
});

test('битый id и ключи прототипа — undefined', async () => {
  await hydrateLearningV2SessionStarResults(SCOPE_A);
  expect(getLessonBestStars('')).toBeUndefined();
  expect(getLessonBestStars('toString')).toBeUndefined();
  expect(getLessonBestStars('bad id with spaces')).toBeUndefined();
});

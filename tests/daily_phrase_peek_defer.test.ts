// зачем (Сверка 11.10: [DAILY-PHRASE-PEEK] miss hydration=pending → каталог идиом 610 КБ на первом кадре Главной):
// пока снимок фразы дня читается, синхронный путь отдаёт null (карточка держит место), каталог не поднимается;
// снимок дочитан — подписчики узнают об этом, и фраза берётся из снимка.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockGetIdiomsSync = jest.fn(() => [{ id: 'i1', english: 'Break a leg', ru: 'Ни пуха', uk: 'Ні пуху' }]);
jest.mock('../app/idioms_lazy', () => ({ getIdiomsSync: () => mockGetIdiomsSync() }));

/* eslint-disable import/first */
import {
  getTodayPhraseSyncForTarget,
  hydrateDailyPhrasePeekFromStorage,
  isDailyPhrasePeekPending,
  subscribeDailyPhrasePeekHydrated,
} from '../app/daily_phrase_system';


beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockGetIdiomsSync.mockClear();
});
afterEach(() => jest.restoreAllMocks());

test('снимок ещё читается → null без каталога; дочитан → подписчик узнаёт, фраза из снимка', async () => {
  expect(isDailyPhrasePeekPending()).toBe(true);
  expect(getTodayPhraseSyncForTarget('en', 'ru')).toBeNull();
  expect(mockGetIdiomsSync).not.toHaveBeenCalled();

  const listener = jest.fn();
  const unsubscribe = subscribeDailyPhrasePeekHydrated(listener);
  await hydrateDailyPhrasePeekFromStorage();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(isDailyPhrasePeekPending()).toBe(false);
  unsubscribe();

  // Снимка на диске нет (state=empty) — после чтения синхронный путь честно поднимает каталог, как раньше.
  const phrase = getTodayPhraseSyncForTarget('en', 'ru');
  expect(phrase).not.toBeNull();
  expect(mockGetIdiomsSync).toHaveBeenCalled();
});

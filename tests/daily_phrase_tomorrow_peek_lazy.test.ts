/**
 * зачем (координатор 13.10, профили Сверки f0d559796): ради «завтрашней» фразы каждый запуск поднимал каталог идиом (610 КБ JS)
 * в окне +5…+12 с холодного старта. Сторож: сегодняшняя фраза пишется сразу; завтрашняя — из прошлого снимка (каталог не
 * грузится) или отложенно; первый показ фразы дня от каталога не зависит.
 */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../app/config', () => ({ ...jest.requireActual('../app/config'), CLOUD_SYNC_ENABLED: false }));
// зачем: отложенный шаг ждёт конца взаимодействий — в тесте выполняем сразу.
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  InteractionManager: { runAfterInteractions: (task: () => void) => { task(); return { cancel: () => undefined }; } },
}));

let mockLoaded = false;
const mockGetIdiomsSync = jest.fn(() => {
  mockLoaded = true;
  return [{ id: 'i1', english: 'Break a leg', ru: 'Ни пуха', uk: 'Ні пуху' }, { id: 'i2', english: 'Piece of cake', ru: 'Проще простого', uk: 'Простіше простого' }];
});
jest.mock('../app/idioms_lazy', () => ({ getIdiomsSync: () => mockGetIdiomsSync(), isIdiomsCatalogLoaded: () => mockLoaded }));

let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;

const today = () => new Date().toISOString().split('T')[0]!;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0]!;
const saved = () => ({ english: 'Hit the road', russian: 'В путь', date: today() });

beforeEach(async () => {
  jest.resetModules();
  // зачем: после resetModules модуль кода получает новый экземпляр хранилища — берём тот же.
  const storageModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = storageModule.default ?? storageModule;
  mockLoaded = false;
  mockGetIdiomsSync.mockClear();
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  await AsyncStorage.multiSet([['last_phrase_date_v3', today()], ['daily_phrase_v3', JSON.stringify(saved())]]);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('завтрашняя фраза есть в прошлом снимке — каталог не грузится, снимок {сегодня, завтра}', async () => {
  const tomorrowPhrase = { english: 'Piece of cake', russian: 'Проще простого', date: tomorrow() };
  await AsyncStorage.setItem('daily_phrase_peek_v1', JSON.stringify({ [today()]: saved(), [tomorrow()]: tomorrowPhrase }));
  const sys = require('../app/daily_phrase_system');
  await sys.hydrateDailyPhrasePeekFromStorage();
  const phrase = await sys.getTodayPhrase();
  expect(phrase.english).toBe('Hit the road');
  await new Promise((resolve) => setImmediate(resolve));
  expect(mockGetIdiomsSync).not.toHaveBeenCalled();
  const stored = JSON.parse((await AsyncStorage.getItem('daily_phrase_peek_v1'))!);
  expect(stored[tomorrow()].english).toBe('Piece of cake');
});

test('завтрашней нет — сегодняшняя записана сразу, каталог поднимается только отложенно', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  const sys = require('../app/daily_phrase_system');
  await sys.hydrateDailyPhrasePeekFromStorage();
  const phrase = await sys.getTodayPhrase();
  expect(phrase.english).toBe('Hit the road');
  await Promise.resolve();
  expect(mockGetIdiomsSync).not.toHaveBeenCalled();
  const first = JSON.parse((await AsyncStorage.getItem('daily_phrase_peek_v1'))!);
  expect(first[today()].english).toBe('Hit the road');
  expect(first[tomorrow()]).toBeUndefined();

  jest.advanceTimersByTime(9_999);
  expect(mockGetIdiomsSync).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(mockGetIdiomsSync).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  const next = JSON.parse((await AsyncStorage.getItem('daily_phrase_peek_v1'))!);
  expect(next[today()].english).toBe('Hit the road');
  expect(next[tomorrow()]).toBeDefined();
});

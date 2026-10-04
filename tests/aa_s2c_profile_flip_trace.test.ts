/*
 * AA S2c, случай 6 (§126, 01–02.09): «после перезапуска уровень 13↔12, дни 155↔52».
 *
 * Старый путь 1.6.x: stable_id хранится в ДВУХ слоях — SecureStore и AsyncStorage —
 * и на старте SecureStore читается ПЕРВЫМ. persistStableId считает запись успешной,
 * если удался ХОТЯ БЫ один слой. Гипотеза H6-1: SecureStore не записался (сбой
 * Keystore/Keychain), AsyncStorage записался → в процессе живёт новый профиль B,
 * а следующий холодный старт поднимает старый A из SecureStore; первая облачная
 * запись снова находит канонический B (adopt) — и так на каждом перезапуске.
 *
 * Этот тест НЕ чинит путь (причина не доказана логами с телефона), он доказывает,
 * что трассировка [PROFILE-FLIP] делает расхождение слоёв видимым, и фиксирует
 * текущее поведение (характеризация). Если путь починят — поменять ожидание
 * «старт вернул A» на «старт вернул B».
 */
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const secureStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { secureStore[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete secureStore[k]; }),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-generated') }));
const mockPersisted: string[] = [];
jest.mock('../app/debug-logger', () => ({
  DebugLogger: {
    error: jest.fn((context: string) => { mockPersisted.push(context); }),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const STABLE_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const STABLE_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function traceLines(spy: jest.SpyInstance): string[] {
  return spy.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.startsWith('[PROFILE-FLIP]'));
}

beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  for (const key of Object.keys(secureStore)) delete secureStore[key];
  mockPersisted.length = 0;
  const SS = require('expo-secure-store');
  SS.getItemAsync.mockReset().mockImplementation(async (k: string) => secureStore[k] ?? null);
  SS.setItemAsync.mockReset().mockImplementation(async (k: string, v: string) => { secureStore[k] = v; });
  SS.deleteItemAsync.mockReset().mockImplementation(async (k: string) => { delete secureStore[k]; });
});

test('both layers agree on a normal cold start; one persisted [PROFILE-FLIP] startup line, no raw id', async () => {
  secureStore.phraseman_stable_uid = STABLE_A;
  asyncStore.phraseman_stable_uid_cache = STABLE_A;
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const { getStableId } = require('../app/stable_id');

  await expect(getStableId()).resolves.toBe(STABLE_A);
  await getStableId(); // горячий путь из памяти — без новой строки

  const lines = traceLines(warn);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain('"source":"secure_store"');
  expect(lines[0]).toContain('"layersAgree":true');
  expect(lines.join('\n')).not.toContain(STABLE_A);
  // Обычный старт не пишет в журнал (холодный старт не платит записью).
  expect(mockPersisted).toEqual([]);
  warn.mockRestore();
});

test('H6-1: SecureStore write fails on switch → layers diverge → next cold start returns the OLD profile, and the trace shows it', async () => {
  secureStore.phraseman_stable_uid = STABLE_A;
  asyncStore.phraseman_stable_uid_cache = STABLE_A;
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  // Запуск 1: профиль A, затем серверный adopt переключает на B, а Keystore отказывает.
  let stable = require('../app/stable_id');
  await stable.getStableId();
  const SS = require('expo-secure-store');
  SS.setItemAsync.mockImplementation(async () => { throw new Error('keystore_unavailable'); });
  await stable.setStableId(STABLE_B);
  await expect(stable.getStableId()).resolves.toBe(STABLE_B);

  const persistLine = traceLines(warn).find((line) => line.includes('persist result'));
  expect(persistLine).toContain('"secure":"failed"');
  expect(persistLine).toContain('"async":"ok"');
  expect(persistLine).toContain('"layersDiverge":true');
  expect(mockPersisted).toContain('[PROFILE-FLIP] persist result');

  // Запуск 2 (холодный): SecureStore всё ещё держит A.
  warn.mockClear();
  jest.resetModules();
  stable = require('../app/stable_id');
  const afterRestart = await stable.getStableId();

  // Характеризация текущего поведения 1.6.x: старт поднимает A (вот и «прыжок»).
  expect(afterRestart).toBe(STABLE_A);
  const startup = traceLines(warn).find((line) => line.includes('startup source'));
  expect(startup).toContain('"layersAgree":false');
  expect(mockPersisted).toContain('[PROFILE-FLIP] startup source');
  expect(traceLines(warn).join('\n')).not.toContain(STABLE_A);
  expect(traceLines(warn).join('\n')).not.toContain(STABLE_B);
  warn.mockRestore();
});

test('every source branch is traced: AsyncStorage fallback and generated id', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  asyncStore.phraseman_stable_uid_cache = STABLE_B;
  let stable = require('../app/stable_id');
  await expect(stable.getStableId()).resolves.toBe(STABLE_B);
  expect(traceLines(warn).some((line) => line.includes('"source":"async_storage"'))).toBe(true);

  jest.resetModules();
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  for (const key of Object.keys(secureStore)) delete secureStore[key];
  stable = require('../app/stable_id');
  await expect(stable.getStableId()).resolves.toBe('uuid-generated');
  expect(traceLines(warn).some((line) => line.includes('"source":"generated"'))).toBe(true);
  warn.mockRestore();
});

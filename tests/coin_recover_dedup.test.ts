// зачем (координатор 04.10, «ок» на пункт 1): одновременные восстановления проекции кошелька без аренды
// замка делят один промис «в полёте». Эти тесты сторожат условия, на которых это разрешено: одна проекция
// и одно восстановление на одновременные вызовы, путь с арендой не ждёт общий промис, смена поколения не
// отдаёт проекцию старого аккаунта, ошибка не «залипает».
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { readUnifiedLevelSpinStars, recoverAndHydrateLevelSpinStarGrants } from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

type PhoneState = { credits: unknown[]; acknowledgements: unknown[] };

const storage: Record<string, string> = {};
const EMPTY_PHONE_STATE: PhoneState = { credits: [], acknowledgements: [] };

function phoneStateRead(): jest.Mock {
  return (jest.requireMock('../app/phone_state_economy_bridge') as {
    readPhoneStateStarCreditState: jest.Mock;
  }).readPhoneStateStarCreditState;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settleMicrotasks(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function withinMs<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([promise, new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms))]);
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  phoneStateRead().mockResolvedValue(EMPTY_PHONE_STATE);
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { stars: 0, starsEarnedTotal: 0 } }));
  snapshot.patchAppSnapshot.mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('два одновременных вызова без аренды — одно восстановление и одна проекция', async () => {
  const gate = deferred<PhoneState>();
  phoneStateRead().mockReturnValueOnce(gate.promise);
  const token = captureAccountGeneration();

  const first = recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false, shareInFlight: true });
  const second = readUnifiedLevelSpinStars(token);
  await settleMicrotasks();
  gate.resolve(EMPTY_PHONE_STATE);

  const [hydrated, read] = await Promise.all([first, second]);
  expect(phoneStateRead()).toHaveBeenCalledTimes(1);
  expect(read).toEqual(hydrated);
  expect((console.log as jest.Mock).mock.calls.some(([line]) => String(line).includes('[COIN-RECOVER] dedupe:joined'))).toBe(true);
});

test('подготовка баланса без shareInFlight (после подтяжки PhoneState) всегда считает сама', async () => {
  const gate = deferred<PhoneState>();
  phoneStateRead().mockReturnValueOnce(gate.promise);
  const token = captureAccountGeneration();

  const inFlight = readUnifiedLevelSpinStars(token);
  await settleMicrotasks();
  const afterPull = recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  gate.resolve(EMPTY_PHONE_STATE);

  await Promise.all([inFlight, afterPull]);
  expect(phoneStateRead()).toHaveBeenCalledTimes(2);
});

test('после завершения запись снимается — следующий вызов считает заново (кэша нет)', async () => {
  const token = captureAccountGeneration();
  await readUnifiedLevelSpinStars(token);
  await readUnifiedLevelSpinStars(token);
  expect(phoneStateRead()).toHaveBeenCalledTimes(2);
});

test('вызов с арендой замка не ждёт общий промис (нет взаимоблокировки)', async () => {
  const token = captureAccountGeneration();
  let shared: Promise<unknown> | null = null;
  const leased = withAccountTransitionLock(async (lease) => {
    // Общий вызов встаёт в очередь замка, который держим мы.
    shared = readUnifiedLevelSpinStars(token);
    await settleMicrotasks();
    // Вызов изнутри замка обязан пройти сам, а не ждать общий промис (он ждёт этот же замок).
    return readUnifiedLevelSpinStars(token, lease);
  });
  const leasedResult = await withinMs(leased, 2_000);
  expect(leasedResult).not.toBe('timeout');
  expect(await withinMs(shared as unknown as Promise<unknown>, 2_000)).not.toBe('timeout');
  expect(phoneStateRead()).toHaveBeenCalledTimes(2);
});

test('смена поколения во время полёта: новый вызов не получает проекцию старого поколения', async () => {
  const gate = deferred<PhoneState>();
  phoneStateRead().mockReturnValueOnce(gate.promise);
  const oldToken = captureAccountGeneration();
  const oldFlight = readUnifiedLevelSpinStars(oldToken);
  await settleMicrotasks();

  beginAccountGeneration('account-a');
  const newToken = captureAccountGeneration();
  expect(newToken.generation).not.toBe(oldToken.generation);
  const newFlight = readUnifiedLevelSpinStars(newToken);
  gate.resolve(EMPTY_PHONE_STATE);

  await expect(oldFlight).rejects.toThrow('level_spin_star_identity_changed');
  await expect(newFlight).resolves.toEqual({ balance: 0, earnedTotal: 0 });
  // Новое поколение посчитало само: второе чтение состояния телефона — его.
  expect(phoneStateRead()).toHaveBeenCalledTimes(2);
  expect(phoneStateRead().mock.calls[1][0]).toEqual(expect.objectContaining({
    expectedAccountGeneration: newToken.generation,
  }));
});

test('ошибка первого не «залипает»: следующий вызов после неё считает заново', async () => {
  const gate = deferred<PhoneState>();
  phoneStateRead().mockReturnValueOnce(gate.promise);
  const token = captureAccountGeneration();
  const first = readUnifiedLevelSpinStars(token);
  const joined = readUnifiedLevelSpinStars(token);
  await settleMicrotasks();
  gate.reject(new Error('phone_state_db_unavailable'));
  await expect(first).rejects.toThrow('phone_state_db_unavailable');
  await expect(joined).rejects.toThrow('phone_state_db_unavailable');

  await expect(readUnifiedLevelSpinStars(token)).resolves.toEqual({ balance: 0, earnedTotal: 0 });
  expect(phoneStateRead()).toHaveBeenCalledTimes(2);
});

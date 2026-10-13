// зачем (смета Firebase п.10, 13.10): охранный restoreFromCloud у человека без Plus — не чаще раза в 30 мин (было 5),
// и вызывающий (в том числе сохранение карточки внутри замка) ждёт облако не дольше 5 с — дальше решение по локальным данным.
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const restoreFromCloud = jest.fn<Promise<boolean>, []>(async () => false);
const getCustomerInfo = jest.fn(async () => ({ entitlements: { active: {} }, activeSubscriptions: [] }));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getCustomerInfo, getAppUserID: jest.fn(async () => 'premium-ttl-test') },
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({ restoreFromCloud }));
jest.mock('../app/gift_access_cloud', () => ({ readGiftAccessFromCloud: jest.fn(async () => null) }));
jest.mock('../app/revenuecat_projection_sync', () => ({ syncRevenueCatProjectionForAccount: jest.fn(async () => true) }));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()),
  DebugLogger: { error: jest.fn() },
}));

const MIN = 60 * 1000;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.useRealTimers();
  restoreFromCloud.mockImplementation(async () => false);
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  require('../app/account_generation').beginAccountGeneration('premium-ttl-test');
  (globalThis as any).__DEV__ = false;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('охранный restore у бесплатного — не чаще раза в 30 минут', async () => {
  let now = 1_800_000_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  const guard = require('../app/premium_guard');
  expect(guard.CLOUD_ACCESS_REFRESH_TTL_MS).toBe(30 * MIN);

  await expect(guard.getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);

  now += 10 * MIN;
  guard.invalidatePremiumCache();
  await expect(guard.getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);

  now += 21 * MIN;
  guard.invalidatePremiumCache();
  await expect(guard.getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(restoreFromCloud).toHaveBeenCalledTimes(2);
});

test('неудачный restore повторяется через 2 минуты, а не через 30', async () => {
  let now = 1_800_000_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  restoreFromCloud.mockImplementation(async () => { throw new Error('network'); });
  const guard = require('../app/premium_guard');

  await expect(guard.getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);

  now += 1 * MIN;
  guard.invalidatePremiumCache();
  await guard.getVerifiedPremiumStatus();
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);

  now += 1.5 * MIN;
  guard.invalidatePremiumCache();
  await guard.getVerifiedPremiumStatus();
  expect(restoreFromCloud).toHaveBeenCalledTimes(2);
});

test('зависший restore не держит проверку дольше потолка 5 с — решение по локальным данным', async () => {
  jest.useFakeTimers();
  restoreFromCloud.mockImplementation(() => new Promise<boolean>(() => undefined));
  const guard = require('../app/premium_guard');
  expect(guard.CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS).toBe(5_000);

  let settled: boolean | null = null;
  const pending = guard.getVerifiedPremiumStatus().then((value: boolean) => { settled = value; });
  await jest.advanceTimersByTimeAsync(4_000);
  expect(settled).toBeNull();
  await jest.advanceTimersByTimeAsync(1_500);
  await pending;
  expect(settled).toBe(false);
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);
});

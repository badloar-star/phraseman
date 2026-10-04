/*
 * AA S2d 🔴1: решение доступа premium_guard во время переноса Plus.
 * Plus прежнего аккаунта держится на новом, пока RevenueCat не ответил,
 * и пропадает сразу после снятия удержания (подтверждённое отсутствие).
 * Удержание не пишет premium_* в хранилище нового аккаунта.
 */
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} }, activeSubscriptions: [] })),
    getAppUserID: jest.fn(async () => 'someone-else'),
  },
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({ restoreFromCloud: jest.fn(async () => false) }));
jest.mock('../app/gift_access_cloud', () => ({ readGiftAccessFromCloud: jest.fn(async () => null) }));
jest.mock('../app/revenuecat_projection_sync', () => ({ syncRevenueCatProjectionForAccount: jest.fn(async () => true) }));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(),
  swallowError: jest.fn(() => jest.fn()),
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const STABLE_A = 'stable-account-a';
const STABLE_B = 'stable-account-b';

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

test('store Plus of account A is evidence; on B the hold keeps access until it is released', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  const hold = require('../app/plus_transfer_hold');

  generation.beginAccountGeneration(STABLE_A);
  asyncStore.premium_active = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_rc_last_seen_at = String(Date.now());
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(true);
  expect(hold.hasFreshStorePlusEvidenceFor(STABLE_A)).toBe(true);

  // Смена аккаунта: wipe стёр premium_* A, удержание поставлено.
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  hold.beginPlusTransferHold(STABLE_A, STABLE_B, 'stable_id_set');
  generation.beginAccountGeneration(STABLE_B);
  guard.invalidatePremiumCache();
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(true);
  // Удержание — только решение доступа: premium_* нового аккаунта не записаны.
  expect(asyncStore.premium_active).toBeUndefined();
  // Реальное свидетельство B не подменено удержанием.
  expect(hold.hasFreshStorePlusEvidenceFor(STABLE_B)).toBe(false);

  await hold.clearPlusTransferHold('entitlement_absent');
  guard.invalidatePremiumCache();
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
});

test('without a hold a fresh account never inherits Plus', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  generation.beginAccountGeneration(STABLE_B);
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
});

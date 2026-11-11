/*
 * Account-only regression: a legacy Plus transfer hold never grants access to
 * the next account and never writes premium_* into that account's storage.
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

test('store Plus remains valid for A, while a legacy A -> B hold never grants B', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  const hold = require('../app/plus_transfer_hold');

  const storage = require('../app/premium_real_storage');

  const tokenA = generation.beginAccountGeneration(STABLE_A);
  // зачем (владелец 11.11, U23 «оставить строго»): старые общие ключи premium_* не знают, чьи они, поэтому доступа
  // не дают никому — даже аккаунту A после обновления; Plus возвращает облако. Тест раньше сеял именно их и ждал «да».
  asyncStore.premium_active = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_rc_last_seen_at = String(Date.now());
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);

  // Plus у A — это снимок, привязанный к аккаунту (его пишут покупка и ответ облака).
  await expect(storage.replaceRealPremiumSnapshotForGeneration(tokenA, {
    active: true, plan: 'yearly', premiumExpiryMs: 0, rcExpiryMs: 0, rcLastSeenAtMs: Date.now(),
    rcProductId: null, rcPeriodType: null, rcStore: null, rcPurchasedAtMs: 0, rcUpdatedAtMs: 0,
    evidenceSource: 'store_purchase',
  })).resolves.toBe(true);
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(true);

  // Account switch: wipe removed A's premium_*; a legacy hold record exists.
  for (const key of Object.keys(asyncStore)) delete asyncStore[key];
  hold.beginPlusTransferHold(STABLE_A, STABLE_B, 'stable_id_set');
  generation.beginAccountGeneration(STABLE_B);
  guard.invalidatePremiumCache();
  await expect(hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
  expect(asyncStore.premium_active).toBeUndefined();
});

test('without a hold a fresh account never inherits Plus', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  generation.beginAccountGeneration(STABLE_B);
  await expect(guard.getVerifiedRealPremiumStatus({ bypassCache: true })).resolves.toBe(false);
});

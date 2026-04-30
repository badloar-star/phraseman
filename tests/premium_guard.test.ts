const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const getCustomerInfo = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo,
  },
}));

jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));

function resetStore() {
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  resetStore();
  (globalThis as any).__DEV__ = false;
});

test('returns true when tester_no_limits is enabled', async () => {
  asyncStore.tester_no_limits = 'true';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('tester_no_premium overrides __DEV__ default (strip premium in dev)', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('__DEV__ without tester_no_premium is treated as premium', async () => {
  (globalThis as any).__DEV__ = true;
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('returns true for admin override without RevenueCat call', async () => {
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_expiry = '0';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('admin timed grant expires: clears AsyncStorage keys and returns false', async () => {
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = String(Date.now() - 86400000);
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(asyncStore.admin_premium_override).toBe('false');
  expect(asyncStore.premium_plan).toBe('');
});

test('deactivates stale local premium when RC says inactive', async () => {
  asyncStore.premium_active = 'true';
  asyncStore.premium_expiry = '0';
  asyncStore.premium_rc_last_seen_at = String(Date.now() - (25 * 60 * 60 * 1000));
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(asyncStore.premium_active).toBe('false');
});


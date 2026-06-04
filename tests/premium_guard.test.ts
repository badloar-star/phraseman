const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const getCustomerInfo = jest.fn();
const restoreFromCloud = jest.fn<Promise<boolean>, []>(async () => false);

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo,
  },
}));

jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));

jest.mock('../app/cloud_sync', () => ({
  restoreFromCloud,
}));

function resetStore() {
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  restoreFromCloud.mockImplementation(async () => false);
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

test('admin override gives VIP access without making real Premium active', async () => {
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_expiry = '0';
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.vip_active).toBe('true');
});

test('admin VIP access wins over tester_no_premium without flipping premium_active', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = String(Date.now() + 86400000);
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).toBeUndefined();
  expect(asyncStore.vip_active).toBe('true');
});

test('survey VIP stays active in dev while dev-default Premium is stripped', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  asyncStore.vip_active = 'true';
  asyncStore.vip_plan = 'survey_vip';
  asyncStore.vip_from = String(Date.now());
  asyncStore.vip_until = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  asyncStore.vip_admin_override = 'true';
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).toBeUndefined();
});

test('real Premium and survey VIP can be active at the same time', async () => {
  asyncStore.premium_active = 'true';
  asyncStore.premium_plan = 'monthly';
  asyncStore.premium_expiry = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  asyncStore.vip_active = 'true';
  asyncStore.vip_plan = 'survey_vip';
  asyncStore.vip_from = String(Date.now());
  asyncStore.vip_until = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  asyncStore.vip_admin_override = 'true';
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
});

test('admin_grant plan without admin_premium_override counts as legacy VIP access', async () => {
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = '0';
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
});

test('admin_grant ignored when admin explicitly revoked (override false)', async () => {
  asyncStore.admin_premium_override = 'false';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = '0';
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
});

test('restores VIP from cloud before denying Premium access', async () => {
  restoreFromCloud.mockImplementation(async () => {
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'telegram_tester';
    asyncStore.vip_from = String(Date.now());
    asyncStore.vip_until = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
    asyncStore.vip_admin_override = 'true';
    return true;
  });
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
  expect(restoreFromCloud).toHaveBeenCalledTimes(1);
});

test('admin_grant with stale local premium flag is not real Premium when RC is unavailable', async () => {
  asyncStore.admin_premium_override = 'false';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_active = 'true';
  asyncStore.premium_expiry = '0';

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');

  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedVipStatus()).resolves.toBe(false);
  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
});

test('admin timed grant expires as VIP access and does not rewrite premium plan', async () => {
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = String(Date.now() - 86400000);
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(asyncStore.vip_active).toBe('false');
  expect(asyncStore.premium_plan).toBe('admin_grant');
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

test('keeps cloud-restored paid Premium when RC expiry is still in the future', async () => {
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_expiry = '0';
  asyncStore.premium_rc_expiry_ms = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  expect(asyncStore.premium_active).toBe('true');
});

test('restores cloud-paid Premium from plan metadata when RC is unavailable', async () => {
  asyncStore.premium_plan = 'monthly';
  asyncStore.premium_expiry = '0';
  getCustomerInfo.mockRejectedValue(new Error('offline'));

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  expect(asyncStore.premium_active).toBe('true');
});

test('expires cloud-restored paid Premium when stored RC expiry is in the past', async () => {
  asyncStore.premium_active = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_expiry = '0';
  asyncStore.premium_rc_expiry_ms = String(Date.now() - 24 * 60 * 60 * 1000);
  getCustomerInfo.mockRejectedValue(new Error('offline'));

  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(asyncStore.premium_active).toBe('false');
});

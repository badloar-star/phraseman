const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map(k => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const getCustomerInfo = jest.fn();
const getAppUserID = jest.fn(async () => 'premium-guard-test');
const restoreFromCloud = jest.fn<Promise<boolean>, []>(async () => false);
const syncRevenueCatProjectionForAccount = jest.fn<Promise<boolean>, [string]>(async () => true);
const debugError = jest.fn();
const readGiftAccessFromCloud = jest.fn(async () => null as null | {
  grantedAtMs: number | null;
  endsAtMs: number | null;
});

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo,
    getAppUserID,
  },
}));

jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));

jest.mock('../app/cloud_sync', () => ({
  restoreFromCloud,
}));

jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud,
}));

jest.mock('../app/revenuecat_projection_sync', () => ({
  syncRevenueCatProjectionForAccount,
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: debugError },
}));

function resetStore() {
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
}

async function migrateLegacyVipForCurrentTestAccount(): Promise<void> {
  const generation = require('../app/account_generation');
  const storage = require('../app/premium_vip_storage');
  await storage.migrateLegacyVipSnapshotOnce(generation.captureAccountGeneration());
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  restoreFromCloud.mockImplementation(async () => false);
  readGiftAccessFromCloud.mockResolvedValue(null);
  syncRevenueCatProjectionForAccount.mockResolvedValue(true);
  getAppUserID.mockImplementation(async () => 'premium-guard-test');
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  resetStore();
  const generation = require('../app/account_generation');
  generation.beginAccountGeneration('premium-guard-test');
  (globalThis as any).__DEV__ = false;
});

test('returns true when tester_no_limits is enabled', async () => {
  asyncStore.tester_no_limits = 'true';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(true);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('tester_no_premium remains the explicit QA kill switch in dev', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('tester_no_premium wins when tester_no_limits is also enabled', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  asyncStore.tester_no_limits = 'true';
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(getCustomerInfo).not.toHaveBeenCalled();
});

test('__DEV__ does not preserve a stale premium_active flag without a store plan', async () => {
  (globalThis as any).__DEV__ = true;
  asyncStore.premium_active = 'true';
  const { getVerifiedPremiumStatus, __waitForPremiumBackgroundRefreshForTests } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  expect(asyncStore.premium_active).toBe('false');
  await __waitForPremiumBackgroundRefreshForTests();
  expect(getCustomerInfo).toHaveBeenCalled();
});

test('admin override gives VIP access without making real Premium active', async () => {
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'yearly';
  asyncStore.premium_expiry = '0';
  await migrateLegacyVipForCurrentTestAccount();
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.vip_active).toBe('true');
});

test('tester_no_premium kill-switch overrides admin VIP access without flipping premium_active', async () => {
  // tester_no_premium — единый kill-switch на ВЕСЬ доступ (real + VIP + intro).
  // Раньше админ-VIP-грант обходил флаг, и кнопка «Снять премиум» не снимала —
  // это был баг. Теперь доступ гаснет, даже если выставлен admin_premium_override.
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  asyncStore.admin_premium_override = 'true';
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = String(Date.now() + 86400000);
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');
  const result = await getVerifiedPremiumStatus();
  expect(result).toBe(false);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).toBeUndefined();
});

test('tester_no_premium kill-switch also strips survey VIP in dev', async () => {
  // Тот же kill-switch гасит и VIP: getVerifiedVipStatus возвращает false ПЕРЕД
  // чтением vip_active, поэтому даже активный survey-VIP не даёт доступа.
  (globalThis as any).__DEV__ = true;
  asyncStore.tester_no_premium = 'true';
  asyncStore.vip_active = 'true';
  asyncStore.vip_plan = 'survey_vip';
  asyncStore.vip_from = String(Date.now());
  asyncStore.vip_until = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  asyncStore.vip_admin_override = 'true';
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedVipStatus()).resolves.toBe(false);
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
  await migrateLegacyVipForCurrentTestAccount();
  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');
  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedVipStatus()).resolves.toBe(true);
});

test('admin_grant plan without admin_premium_override counts as legacy VIP access', async () => {
  asyncStore.premium_plan = 'admin_grant';
  asyncStore.premium_expiry = '0';
  await migrateLegacyVipForCurrentTestAccount();
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

test('an unrelated RevenueCat entitlement or subscription does not unlock Premium', async () => {
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: { other: { productIdentifier: 'unrelated_product' } } },
    activeSubscriptions: ['unrelated_product'],
  });

  const { getVerifiedRealPremiumStatus } = require('../app/premium_guard');

  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).not.toBe('true');
  expect(syncRevenueCatProjectionForAccount).not.toHaveBeenCalled();
});

test('returns the local decision first and syncs a managed RevenueCat entitlement in background', async () => {
  getCustomerInfo.mockResolvedValue({
    entitlements: {
      active: { premium: { productIdentifier: 'phraseman_premium_monthly_399:monthly-base' } },
    },
    activeSubscriptions: ['phraseman_premium_monthly_399:monthly-base'],
  });
  const { getVerifiedRealPremiumStatus, __waitForPremiumBackgroundRefreshForTests } = require('../app/premium_guard');

  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await __waitForPremiumBackgroundRefreshForTests();
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  expect(syncRevenueCatProjectionForAccount).toHaveBeenCalledTimes(1);
  expect(syncRevenueCatProjectionForAccount).toHaveBeenCalledWith('premium-guard-test');
});

test('background refresh ignores retired MAX and persists only ordinary Premium', async () => {
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {
      premium: {
        productIdentifier: 'phraseman_premium_monthly_399',
        expirationDateMillis: 1_000,
      },
      max: {
        productIdentifier: 'phraseman_max_monthly_v1:monthly-base',
        expirationDateMillis: 9_000,
      },
    } },
    activeSubscriptions: [
      'phraseman_premium_monthly_399',
      'phraseman_max_monthly_v1:monthly-base',
    ],
  });
  const { getVerifiedRealPremiumStatus, __waitForPremiumBackgroundRefreshForTests } = require('../app/premium_guard');

  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await __waitForPremiumBackgroundRefreshForTests();

  expect(asyncStore.premium_plan).toBe('monthly');
  expect(asyncStore.premium_rc_product_id).toBe('phraseman_premium_monthly_399');
  expect(asyncStore.premium_rc_expiry_ms).toBe('1000');
});

test('preserves local paid access and logs warning when projection sync fails', async () => {
  getCustomerInfo.mockResolvedValue({
    entitlements: {
      active: { premium: { productIdentifier: 'phraseman_premium_monthly_399:monthly-base' } },
    },
    activeSubscriptions: ['phraseman_premium_monthly_399:monthly-base'],
  });
  syncRevenueCatProjectionForAccount.mockRejectedValue(new Error('offline'));
  const { getVerifiedRealPremiumStatus, __waitForPremiumBackgroundRefreshForTests } = require('../app/premium_guard');

  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await __waitForPremiumBackgroundRefreshForTests();
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(true);
  expect(debugError).toHaveBeenCalledWith(
    'premium_guard:revenuecat_projection_sync',
    expect.any(Error),
    'warning',
  );
});

test('drops account A projection completion after account generation changes', async () => {
  const generation = require('../app/account_generation');
  generation.beginAccountGeneration('stable-A');
  getAppUserID.mockResolvedValue('stable-A');
  getCustomerInfo.mockResolvedValue({
    entitlements: {
      active: { premium: { productIdentifier: 'phraseman_premium_monthly_399:monthly-base' } },
    },
    activeSubscriptions: ['phraseman_premium_monthly_399:monthly-base'],
  });
  let releaseSync!: (value: boolean) => void;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  syncRevenueCatProjectionForAccount.mockImplementationOnce(() => new Promise((resolve) => {
    releaseSync = resolve;
    markStarted();
  }));
  const guard = require('../app/premium_guard');

  const staleResult = guard.getVerifiedRealPremiumStatus();
  await started;
  generation.invalidateAccountGeneration();
  guard.beginPremiumAccountTransition();
  generation.beginAccountGeneration('stable-B');
  releaseSync(true);

  await expect(staleResult).resolves.toBe(false);
  await guard.__waitForPremiumBackgroundRefreshForTests();
  expect(asyncStore.premium_active).not.toBe('true');
});

test('intro full access grants premium-level access without making real Premium active', async () => {
  asyncStore.intro_full_access_started_at_v1 = String(Date.now() - 60_000);
  asyncStore.intro_full_access_ends_at_v1 = String(Date.now() + 60_000);
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus, getVerifiedVipStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedVipStatus()).resolves.toBe(false);
  expect(asyncStore.premium_active).not.toBe('true');
  expect(asyncStore.vip_active).toBeUndefined();
});

test('expired intro full access does not grant premium-level access', async () => {
  asyncStore.intro_full_access_started_at_v1 = String(Date.now() - 4 * 24 * 60 * 60 * 1000);
  asyncStore.intro_full_access_ends_at_v1 = String(Date.now() - 24 * 60 * 60 * 1000);
  getCustomerInfo.mockResolvedValue({
    entitlements: { active: {} },
    activeSubscriptions: [],
  });

  const { getVerifiedPremiumStatus, getVerifiedRealPremiumStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
});

test('restores VIP from cloud before denying Premium access', async () => {
  restoreFromCloud.mockImplementation(async () => {
    const generation = require('../app/account_generation').captureAccountGeneration();
    await require('../app/premium_vip_storage').writeVipSnapshotForAccount(generation.stableId, {
      vip_active: 'true',
      vip_plan: 'telegram_tester',
      vip_from: String(Date.now()),
      vip_until: String(Date.now() + 30 * 24 * 60 * 60 * 1000),
      vip_admin_override: 'true',
    });
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
  await migrateLegacyVipForCurrentTestAccount();
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

test('historical active cloud loyalty gift grants generic access only', async () => {
  readGiftAccessFromCloud.mockResolvedValue({
    grantedAtMs: Date.now() - 60_000,
    endsAtMs: Date.now() + 60_000,
  });
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  const {
    getVerifiedPremiumStatus,
    getVerifiedRealPremiumStatus,
    getVerifiedVipStatus,
  } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(true);
  await expect(getVerifiedRealPremiumStatus()).resolves.toBe(false);
  await expect(getVerifiedVipStatus()).resolves.toBe(false);
  expect(readGiftAccessFromCloud).toHaveBeenCalledWith('loyalty');
});

test('tester kill switch blocks cloud loyalty gift before any cloud read', async () => {
  asyncStore.tester_no_premium = 'true';
  readGiftAccessFromCloud.mockResolvedValue({
    grantedAtMs: Date.now() - 60_000,
    endsAtMs: Date.now() + 60_000,
  });
  const { getVerifiedPremiumStatus } = require('../app/premium_guard');

  await expect(getVerifiedPremiumStatus()).resolves.toBe(false);
  expect(readGiftAccessFromCloud).not.toHaveBeenCalled();
});

test('drops a delayed loyalty gift result after account generation changes', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  generation.beginAccountGeneration('stable-A');
  guard.invalidatePremiumCache();
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  let releaseGift!: (value: { grantedAtMs: number; endsAtMs: number }) => void;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  readGiftAccessFromCloud.mockImplementationOnce(() => new Promise((resolve) => {
    releaseGift = resolve;
    markStarted();
  }));

  const staleAccess = guard.getVerifiedPremiumStatus();
  await started;
  generation.invalidateAccountGeneration();
  guard.beginPremiumAccountTransition();
  generation.beginAccountGeneration('stable-B');
  releaseGift({ grantedAtMs: Date.now() - 60_000, endsAtMs: Date.now() + 60_000 });

  await expect(staleAccess).resolves.toBe(false);
});

test('drops delayed account A RevenueCat result without writing or caching Premium for B', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  generation.beginAccountGeneration('stable-A');
  guard.invalidatePremiumCache();
  asyncStore.premium_active = 'false';
  asyncStore.premium_plan = 'monthly';
  asyncStore.premium_expiry = '0';
  getAppUserID.mockImplementation(async () => generation.captureAccountGeneration().stableId);
  let releaseA!: (value: unknown) => void;
  let startedA!: () => void;
  const started = new Promise<void>((resolve) => { startedA = resolve; });
  getCustomerInfo.mockImplementationOnce(() => new Promise((resolve) => {
    releaseA = resolve;
    startedA();
  }));

  const staleA = guard.getVerifiedRealPremiumStatus();
  await started;
  generation.invalidateAccountGeneration();
  guard.beginPremiumAccountTransition();
  generation.beginAccountGeneration('stable-B');
  asyncStore.premium_active = 'false';
  asyncStore.premium_plan = '';
  releaseA({
    entitlements: { active: { premium: { productIdentifier: 'phraseman_monthly' } } },
    activeSubscriptions: ['phraseman_monthly'],
  });

  await expect(staleA).resolves.toBe(false);
  expect(asyncStore.premium_active).toBe('false');

  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  await expect(guard.getVerifiedRealPremiumStatus()).resolves.toBe(false);
});

test('drops delayed A tester kill-switch read without caching false over B VIP', async () => {
  const generation = require('../app/account_generation');
  const guard = require('../app/premium_guard');
  const vipStorage = require('../app/premium_vip_storage');
  const storageMock = require('@react-native-async-storage/async-storage');
  generation.beginAccountGeneration('stable-A');
  guard.invalidatePremiumCache();
  let releaseA!: () => void;
  let startedA!: () => void;
  const pendingA = new Promise<void>((resolve) => { releaseA = resolve; });
  const started = new Promise<void>((resolve) => { startedA = resolve; });
  storageMock.getItem.mockImplementationOnce(async () => {
    startedA();
    await pendingA;
    return 'true';
  });

  const staleA = guard.getVerifiedPremiumAccessStatus();
  await started;
  generation.invalidateAccountGeneration();
  guard.beginPremiumAccountTransition();
  generation.beginAccountGeneration('stable-B');
  await vipStorage.writeVipSnapshotForAccount('stable-B', {
    vip_active: 'true',
    vip_plan: 'survey_vip',
    vip_until: '9999999999999',
    vip_admin_override: 'true',
  });
  releaseA();
  await expect(staleA).resolves.toBe(false);

  getAppUserID.mockResolvedValue('stable-B');
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  await expect(guard.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
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

// зачем (R61, координатор/Ревизор 15.10, 🔴 деньги): быстрая проверка доступа без облака (allowCloudRefresh: false) клала
// «нет» в общий кэш на 5 мин — полная проверка у плательщика с пустой локальной копией (Plus только в облаке) получала это
// «нет» и в облако не шла. Кэшируется только «да»; «нет» без облака — не окончательный ответ.
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const getCustomerInfo = jest.fn();
const getAppUserID = jest.fn(async () => 'r61-user');
const readGiftAccessFromCloud = jest.fn(async () => null as null | { grantedAtMs: number | null; endsAtMs: number | null });
const restoreFromCloud = jest.fn(async () => false);

jest.mock('../app/events', () => ({ ...jest.requireActual('../app/events'), emitAppEvent: jest.fn() }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getCustomerInfo, getAppUserID } }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  restoreFromCloud: () => restoreFromCloud(),
  peekCloudRestoreInFlight: () => null,
  lastCloudRestoreCompletedAt: () => 0,
}));
jest.mock('../app/gift_access_cloud', () => ({ readGiftAccessFromCloud }));
jest.mock('../app/revenuecat_projection_sync', () => ({ syncRevenueCatProjectionForAccount: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'r61-user') }));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()),
  DebugLogger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const KEY = 'loyalty_gift_verified_copy_v1';
const HOUR = 60 * 60 * 1000;

function giftCopy(untilMs: number): string {
  return JSON.stringify({ v: 1, uid: 'r61-user', untilMs, verifiedAtMs: Date.now() });
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  readGiftAccessFromCloud.mockResolvedValue(null);
  restoreFromCloud.mockImplementation(async () => false);
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  require('../app/account_generation').beginAccountGeneration('r61-user');
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

function guard() {
  const g = require('../app/premium_guard');
  g.resetLoyaltyGiftReverifyForTests();
  g.invalidatePremiumCache();
  return g;
}

describe('R61: «нет» без облака не отравляет общий кэш доступа', () => {
  it('холодная копия + Plus в облаке: быстрая «нет», затем полная доходит до облака → «да»', async () => {
    // Восстановление из облака приносит доступ (здесь — проверенная копия подарка, как в loyalty_gift_local_copy).
    restoreFromCloud.mockImplementation(async () => {
      asyncStore[KEY] = giftCopy(Date.now() + 5 * HOUR);
      return true;
    });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(false);
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    expect(restoreFromCloud).toHaveBeenCalledTimes(1);
  });

  it('Free: повторные быстрые проверки не запускают восстановление из облака', async () => {
    const g = guard();
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(false);
    }
    expect(restoreFromCloud).not.toHaveBeenCalled();
  });

  it('быстрая проверка с «да» кэшируется', async () => {
    asyncStore[KEY] = giftCopy(Date.now() + 5 * HOUR);
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(true);
    delete asyncStore[KEY];
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(true);
  });

  it('смена аккаунта посреди быстрой проверки → «нет» без записи в кэш', async () => {
    let resolveCloud: (value: null) => void = () => undefined;
    readGiftAccessFromCloud.mockImplementation(() => new Promise((resolve) => { resolveCloud = resolve; }));
    const g = guard();
    const pending = g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    require('../app/account_generation').beginAccountGeneration('next-user');
    resolveCloud(null);
    await expect(pending).resolves.toBe(false);
  });
});

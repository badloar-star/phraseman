// зачем (владелец 11.10, журнал строка 16; план §CORE-0165): код денег — все ветки подарка лояльности под тестом:
// копия активна / истекла / чужая / мусор; облако подтвердило / отозвало / недоступно / опоздало; смена аккаунта;
// строгая проверка в момент изменения данных копию не использует.
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const getCustomerInfo = jest.fn();
const getAppUserID = jest.fn(async () => 'gift-user');
const readGiftAccessFromCloud = jest.fn(async () => null as null | { grantedAtMs: number | null; endsAtMs: number | null });
let canonicalUid: string | null = 'gift-user';
// DeviceEventEmitter в тестовой среде событий не доставляет — считаем emitAppEvent напрямую.
const emitted: string[] = [];
jest.mock('../app/events', () => ({
  ...jest.requireActual('../app/events'),
  emitAppEvent: (event: string) => { emitted.push(event); },
}));

jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getCustomerInfo, getAppUserID } }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
const restoreFromCloud = jest.fn(async () => false);
// зачем (R61 15.10): с FS-READS (12ac0abeb) проверка премиума сначала спрашивает, идёт ли загрузочное восстановление и было ли
// недавнее, — без этих функций заглушка роняла облачное обновление в catch, и тест «поздно подтверждённый подарок» краснел.
jest.mock('../app/cloud_sync', () => ({
  restoreFromCloud: () => restoreFromCloud(),
  peekCloudRestoreInFlight: () => null,
  lastCloudRestoreCompletedAt: () => 0,
}));
jest.mock('../app/gift_access_cloud', () => ({ readGiftAccessFromCloud }));
jest.mock('../app/revenuecat_projection_sync', () => ({ syncRevenueCatProjectionForAccount: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => canonicalUid) }));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()),
  DebugLogger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const KEY = 'loyalty_gift_verified_copy_v1';
const HOUR = 60 * 60 * 1000;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function copy(uid: string, untilMs: number): string {
  return JSON.stringify({ v: 1, uid, untilMs, verifiedAtMs: Date.now() });
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  canonicalUid = 'gift-user';
  readGiftAccessFromCloud.mockResolvedValue(null);
  restoreFromCloud.mockImplementation(async () => false);
  getCustomerInfo.mockResolvedValue({ entitlements: { active: {} }, activeSubscriptions: [] });
  require('../app/account_generation').beginAccountGeneration('gift-user');
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

function guard() {
  const g = require('../app/premium_guard');
  g.resetLoyaltyGiftReverifyForTests();
  g.invalidatePremiumCache();
  return g;
}

function giftEvents(): { count: () => number } {
  emitted.length = 0;
  return { count: () => emitted.filter((event) => event === 'loyalty_gift_changed').length };
}

describe('decideLoyaltyGiftCopy (чистая проверка копии)', () => {
  const { decideLoyaltyGiftCopy } = jest.requireActual('../app/gift_access_local_copy');
  const now = 1_700_000_000_000;
  it.each([
    ['нет копии', null, { active: false, reason: 'missing' }],
    ['мусор', '{oops', { active: false, reason: 'corrupt' }],
    ['не та схема', JSON.stringify({ v: 2, uid: 'u', untilMs: now + HOUR, verifiedAtMs: now }), { active: false, reason: 'corrupt' }],
    ['чужой аккаунт', JSON.stringify({ v: 1, uid: 'other', untilMs: now + HOUR, verifiedAtMs: now }), { active: false, reason: 'other_account' }],
    ['истёк', JSON.stringify({ v: 1, uid: 'u', untilMs: now - 1, verifiedAtMs: now - HOUR }), { active: false, reason: 'expired' }],
    ['слишком далеко', JSON.stringify({ v: 1, uid: 'u', untilMs: now + 40 * 24 * HOUR, verifiedAtMs: now }), { active: false, reason: 'too_far' }],
    ['активна', JSON.stringify({ v: 1, uid: 'u', untilMs: now + HOUR, verifiedAtMs: now }), { active: true, untilMs: now + HOUR }],
  ])('%s', (_label, raw, expected) => {
    expect(decideLoyaltyGiftCopy(raw, 'u', now)).toEqual(expected);
  });
});

describe('доступ по подарку лояльности (premium_guard)', () => {
  it('копия активна → доступ сразу, облако сверяет фоном и подтверждает', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: Date.now() + 10 * HOUR });
    const events = giftEvents();
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    await flush(); await flush();
    expect(readGiftAccessFromCloud).toHaveBeenCalledTimes(1);
    expect(asyncStore[KEY]).toBeDefined();
    expect(events.count()).toBe(0);
  });

  it('копия активна, облако сказало «подарка нет» → копия стёрта, один пересчёт', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: null });
    const events = giftEvents();
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    await flush(); await flush(); await flush();
    expect(asyncStore[KEY]).toBeUndefined();
    expect(events.count()).toBe(1);
  });

  it('копия активна, облако недоступно → копия остаётся, пересчёта нет', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue(null);
    const events = giftEvents();
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    await flush(); await flush();
    expect(asyncStore[KEY]).toBeDefined();
    expect(events.count()).toBe(0);
  });

  it('сверка с облаком — один раз на поколение аккаунта', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: Date.now() + 10 * HOUR });
    const g = guard();
    await g.getVerifiedPremiumAccessStatus({ bypassCache: false });
    g.invalidatePremiumCache();
    await g.getVerifiedPremiumAccessStatus();
    await flush(); await flush();
    expect(readGiftAccessFromCloud).toHaveBeenCalledTimes(1);
  });

  it('истёкшая копия не даёт доступ — решает облако', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() - 1000);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: null });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(false);
  });

  it('копия чужого аккаунта не даёт доступ', async () => {
    asyncStore[KEY] = copy('someone-else', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: null, endsAtMs: null });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(false);
  });

  it('без копии облако подтвердило подарок → доступ и копия сохранена', async () => {
    const until = Date.now() + 5 * HOUR;
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: until });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    await flush(); await flush();
    expect(JSON.parse(asyncStore[KEY])).toMatchObject({ v: 1, uid: 'gift-user', untilMs: until });
  });

  it('облако молчит дольше потолка → решаем без него; поздний «подарок есть» → копия и один пересчёт', async () => {
    const until = Date.now() + 5 * HOUR;
    let resolveLate: (value: { grantedAtMs: number; endsAtMs: number }) => void = () => undefined;
    readGiftAccessFromCloud.mockImplementation(() => new Promise((resolve) => { resolveLate = resolve; }));
    const events = giftEvents();
    const g = guard();
    const started = Date.now();
    await expect(g.getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })).resolves.toBe(false);
    expect(Date.now() - started).toBeGreaterThanOrEqual(g.LOYALTY_GIFT_CLOUD_CEILING_MS - 50);
    resolveLate({ grantedAtMs: 1, endsAtMs: until });
    await flush(); await flush(); await flush();
    expect(JSON.parse(asyncStore[KEY])).toMatchObject({ untilMs: until });
    expect(events.count()).toBe(1);
  }, 10_000);

  it('строгая проверка в момент изменения данных не верит копии — ждёт облако', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: 1, endsAtMs: null });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ bypassCache: true, allowCloudRefresh: false })).resolves.toBe(false);
  });

  it('смена аккаунта посреди сверки — поздний отказ облака не трогает копию нового аккаунта', async () => {
    asyncStore[KEY] = copy('gift-user', Date.now() + 10 * HOUR);
    let resolveLate: (value: { grantedAtMs: number | null; endsAtMs: number | null }) => void = () => undefined;
    readGiftAccessFromCloud.mockImplementation(() => new Promise((resolve) => { resolveLate = resolve; }));
    const events = giftEvents();
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    require('../app/account_generation').beginAccountGeneration('next-user');
    resolveLate({ grantedAtMs: null, endsAtMs: null });
    await flush(); await flush();
    expect(asyncStore[KEY]).toBeDefined();
    expect(events.count()).toBe(0);
  });
});

describe('ревью Opus 11.10: «нет доступа» не затирает поздно подтверждённый подарок', () => {
  it('потолок → облачное обновление успело сохранить копию → итог «доступ есть», а не закэшированное «нет»', async () => {
    const until = Date.now() + 5 * HOUR;
    readGiftAccessFromCloud.mockImplementation(() => new Promise(() => undefined));
    restoreFromCloud.mockImplementation(async () => {
      asyncStore[KEY] = copy('gift-user', until);
      return true;
    });
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(true);
  }, 10_000);

  it('облачное обновление без подарка и без копии → «нет доступа»', async () => {
    readGiftAccessFromCloud.mockResolvedValue({ grantedAtMs: null, endsAtMs: null });
    restoreFromCloud.mockImplementation(async () => true);
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus()).resolves.toBe(false);
  });

  it('строгая проверка ждёт медленное облако без потолка и видит подарок', async () => {
    const until = Date.now() + 5 * HOUR;
    readGiftAccessFromCloud.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ grantedAtMs: 1, endsAtMs: until }), 3_500);
    }));
    const g = guard();
    await expect(g.getVerifiedPremiumAccessStatus({ bypassCache: true, allowCloudRefresh: false })).resolves.toBe(true);
  }, 10_000);
});

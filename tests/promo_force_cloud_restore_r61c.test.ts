// зачем (R61c, Ревизор 61374cf4e к 258cde253): после «Готово» промокода без локальной записи VIP обычная проверка могла
// пропустить облако (TTL 30 мин / recent_restore после загрузочного восстановления) и закэшировать «нет» — до 30 мин Free.
// Принудительное восстановление идёт мимо этих пропусков; обе ветки промокода (запись упала, already_redeemed) его зовут,
// а VIP объявляют ТОЛЬКО после проверки доступа (ревью Opus: событие покупки вслепую давало Plus при истёкшем VIP).
import fs from 'node:fs';
import path from 'node:path';

const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, asyncStore[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { asyncStore[k] = v; }); }),
}));

const restoreFromCloud = jest.fn(async () => false);
let lastRestoreAt = 0;
let inFlight: Promise<unknown> | null = null;
jest.mock('../app/events', () => ({ ...jest.requireActual('../app/events'), emitAppEvent: jest.fn() }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} }, activeSubscriptions: [] })), getAppUserID: jest.fn(async () => 'promo-user') } }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  restoreFromCloud: () => restoreFromCloud(),
  peekCloudRestoreInFlight: () => inFlight,
  lastCloudRestoreCompletedAt: () => lastRestoreAt,
}));
jest.mock('../app/gift_access_cloud', () => ({ readGiftAccessFromCloud: jest.fn(async () => null) }));
jest.mock('../app/revenuecat_projection_sync', () => ({ syncRevenueCatProjectionForAccount: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'promo-user') }));
jest.mock('../app/debug-logger', () => ({
  reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()),
  DebugLogger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  lastRestoreAt = 0;
  inFlight = null;
  restoreFromCloud.mockImplementation(async () => false);
  require('../app/account_generation').beginAccountGeneration('promo-user');
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

describe('R61c: принудительное восстановление доступа из облака', () => {
  it('идёт в облако даже сразу после загрузочного восстановления (recent_restore) и подтверждает по метке', async () => {
    lastRestoreAt = Date.now() - 1_000; // обычная проверка бы пропустила облако
    restoreFromCloud.mockImplementation(async () => { lastRestoreAt = Date.now(); return false; });
    const g = require('../app/premium_guard');
    await expect(g.forcePremiumAccessCloudRestore('test')).resolves.toBe(true);
    expect(restoreFromCloud).toHaveBeenCalledTimes(1);
  });

  it('идущее восстановление не дублируется — ждём его', async () => {
    inFlight = Promise.resolve({ status: 'restored', applied: true, failureReason: null });
    const g = require('../app/premium_guard');
    await expect(g.forcePremiumAccessCloudRestore('test')).resolves.toBe(true);
    expect(restoreFromCloud).not.toHaveBeenCalled();
  });

  it('повтор в течение 2 минут не запускает второе полное чтение', async () => {
    restoreFromCloud.mockImplementation(async () => { lastRestoreAt = Date.now(); return false; });
    const g = require('../app/premium_guard');
    await g.forcePremiumAccessCloudRestore('first');
    await g.forcePremiumAccessCloudRestore('second');
    expect(restoreFromCloud).toHaveBeenCalledTimes(1);
  });

  it('сбой восстановления — не подтверждено, без броска', async () => {
    restoreFromCloud.mockImplementation(async () => { throw new Error('network'); });
    const g = require('../app/premium_guard');
    await expect(g.forcePremiumAccessCloudRestore('test')).resolves.toBe(false);
  });

  it('промокод: VIP объявляется только после проверки доступа; событие покупки в сторе не шлётся', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'promo_code_entry.tsx'), 'utf8');
    expect(src).toContain("void restorePromoAccessFromCloud('already_redeemed');");
    expect(src).toContain("if (marker === null) void restorePromoAccessFromCloud('local_write_failed');");
    const helper = src.slice(src.indexOf('async function restorePromoAccessFromCloud('), src.indexOf('export default function PromoCodeEntryScreen'));
    expect(helper).toContain('await forcePremiumAccessCloudRestore(');
    expect(helper).toContain('const ok = await getVerifiedVipStatus({ bypassCache: true });');
    expect(helper).toContain("if (ok) emitAppEvent('vip_activated');");
    expect(helper).not.toContain('premium_activated');
    const branch = src.slice(src.indexOf("if (res.status === 'already_redeemed') {"), src.indexOf("if (res.status === 'redeemed') {"));
    expect(branch).not.toContain("emitAppEvent('vip_activated')");
  });
});

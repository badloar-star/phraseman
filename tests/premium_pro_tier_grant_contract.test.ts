/**
 * Контракт тира «Pro» для БЕЗДЕНЕЖНОГО пожизненного доступа.
 *
 * зачем: владелец (2026-08-03) — получатель сертификата «Phraseman Pro —
 * навсегда» видел в настройках «Plus активирован», а в списке выданных —
 * «Выданный Plus». Причина: Pro определялся ТОЛЬКО по `premium_plan='lifetime'`
 * (его пишет стор при покупке), а сертификат/промокод/админка пишут `vip_plan`.
 * Сертификат обещает Pro на самом бланке, поэтому расхождение читалось как обман.
 *
 * Тест сторожит границу тиров, потому что она размазана по экранам (настройки,
 * лиги, публичный профиль, аура у чужих игроков) и обычные тесты этих экранов
 * работают на моках `isLifetimePlanLocal` — то есть остаются зелёными, даже если
 * сама граница уедет.
 */

const asyncStore: Record<string, string> = {};

const getItem = jest.fn(async (key: string) => asyncStore[key] ?? null);
const multiGet = jest.fn(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null]));
const multiSet = jest.fn(async (pairs: Array<[string, string]>) => {
  pairs.forEach(([key, value]) => { asyncStore[key] = value; });
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => (getItem as any)(...args),
  multiGet: (...args: unknown[]) => (multiGet as any)(...args),
  multiSet: (...args: unknown[]) => (multiSet as any)(...args),
}));
jest.mock('react-native-purchases', () => ({ default: { getCustomerInfo: jest.fn() } }));
jest.mock('../app/config', () => ({
  FORCE_PREMIUM: false,
  IS_EXPO_GO: true,
  IS_STORE_RELEASE: false,
}));
jest.mock('../app/intro_full_access', () => ({
  isIntroFullAccessActive: jest.fn(async () => false),
}));
jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud: jest.fn(async () => null),
}));
jest.mock('../app/revenuecat_projection_sync', () => ({
  syncRevenueCatProjectionForAccount: jest.fn(async () => undefined),
}));

const STABLE_ID = 'account-pro-tier';
const HOUR_MS = 60 * 60 * 1000;

/**
 * Кладёт VIP-снапшот и открывает ту же генерацию аккаунта, что и живой рантайм.
 * Порядок важен: `isLifetimePlanLocal` читает снапшот через
 * readVipSnapshotForGeneration и fail-closed игнорирует чужие/безхозные записи,
 * поэтому генерация должна быть активна на момент чтения.
 */
async function loadGuardWithVipGrant(values: Record<string, string> | null) {
  const generation = await import('../app/account_generation');
  generation.__resetAccountGenerationForTests();
  generation.beginAccountGeneration(STABLE_ID);
  if (values) {
    const storage = await import('../app/premium_vip_storage');
    await storage.writeVipSnapshotForAccount(STABLE_ID, values);
  }
  return import('../app/premium_guard');
}

describe('Pro tier covers granted lifetime access, not only store purchases', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
    getItem.mockImplementation(async (key: string) => asyncStore[key] ?? null);
    multiGet.mockImplementation(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null]));
    multiSet.mockImplementation(async (pairs: Array<[string, string]>) => {
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });
  });

  it('treats a store lifetime purchase as Pro (unchanged behaviour)', async () => {
    asyncStore.premium_plan = 'lifetime';
    const guard = await loadGuardWithVipGrant(null);
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(true);
  });

  it('treats a promo/certificate "forever" grant as Pro', async () => {
    // Ровно то, что пишет functions/src/promo_codes.ts для rewardKind='lifetime'.
    const guard = await loadGuardWithVipGrant({
      vip_active: 'true',
      vip_plan: 'promo_lifetime',
      vip_until: '0',
    });
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(true);
  });

  it('treats an open-ended admin grant as Pro', async () => {
    // Админка на «0 месяцев» пишет тот же admin_vip, что и на месяц —
    // различает их только отсутствие срока.
    const guard = await loadGuardWithVipGrant({
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: '0',
    });
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(true);
  });

  it('keeps a time-limited admin grant on Plus', async () => {
    const guard = await loadGuardWithVipGrant({
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: String(Date.now() + 30 * 24 * HOUR_MS),
    });
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
  });

  it('keeps referral and survey grants on Plus', async () => {
    for (const plan of ['referral', 'survey_vip']) {
      Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
      jest.resetModules();
      const guard = await loadGuardWithVipGrant({
        vip_active: 'true',
        vip_plan: plan,
        vip_until: String(Date.now() + 72 * HOUR_MS),
      });
      await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
    }
  });

  it('does not award Pro for a revoked lifetime grant', async () => {
    // Отзыв обнуляет план и активность: истёкший/снятый доступ не должен
    // оставлять Pro-плашку у чужих игроков.
    const guard = await loadGuardWithVipGrant({
      vip_active: 'false',
      vip_plan: '',
      vip_until: '0',
      vip_admin_override: 'false',
    });
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
  });

  it('does not award Pro when there is no grant at all', async () => {
    const guard = await loadGuardWithVipGrant(null);
    await expect(guard.isLifetimePlanLocal()).resolves.toBe(false);
  });
});

describe('settings copy derives the tier name instead of hardcoding Plus', () => {
  it('keeps every granted-access label on the shared tier name', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'),
      'utf8',
    );

    // Тир берётся из контекста, а не из локального premium_plan.
    expect(source).toContain("const tierName = isPro ? 'Pro' : 'Plus'");
    expect(source).not.toContain("premiumPlan === 'lifetime' ? 'Pro' : 'Plus'");

    // Строки, которые владелец видел неверными, больше не зашивают слово Plus.
    expect(source).not.toContain("L('Plus без срока окончания'");
    expect(source).not.toContain("L('Выданный Plus'");
    expect(source).not.toContain("L('Дополнительный Plus-доступ'");
  });
});

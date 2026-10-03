// ════════════════════════════════════════════════════════════════════════════
// revenuecat_identity_sync_dedup.test.ts — D158 (M4/M-B): syncRevenueCatIdentity делится на параллельные вызовы.
// Общий промис не зависит от callerIsCurrent первого вызывающего; каждый получает false только по СВОЕЙ проверке.
// Отдельный файл: старый revenuecat_init_identity.test.ts не компилируется из-за устаревшего типа 'max_monthly'.
// ════════════════════════════════════════════════════════════════════════════
describe('syncRevenueCatIdentity: дедупликация параллельных вызовов', () => {
  const loadSubject = async () => {
    jest.resetModules();
    jest.doMock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-123') }));
    jest.doMock('../app/account_generation', () => ({
      captureAccountGeneration: jest.fn(() => ({ generation: 1, stableId: 'stable-123', phase: 'active' })),
      isCurrentAccountGeneration: jest.fn(() => true),
      withAccountTransitionLock: jest.fn(async (work: () => Promise<unknown>) => work()),
      withAccountTransitionLockWithDeadline: jest.fn(async (work: () => Promise<unknown>) => ({ completed: true, value: await work() })),
    }));
    jest.doMock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => undefined) }));
    jest.doMock('../app/premium_guard', () => ({ invalidatePremiumCache: jest.fn(), markPremiumStoreSeenNow: jest.fn(async () => undefined) }));
    jest.doMock('../app/debug-logger', () => ({
      DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      reportSwallowed: jest.fn(),
      swallowError: () => () => {},
    }));
    return {
      revenueCat: await import('../app/revenuecat_init'),
      purchases: (await import('react-native-purchases')).default as any,
    };
  };

  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.clearAllMocks();
  });

  it('два параллельных вызова — один logIn; у первого callerIsCurrent=false, второй получает true', async () => {
    const { revenueCat, purchases } = await loadSubject();
    let release: (v: boolean) => void = () => {};
    purchases.isConfigured.mockImplementation(() => new Promise<boolean>((r) => { release = r; }));
    purchases.getAppUserID.mockResolvedValue('stable-123'); // уже на каноническом id — logIn не нужен

    const first = revenueCat.syncRevenueCatIdentity(() => false);
    const second = revenueCat.syncRevenueCatIdentity(() => true);
    release(true);

    await expect(second).resolves.toBe(true);
    await expect(first).resolves.toBe(false); // false только по собственной проверке
    expect(purchases.isConfigured).toHaveBeenCalledTimes(1); // общая работа, не две
  });

  it('вызов после завершения идущего запускает новую синхронизацию', async () => {
    const { revenueCat, purchases } = await loadSubject();
    purchases.isConfigured.mockResolvedValue(true);
    purchases.getAppUserID.mockResolvedValue('stable-123');

    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(true);
    await expect(revenueCat.syncRevenueCatIdentity()).resolves.toBe(true);
    expect(purchases.isConfigured).toHaveBeenCalledTimes(2);
  });
});

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

describe('account-scoped VIP storage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
    multiSet.mockReset();
    getItem.mockReset();
    multiGet.mockReset();
    multiSet.mockImplementation(async (pairs: Array<[string, string]>) => {
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });
    getItem.mockImplementation(async (key: string) => asyncStore[key] ?? null);
    multiGet.mockImplementation(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null]));
  });

  it('preserves B when A native commit settles after timeout, wipe, and B activation', async () => {
    const storage = await import('../app/premium_vip_storage');
    let settleAccountA!: () => void;
    let accountAStarted!: () => void;
    const accountAStart = new Promise<void>((resolve) => { accountAStarted = resolve; });
    const accountAPending = new Promise<void>((resolve) => { settleAccountA = resolve; });

    multiSet.mockImplementationOnce(async (pairs: Array<[string, string]>) => {
      accountAStarted();
      await accountAPending;
      // This is the actual native commit happening after the JS-side drain timed out.
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });

    const accountAWrite = storage.writeVipSnapshotForAccount('stable-A', {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_from: '100',
      vip_until: '9999999999999',
      vip_admin_override: 'true',
      vip_admin_grant_at: '100',
    });
    await accountAStart;

    // The bounded drain expires. Account A is wiped and account B is activated.
    Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
    await storage.writeVipSnapshotForAccount('stable-B', {
      vip_active: 'true',
      vip_plan: 'survey_vip',
      vip_from: '200',
      vip_until: '9999999999998',
      vip_admin_override: 'true',
      vip_admin_grant_at: '200',
    });

    settleAccountA();
    await accountAWrite;

    const accountB = await storage.readVipSnapshotForAccount('stable-B');
    expect(accountB).toMatchObject({
      vip_active: 'true',
      vip_plan: 'survey_vip',
      vip_admin_grant_at: '200',
    });
    expect(accountB?.vip_plan).not.toBe('admin_vip');

    // A may only recreate its own unreachable bucket. No compensating late delete
    // is allowed because it could erase B's newer state.
    expect(JSON.parse(asyncStore[storage.vipSnapshotStorageKey('stable-A')])).toMatchObject({
      ownerStableId: 'stable-A',
    });
    expect(JSON.parse(asyncStore[storage.vipSnapshotStorageKey('stable-B')])).toMatchObject({
      ownerStableId: 'stable-B',
      values: { vip_plan: 'survey_vip' },
    });
  });

  it('fails closed instead of migrating a legacy mirror owned by another account', async () => {
    const storage = await import('../app/premium_vip_storage');
    asyncStore[storage.VIP_LEGACY_OWNER_KEY] = 'stable-A';
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'admin_vip';
    asyncStore.vip_until = '9999999999999';
    asyncStore.vip_admin_override = 'true';

    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toBeNull();
    expect(asyncStore[storage.vipSnapshotStorageKey('stable-B')]).toBeUndefined();
  });

  it('migrates an unowned legacy snapshot only through explicit generation-bound bootstrap', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-B');
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'referral';
    asyncStore.vip_until = '9999999999999';
    asyncStore.vip_admin_override = 'true';

    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toBeNull();
    await expect(storage.migrateLegacyVipSnapshotOnce(generation.captureAccountGeneration()))
      .resolves.toBe(true);
    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toMatchObject({
      vip_active: 'true',
      vip_plan: 'referral',
    });
    expect(asyncStore[storage.VIP_LEGACY_OWNER_KEY]).toBe('stable-B');
    expect(asyncStore[storage.VIP_LEGACY_MIGRATION_CONSUMED_KEY]).toBe('1');
    expect(JSON.parse(asyncStore[storage.vipSnapshotStorageKey('stable-B')])).toMatchObject({
      ownerStableId: 'stable-B',
      values: { vip_plan: 'referral' },
    });
  });

  it('fails closed for consumed/crash states and malformed scoped ownership', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-B');
    asyncStore[storage.VIP_LEGACY_MIGRATION_CONSUMED_KEY] = '1';
    asyncStore[storage.VIP_LEGACY_OWNER_KEY] = 'stable-A';
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'admin_vip';
    asyncStore.vip_until = '9999999999999';

    await expect(storage.migrateLegacyVipSnapshotOnce(generation.captureAccountGeneration()))
      .resolves.toBe(false);
    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toBeNull();

    asyncStore[storage.vipSnapshotStorageKey('stable-B')] = JSON.stringify({
      version: 1,
      ownerStableId: 'stable-A',
      values: { vip_active: 'true', vip_plan: 'admin_vip' },
    });
    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toBeNull();
  });

  it('aborts explicit legacy migration when the account changes during native commit', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'admin_vip';
    asyncStore.vip_until = '9999999999999';
    const tokenA = generation.captureAccountGeneration();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    multiSet.mockImplementationOnce(async (pairs: Array<[string, string]>) => {
      await pending;
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });

    const migration = storage.migrateLegacyVipSnapshotOnce(tokenA);
    await Promise.resolve();
    generation.beginAccountGeneration('stable-B');
    release();
    await expect(migration).resolves.toBe(false);
    await expect(storage.readVipSnapshotForAccount('stable-B')).resolves.toBeNull();
  });

  it('lets only A claim ownerless migration when B activates while A native commit is pending', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    asyncStore.vip_active = 'true';
    asyncStore.vip_plan = 'admin_vip';
    asyncStore.vip_until = '9999999999999';
    const tokenA = generation.captureAccountGeneration();
    let releaseA!: () => void;
    let startedA!: () => void;
    const pendingA = new Promise<void>((resolve) => { releaseA = resolve; });
    const startA = new Promise<void>((resolve) => { startedA = resolve; });
    multiSet.mockImplementationOnce(async (pairs: Array<[string, string]>) => {
      startedA();
      await pendingA;
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });

    const migrationA = storage.migrateLegacyVipSnapshotOnce(tokenA);
    await startA;
    generation.beginAccountGeneration('stable-B');
    const tokenB = generation.captureAccountGeneration();
    await expect(storage.migrateLegacyVipSnapshotOnce(tokenB)).resolves.toBe(false);
    releaseA();
    await expect(migrationA).resolves.toBe(false);
    await expect(storage.readVipSnapshotForGeneration(tokenB)).resolves.toBeNull();
  });

  it('drops a scoped read whose native get resolves after account transition', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    await storage.writeVipSnapshotForAccount('stable-A', {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: '9999999999999',
    });
    const tokenA = generation.captureAccountGeneration();
    const rawA = asyncStore[storage.vipSnapshotStorageKey('stable-A')];
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    getItem.mockImplementationOnce(async () => {
      await pending;
      return rawA;
    });

    const staleRead = storage.readVipSnapshotForGeneration(tokenA);
    generation.beginAccountGeneration('stable-B');
    release();
    await expect(staleRead).resolves.toBeNull();
  });

  it('generation-bound cloud writer checks ownership immediately before global mirrors', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-A');
    const tokenA = generation.captureAccountGeneration();
    generation.beginAccountGeneration('stable-B');
    multiSet.mockClear();
    await expect(storage.writeVipSnapshotForGeneration(tokenA, {
      vip_active: 'true', vip_plan: 'level_spin', vip_until: '9999999999999',
    })).resolves.toBe(false);
    expect(multiSet).not.toHaveBeenCalled();
    expect(asyncStore.vip_plan).toBeUndefined();
    expect(asyncStore[storage.vipSnapshotStorageKey('stable-B')]).toBeUndefined();
  });

  it('does not let a late A VIP read overwrite B true in the shared guard cache', async () => {
    const storage = await import('../app/premium_vip_storage');
    const generation = await import('../app/account_generation');
    const guard = await import('../app/premium_guard');
    generation.beginAccountGeneration('stable-A');
    await storage.writeVipSnapshotForAccount('stable-A', {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: '9999999999999',
      vip_admin_override: 'true',
    });
    const accountAKey = storage.vipSnapshotStorageKey('stable-A');
    const rawA = asyncStore[accountAKey];
    let releaseA!: () => void;
    let startedA!: () => void;
    const pendingA = new Promise<void>((resolve) => { releaseA = resolve; });
    const startA = new Promise<void>((resolve) => { startedA = resolve; });
    getItem.mockImplementation(async (key: string) => {
      if (key === accountAKey) {
        startedA();
        await pendingA;
        return rawA;
      }
      return asyncStore[key] ?? null;
    });

    const staleA = guard.getVerifiedVipStatus();
    await startA;
    generation.beginAccountGeneration('stable-B');
    guard.invalidatePremiumCache();
    await storage.writeVipSnapshotForAccount('stable-B', {
      vip_active: 'true',
      vip_plan: 'survey_vip',
      vip_until: '9999999999998',
      vip_admin_override: 'true',
    });
    await expect(guard.getVerifiedVipStatus()).resolves.toBe(true);
    releaseA();
    await expect(staleA).resolves.toBe(false);

    delete asyncStore[storage.vipSnapshotStorageKey('stable-B')];
    await expect(guard.getVerifiedVipStatus()).resolves.toBe(true);
  });
});

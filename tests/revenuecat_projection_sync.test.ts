import fs from 'fs';
import path from 'path';

const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallable);
const mockInitAppCheck = jest.fn(async () => true);

jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitAppCheck,
}));
jest.mock('../app/callable_timeout', () => ({
  withCallableTimeout: <T>(promise: Promise<T>) => promise,
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({ name: 'test' }) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({ region: 'us-central1' }),
  httpsCallable: mockHttpsCallable,
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockCallable.mockResolvedValue({
    data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2' },
  });
});

describe('RevenueCat client projection sync', () => {
  it('coalesces concurrent calls and remembers success once per account', async () => {
    const sourcePath = path.join(process.cwd(), 'app', 'revenuecat_projection_sync.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const { syncRevenueCatProjectionForAccount } = require('../app/revenuecat_projection_sync');

    const [first, second] = await Promise.all([
      syncRevenueCatProjectionForAccount('stable-a'),
      syncRevenueCatProjectionForAccount('stable-a'),
    ]);
    const third = await syncRevenueCatProjectionForAccount('stable-a');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(true);
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith({});
  });

  it('isolates in-flight and successful state by account', async () => {
    const sourcePath = path.join(process.cwd(), 'app', 'revenuecat_projection_sync.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const { syncRevenueCatProjectionForAccount } = require('../app/revenuecat_projection_sync');

    await Promise.all([
      syncRevenueCatProjectionForAccount('stable-a'),
      syncRevenueCatProjectionForAccount('stable-b'),
    ]);

    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it('does not mark a failed or inactive sync as successful', async () => {
    const sourcePath = path.join(process.cwd(), 'app', 'revenuecat_projection_sync.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const { syncRevenueCatProjectionForAccount } = require('../app/revenuecat_projection_sync');
    mockCallable
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { ok: true, active: false, reconciled: false } })
      .mockResolvedValueOnce({
        data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2' },
      });

    await expect(syncRevenueCatProjectionForAccount('stable-a')).rejects.toThrow('offline');
    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(false);
    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(true);
    expect(mockCallable).toHaveBeenCalledTimes(3);
  });

  it('caches only a response that confirms RevenueCat V2 verification', async () => {
    const { syncRevenueCatProjectionForAccount } = require('../app/revenuecat_projection_sync');
    mockCallable
      .mockResolvedValueOnce({ data: { ok: true, active: true, reconciled: false, source: 'firestore' } })
      .mockResolvedValue({ data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2' } });

    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(false);
    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(true);
    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(true);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it('uses App Check, bounded account caches and the auth-only callable payload', () => {
    const sourcePath = path.join(process.cwd(), 'app', 'revenuecat_projection_sync.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'revenueCatPremiumReconcileMine'");
    expect(source).toContain('initFirebaseAppCheckIfAvailable');
    expect(source).toContain('withCallableTimeout');
    expect(source).toContain('MAX_TRACKED_ACCOUNTS');
    expect(source).not.toContain('stableId: stableUid');
  });

  it('polls a bounded number of times until the exact MAX projection is confirmed', async () => {
    const { confirmRevenueCatMaxProjectionForAccount } = require('../app/revenuecat_projection_sync');
    mockCallable
      .mockResolvedValueOnce({ data: { ok: true, active: false, reconciled: false } })
      .mockResolvedValueOnce({ data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2', plan: 'monthly' } })
      .mockResolvedValueOnce({ data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2', plan: 'max_monthly', maxActive: true } });

    await expect(confirmRevenueCatMaxProjectionForAccount('stable-a', {
      maxAttempts: 3,
      retryDelayMs: 0,
    })).resolves.toBe(true);
    expect(mockCallable).toHaveBeenCalledTimes(3);
  });

  it('uses five 1.25 second default polls, matching the server MAX not-found retry window', () => {
    const subject = require('../app/revenuecat_projection_sync');
    expect(subject.MAX_ACTIVATION_DEFAULT_ATTEMPTS).toBe(5);
    expect(subject.MAX_ACTIVATION_DEFAULT_RETRY_DELAY_MS).toBe(1_250);
  });

  it('stops polling when the purchase account generation becomes stale', async () => {
    const { confirmRevenueCatMaxProjectionForAccount } = require('../app/revenuecat_projection_sync');
    let current = true;
    mockCallable.mockImplementation(async () => {
      current = false;
      return { data: { ok: true, active: false, reconciled: false } };
    });

    await expect(confirmRevenueCatMaxProjectionForAccount('stable-a', {
      maxAttempts: 5,
      retryDelayMs: 0,
      isCurrent: () => current,
    })).resolves.toBe(false);
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('bypasses a cached Plus success only through the exact bounded MAX activation intent', async () => {
    const {
      confirmRevenueCatMaxProjectionForAccount,
      syncRevenueCatProjectionForAccount,
    } = require('../app/revenuecat_projection_sync');
    mockCallable
      .mockResolvedValueOnce({
        data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2', plan: 'monthly' },
      })
      .mockResolvedValueOnce({
        data: { ok: true, active: true, reconciled: true, source: 'revenuecat_v2', plan: 'max_monthly', maxActive: true },
      });

    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(true);
    await expect(confirmRevenueCatMaxProjectionForAccount('stable-a', {
      maxAttempts: 1,
      retryDelayMs: 0,
    })).resolves.toBe(true);
    await expect(syncRevenueCatProjectionForAccount('stable-a')).resolves.toBe(true);

    expect(mockCallable).toHaveBeenCalledTimes(2);
    expect(mockCallable.mock.calls).toEqual([
      [{}],
      [{ intent: 'max_activation', expectedProductId: 'phraseman_max_monthly_v1' }],
    ]);
  });
});

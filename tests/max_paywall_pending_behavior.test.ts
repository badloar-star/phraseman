import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  finishMaxPaywallNavigation,
  isMaxPaywallPrimaryActionDisabled,
  isMaxPaywallRestoreDisabled,
  maxPaywallAnalyticsSource,
  runMaxPaywallPrimaryAction,
  shouldShowMaxPaywallPrimarySpinner,
} from '../modules/max_subscription/paywall_state';
import {
  MAX_PENDING_ACTIVATION_STORAGE_KEY,
  MAX_PENDING_ACTIVATION_TTL_MS,
  __maxPendingActivationTestHooks,
  clearPendingMaxActivationForGeneration,
  hasPendingMaxActivationForCurrentAccount,
  maxPendingActivationStorageKey,
  persistPendingMaxActivationForGeneration,
  persistPendingMaxActivationForCurrentAccount,
} from '../modules/max_subscription/pending';

let mockStableId = 'stable-a';

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: mockStableId, phase: 'active' }),
  isCurrentAccountGeneration: (token: { stableId: string }) => token.stableId === mockStableId,
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const secureStorage = SecureStore as typeof SecureStore & { __reset?: () => void };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('MAX paywall pending purchase latch', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    storage.__reset?.();
    secureStorage.__reset?.();
    await AsyncStorage.clear();
    mockStableId = 'stable-a';
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1_500);
  });

  it('allows activation-only retry without a loaded store package', () => {
    expect(isMaxPaywallPrimaryActionDisabled({
      loading: false,
      pendingHydrated: true,
      storeConfirmed: true,
      hasPackage: false,
      busy: false,
    })).toBe(false);
  });

  it('requires a loaded store package before starting a new purchase', () => {
    expect(isMaxPaywallPrimaryActionDisabled({
      loading: false,
      pendingHydrated: true,
      storeConfirmed: false,
      hasPackage: false,
      busy: false,
    })).toBe(true);
  });

  it('keeps restore available without an offering only before any purchase is pending', () => {
    expect(isMaxPaywallRestoreDisabled({
      pendingHydrated: true,
      storeConfirmed: false,
      busy: false,
    })).toBe(false);
    expect(isMaxPaywallRestoreDisabled({
      pendingHydrated: true,
      storeConfirmed: true,
      busy: false,
    })).toBe(true);
  });

  it('renders the activation label instead of an offering spinner for a pending purchase', () => {
    expect(shouldShowMaxPaywallPrimarySpinner({
      loading: true,
      pendingHydrated: true,
      storeConfirmed: true,
      busy: false,
    })).toBe(false);
    expect(shouldShowMaxPaywallPrimarySpinner({
      loading: true,
      pendingHydrated: true,
      storeConfirmed: false,
      busy: false,
    })).toBe(true);
  });

  it('bounds MAX analytics source to established non-sensitive route identifiers', () => {
    expect(maxPaywallAnalyticsSource(['paywall_e'])).toBe('paywall_e');
    expect(maxPaywallAnalyticsSource('voice_max_required')).toBe('voice_max_required');
    expect(maxPaywallAnalyticsSource('email=user@example.com')).toBe('direct');
  });

  it('dismisses back to home after MAX activation opened from a Plus paywall', () => {
    const router = { back: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() };

    finishMaxPaywallNavigation('paywall_e', router);

    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('preserves the caller stack for voice prestart activation retry', () => {
    const router = { back: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() };

    finishMaxPaywallNavigation('max_call_prestart', router);

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('turns a pending store result into activation-only mode and never purchases twice', async () => {
    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    const confirm = jest.fn(async () => false);
    let storeConfirmed = false;

    const firstTap = await runMaxPaywallPrimaryAction(storeConfirmed, { purchase, confirm });
    storeConfirmed = firstTap.storeConfirmed;
    const secondTap = await runMaxPaywallPrimaryAction(storeConfirmed, { purchase, confirm });

    expect(firstTap.purchaseResult?.status).toBe('pending');
    expect(secondTap.purchaseResult).toBeUndefined();
    expect(storeConfirmed).toBe(true);
    expect(purchase).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('hydrates pending activation after remount and never opens a second store purchase', async () => {
    await expect(persistPendingMaxActivationForCurrentAccount(1_000)).resolves.toBe(true);
    const hydrated = await hasPendingMaxActivationForCurrentAccount(1_001);
    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    const confirm = jest.fn(async () => false);

    const action = await runMaxPaywallPrimaryAction(hydrated, { purchase, confirm });

    expect(action.storeConfirmed).toBe(true);
    expect(purchase).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(await maxPendingActivationStorageKey('stable-a'))).not.toBeNull();
  });

  it('does not latch a pending purchase to another account and keeps the keys physically isolated', async () => {
    await persistPendingMaxActivationForCurrentAccount(1_000);
    const accountAKey = await maxPendingActivationStorageKey('stable-a');
    mockStableId = 'stable-b';
    const accountBKey = await maxPendingActivationStorageKey('stable-b');

    await expect(hasPendingMaxActivationForCurrentAccount(1_001)).resolves.toBe(false);
    await expect(AsyncStorage.getItem(accountAKey)).resolves.not.toBeNull();
    await expect(AsyncStorage.getItem(accountBKey)).resolves.toBeNull();
  });

  it('expires the bounded marker and permits a fresh store purchase', async () => {
    await persistPendingMaxActivationForCurrentAccount(1_000);
    const hydrated = await hasPendingMaxActivationForCurrentAccount(
      1_000 + MAX_PENDING_ACTIVATION_TTL_MS + 1,
    );
    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    const confirm = jest.fn(async () => false);

    await runMaxPaywallPrimaryAction(hydrated, { purchase, confirm });

    expect(hydrated).toBe(false);
    expect(purchase).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(await maxPendingActivationStorageKey('stable-a'))).toBeNull();
  });

  it('fails closed into activation-only mode when the pending marker cannot be read', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('storage_unavailable'));

    await expect(hasPendingMaxActivationForCurrentAccount(1_000)).resolves.toBe(true);
  });

  it('keeps the current mount activation-only when both durable backends are unavailable', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('async_unavailable'));
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('secure_unavailable'));

    await expect(hasPendingMaxActivationForCurrentAccount(1_000)).resolves.toBe(true);
  });

  it('survives an AsyncStorage write failure and remounts from the SecureStore mirror', async () => {
    storage.setItem.mockRejectedValueOnce(new Error('async_write_failed'));
    await expect(persistPendingMaxActivationForCurrentAccount(1_000)).resolves.toBe(true);
    const key = await maxPendingActivationStorageKey('stable-a');
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(key)).resolves.not.toBeNull();

    const hydrated = await hasPendingMaxActivationForCurrentAccount(1_001);
    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    const confirm = jest.fn(async () => false);
    await runMaxPaywallPrimaryAction(hydrated, { purchase, confirm });

    expect(hydrated).toBe(true);
    expect(purchase).not.toHaveBeenCalled();
  });

  it('repairs a malformed primary marker conservatively with a bounded 24-hour latch', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    await AsyncStorage.setItem(key, '{broken-json');

    await expect(hasPendingMaxActivationForCurrentAccount(5_000)).resolves.toBe(true);
    const asyncMarker = JSON.parse((await AsyncStorage.getItem(key)) ?? '{}');
    const secureMarker = JSON.parse((await SecureStore.getItemAsync(key)) ?? '{}');
    expect(asyncMarker).toMatchObject({
      stableId: 'stable-a',
      createdAtMs: 5_000,
      expiresAtMs: 5_000 + MAX_PENDING_ACTIVATION_TTL_MS,
    });
    expect(secureMarker).toEqual(asyncMarker);

    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    await runMaxPaywallPrimaryAction(true, { purchase, confirm: async () => false });
    expect(purchase).not.toHaveBeenCalled();
  });

  it('repairs a foreign payload found under the current hashed key instead of trusting it', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    await AsyncStorage.setItem(key, JSON.stringify({
      version: 1,
      stableId: 'stable-foreign',
      createdAtMs: 5_000,
      expiresAtMs: 5_000 + MAX_PENDING_ACTIVATION_TTL_MS,
    }));

    await expect(hasPendingMaxActivationForCurrentAccount(6_000)).resolves.toBe(true);
    const repaired = JSON.parse((await AsyncStorage.getItem(key)) ?? '{}');
    expect(repaired).toMatchObject({
      stableId: 'stable-a',
      createdAtMs: 6_000,
      expiresAtMs: 6_000 + MAX_PENDING_ACTIVATION_TTL_MS,
    });
  });

  it('uses deterministic SHA-256 account keys and intentionally ignores the unreleased global prototype key', async () => {
    const accountAKey = await maxPendingActivationStorageKey('stable-a');
    const accountBKey = await maxPendingActivationStorageKey('stable-b');
    expect(accountAKey).toMatch(/^max_pending_activation_v1\.[0-9a-f]{64}$/);
    expect(accountBKey).not.toBe(accountAKey);
    await AsyncStorage.setItem(MAX_PENDING_ACTIVATION_STORAGE_KEY, JSON.stringify({
      version: 1,
      stableId: 'stable-a',
      createdAtMs: 1_000,
      expiresAtMs: 1_000 + MAX_PENDING_ACTIVATION_TTL_MS,
    }));

    await expect(hasPendingMaxActivationForCurrentAccount(1_001)).resolves.toBe(false);
    await expect(AsyncStorage.getItem(accountAKey)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(MAX_PENDING_ACTIVATION_STORAGE_KEY)).resolves.not.toBeNull();
  });

  it('keeps an expired readable marker latched when the second backend is unreadable and does not clear', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    await persistPendingMaxActivationForCurrentAccount(1_000);
    const expiredRaw = await AsyncStorage.getItem(key);
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('secure_unreadable'));

    await expect(hasPendingMaxActivationForCurrentAccount(
      1_000 + MAX_PENDING_ACTIVATION_TTL_MS + 1,
    )).resolves.toBe(true);
    await expect(AsyncStorage.getItem(key)).resolves.toBe(expiredRaw);
    expect(storage.removeItem).not.toHaveBeenCalledWith(key);
  });

  it('unlocks only after both readable backends prove the marker expired', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    await persistPendingMaxActivationForCurrentAccount(1_000);

    await expect(hasPendingMaxActivationForCurrentAccount(
      1_000 + MAX_PENDING_ACTIVATION_TTL_MS + 1,
    )).resolves.toBe(false);
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(key)).resolves.toBeNull();
  });

  it('a late account-A set after timeout cannot overwrite account B marker', async () => {
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1);
    const lateSet = deferred<void>();
    const originalSet = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementationOnce(async (key, value) => {
      await lateSet.promise;
      await originalSet(key, value);
    });
    const generationA = { generation: 1, stableId: 'stable-a', phase: 'active' as const };
    const pendingA = persistPendingMaxActivationForGeneration(generationA, 1_000);
    await expect(pendingA).resolves.toBe(false);

    mockStableId = 'stable-b';
    await persistPendingMaxActivationForCurrentAccount(2_000);
    const accountBKey = await maxPendingActivationStorageKey('stable-b');
    const beforeLateA = await AsyncStorage.getItem(accountBKey);
    lateSet.resolve();
    await __maxPendingActivationTestHooks.waitForMutationTail('stable-a');

    await expect(AsyncStorage.getItem(accountBKey)).resolves.toBe(beforeLateA);
  });

  it('a late account-A delete after timeout cannot delete account B marker', async () => {
    await persistPendingMaxActivationForCurrentAccount(1_000);
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1);
    const lateDelete = deferred<void>();
    const originalDelete = storage.removeItem.getMockImplementation()!;
    storage.removeItem.mockImplementationOnce(async (key) => {
      await lateDelete.promise;
      await originalDelete(key);
    });
    const generationA = { generation: 1, stableId: 'stable-a', phase: 'active' as const };
    await expect(clearPendingMaxActivationForGeneration(generationA)).resolves.toBe(true);

    mockStableId = 'stable-b';
    await persistPendingMaxActivationForCurrentAccount(2_000);
    const accountBKey = await maxPendingActivationStorageKey('stable-b');
    lateDelete.resolve();
    await __maxPendingActivationTestHooks.waitForMutationTail('stable-a');

    await expect(AsyncStorage.getItem(accountBKey)).resolves.not.toBeNull();
  });

  it('queues a new same-account pending write behind a timed-out expired-marker delete', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    await persistPendingMaxActivationForCurrentAccount(1_000);
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1);
    const lateDelete = deferred<void>();
    const originalDelete = storage.removeItem.getMockImplementation()!;
    storage.removeItem.mockImplementationOnce(async (targetKey) => {
      await lateDelete.promise;
      await originalDelete(targetKey);
    });

    await expect(hasPendingMaxActivationForCurrentAccount(
      1_000 + MAX_PENDING_ACTIVATION_TTL_MS + 1,
    )).resolves.toBe(true);
    const queuedWrite = persistPendingMaxActivationForCurrentAccount(2_000);
    await expect(queuedWrite).resolves.toBe(false);

    lateDelete.resolve();
    await __maxPendingActivationTestHooks.waitForMutationTail('stable-a');
    const finalAsync = JSON.parse((await AsyncStorage.getItem(key)) ?? '{}');
    const finalSecure = JSON.parse((await SecureStore.getItemAsync(key)) ?? '{}');
    expect(finalAsync.createdAtMs).toBe(2_000);
    expect(finalSecure).toEqual(finalAsync);
  });

  it('a late old same-account set settles before a queued newer set and cannot win', async () => {
    const key = await maxPendingActivationStorageKey('stable-a');
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1);
    const lateSet = deferred<void>();
    const originalSet = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementationOnce(async (targetKey, value) => {
      await lateSet.promise;
      await originalSet(targetKey, value);
    });

    await expect(persistPendingMaxActivationForCurrentAccount(1_000)).resolves.toBe(false);
    await expect(persistPendingMaxActivationForCurrentAccount(2_000)).resolves.toBe(false);
    lateSet.resolve();
    await __maxPendingActivationTestHooks.waitForMutationTail('stable-a');

    const finalAsync = JSON.parse((await AsyncStorage.getItem(key)) ?? '{}');
    const finalSecure = JSON.parse((await SecureStore.getItemAsync(key)) ?? '{}');
    expect(finalAsync.createdAtMs).toBe(2_000);
    expect(finalSecure).toEqual(finalAsync);
  });

  it('keeps expiry activation-only while delete is unsettled, then unlocks after confirmed absence', async () => {
    await persistPendingMaxActivationForCurrentAccount(1_000);
    __maxPendingActivationTestHooks.setOperationTimeoutMs(1);
    const lateSecureDelete = deferred<void>();
    const originalSecureDelete = (SecureStore.deleteItemAsync as jest.Mock).getMockImplementation()!;
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementationOnce(async (targetKey: string) => {
      await lateSecureDelete.promise;
      await originalSecureDelete(targetKey);
    });
    const expiredNow = 1_000 + MAX_PENDING_ACTIVATION_TTL_MS + 1;

    const hydrated = await hasPendingMaxActivationForCurrentAccount(expiredNow);
    const purchase = jest.fn(async () => ({ status: 'pending' as const }));
    await runMaxPaywallPrimaryAction(hydrated, { purchase, confirm: async () => false });
    expect(hydrated).toBe(true);
    expect(purchase).not.toHaveBeenCalled();

    lateSecureDelete.resolve();
    await __maxPendingActivationTestHooks.waitForMutationTail('stable-a');
    await expect(hasPendingMaxActivationForCurrentAccount(expiredNow)).resolves.toBe(false);
  });
});

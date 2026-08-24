import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../../app/account_generation';

export const MAX_PENDING_ACTIVATION_STORAGE_KEY = 'max_pending_activation_v1' as const;
export const MAX_PENDING_ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
let maxPendingStorageOperationTimeoutMs = 1_500;
const mutationTailByKey = new Map<string, Promise<void>>();

type SecureStoreModule = typeof import('expo-secure-store');
type PendingMaxActivationMarker = Readonly<{
  version: 1;
  stableId: string;
  createdAtMs: number;
  expiresAtMs: number;
}>;
type BackendRead = Readonly<{ available: boolean; readable: boolean; raw: string | null }>;

// This feature has not shipped, so there is deliberately no migration from the
// old global prototype key. Only the SHA-256 account key is read or mutated.
export async function maxPendingActivationStorageKey(stableId: string): Promise<string> {
  const normalized = stableId.trim();
  if (!normalized) throw new Error('max_pending_activation_stable_id_required');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
  return `${MAX_PENDING_ACTIVATION_STORAGE_KEY}.${digest.toLowerCase()}`;
}

export const __maxPendingActivationTestHooks = {
  setOperationTimeoutMs(timeoutMs: number): void {
    maxPendingStorageOperationTimeoutMs = Math.max(0, timeoutMs);
  },
  async waitForMutationTail(stableId: string): Promise<void> {
    const key = await maxPendingActivationStorageKey(stableId);
    while (true) {
      const tail = mutationTailByKey.get(key);
      if (!tail) return;
      await tail;
      if (!mutationTailByKey.has(key)) return;
    }
  },
};

function getSecureStore(): SecureStoreModule | null {
  try {
    // Keep web/Expo Go usable when the native module is not linked.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

async function bounded<T>(operation: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), maxPendingStorageOperationTimeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function enqueueMutation<T>(
  key: string,
  mutation: () => Promise<T>,
  timeoutFallback: T,
): Promise<T> {
  const previous = mutationTailByKey.get(key) ?? Promise.resolve();
  const actual = previous.then(mutation);
  const tail = actual.then(() => undefined, () => undefined);
  mutationTailByKey.set(key, tail);
  void tail.then(() => {
    if (mutationTailByKey.get(key) === tail) mutationTailByKey.delete(key);
  });
  return bounded(actual, timeoutFallback);
}

async function waitForPendingMutation(key: string): Promise<boolean> {
  const tail = mutationTailByKey.get(key);
  if (!tail) return true;
  return bounded(tail.then(() => true), false);
}

function parseMarker(raw: string | null): PendingMaxActivationMarker | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingMaxActivationMarker>;
    if (
      value.version !== 1
      || typeof value.stableId !== 'string'
      || !value.stableId.trim()
      || typeof value.createdAtMs !== 'number'
      || !Number.isSafeInteger(value.createdAtMs)
      || typeof value.expiresAtMs !== 'number'
      || !Number.isSafeInteger(value.expiresAtMs)
      || value.expiresAtMs <= value.createdAtMs
      || value.expiresAtMs - value.createdAtMs > MAX_PENDING_ACTIVATION_TTL_MS
    ) return null;
    return value as PendingMaxActivationMarker;
  } catch {
    return null;
  }
}

function markerFor(stableId: string, nowMs: number): PendingMaxActivationMarker {
  return {
    version: 1,
    stableId,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + MAX_PENDING_ACTIVATION_TTL_MS,
  };
}

async function readBackends(key: string): Promise<readonly [BackendRead, BackendRead]> {
  const secureStore = getSecureStore();
  return Promise.all([
    bounded(
      AsyncStorage.getItem(key)
        .then((raw) => ({ available: true, readable: true, raw })),
      { available: true, readable: false, raw: null },
    ),
    secureStore
      ? bounded(
        secureStore.getItemAsync(key)
          .then((raw) => ({ available: true, readable: true, raw })),
        { available: true, readable: false, raw: null },
      )
      : Promise.resolve({ available: false, readable: false, raw: null }),
  ]);
}

async function writeMarker(key: string, marker: PendingMaxActivationMarker): Promise<boolean> {
  const raw = JSON.stringify(marker);
  const secureStore = getSecureStore();
  return enqueueMutation(key, async () => {
    const [asyncStored, secureStored] = await Promise.all([
      (async () => {
        try {
          await AsyncStorage.setItem(key, raw);
          return await AsyncStorage.getItem(key) === raw;
        } catch {
          return false;
        }
      })(),
      secureStore
        ? (async () => {
          try {
            await secureStore.setItemAsync(key, raw);
            return await secureStore.getItemAsync(key) === raw;
          } catch {
            return false;
          }
        })()
        : Promise.resolve(false),
    ]);
    return asyncStored || secureStored;
  }, false);
}

async function removeMarkersBestEffort(key: string): Promise<boolean> {
  const secureStore = getSecureStore();
  return enqueueMutation(key, async () => {
    const [asyncCleared, secureCleared] = await Promise.all([
      (async () => {
        try {
          await AsyncStorage.removeItem(key);
          return await AsyncStorage.getItem(key) === null;
        } catch {
          return false;
        }
      })(),
      secureStore
        ? (async () => {
          try {
            await secureStore.deleteItemAsync(key);
            return await secureStore.getItemAsync(key) === null;
          } catch {
            return false;
          }
        })()
        : Promise.resolve(true),
    ]);
    return asyncCleared && secureCleared;
  }, false);
}

export async function persistPendingMaxActivationForGeneration(
  generation: AccountGenerationToken,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
  return withAccountTransitionLock(async () => {
    if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
    const key = await maxPendingActivationStorageKey(generation.stableId);
    if (!isCurrentAccountGeneration(generation)) return false;
    const persisted = await writeMarker(key, markerFor(generation.stableId, nowMs));
    return persisted && isCurrentAccountGeneration(generation);
  });
}

export async function persistPendingMaxActivationForCurrentAccount(
  nowMs = Date.now(),
): Promise<boolean> {
  return persistPendingMaxActivationForGeneration(captureAccountGeneration(), nowMs);
}

export async function hasPendingMaxActivationForCurrentAccount(
  nowMs = Date.now(),
): Promise<boolean> {
  const generation = captureAccountGeneration();
  if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
  return withAccountTransitionLock(async () => {
    if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
    const key = await maxPendingActivationStorageKey(generation.stableId);
    if (!isCurrentAccountGeneration(generation)) return false;
    if (!await waitForPendingMutation(key)) return true;
    const reads = await readBackends(key);
    const parsed = reads.map((result) => {
      if (!result.readable) return null;
      const marker = parseMarker(result.raw);
      return marker && marker.expiresAtMs <= nowMs + MAX_PENDING_ACTIVATION_TTL_MS
        ? marker
        : null;
    });
    const activeCurrent = parsed
      .filter((marker): marker is PendingMaxActivationMarker => marker !== null)
      .filter((marker) => marker.stableId === generation.stableId && marker.expiresAtMs > nowMs)
      .sort((left, right) => right.expiresAtMs - left.expiresAtMs)[0];
    if (activeCurrent) {
      await writeMarker(key, activeCurrent);
      return isCurrentAccountGeneration(generation);
    }

    const validMarkers = parsed.filter((marker): marker is PendingMaxActivationMarker => marker !== null);
    const foreignMarker = validMarkers.some(
      (marker) => marker.stableId !== generation.stableId,
    );
    const malformedSeen = reads.some(
      (result, index) => result.readable && result.raw !== null && parsed[index] === null,
    );
    if (malformedSeen || foreignMarker) {
      await writeMarker(key, markerFor(generation.stableId, nowMs));
      return isCurrentAccountGeneration(generation);
    }

    if (reads.some((result) => result.available && !result.readable)) return true;

    // Every available backend is readable and contains only absence or an
    // expired current-account marker. This is the sole unlock/clear branch.
    return await removeMarkersBestEffort(key) ? false : true;
  });
}

export async function clearPendingMaxActivationForGeneration(
  generation: AccountGenerationToken,
): Promise<boolean> {
  if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
  return withAccountTransitionLock(async () => {
    if (!generation.stableId || !isCurrentAccountGeneration(generation)) return false;
    const key = await maxPendingActivationStorageKey(generation.stableId);
    if (!isCurrentAccountGeneration(generation)) return false;
    await removeMarkersBestEffort(key);
    return isCurrentAccountGeneration(generation);
  });
}

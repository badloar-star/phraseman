// ═══════════════════════════════════════════════════════════════════════════
// remote_config_client.ts — fetches admin-managed config from Firestore and
// feeds it into the remote_flags layer.
//
// Source of truth doc: remote_config/app  →  { numbers: {...}, bools: {...} }
// Admin writes it from admin/index.html (Remote Config tab); clients read it.
//
// Mirrors the proven app_messages pattern: lazy @react-native-firebase import,
// graceful no-op on web / Expo Go / cloud-sync-off, AsyncStorage cache so the
// last known config survives offline launches and applies before the network
// round-trips.
// ═══════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import {
  registerInteractiveNetworkQuietParticipant,
  withBackgroundNetworkLease,
} from './interactive_network_quiet';
import { applyRemoteConfigSnapshot } from './remote_flags';
import { runtimeAppStateStore } from './runtime_app_state_store';
import { DebugLogger } from './debug-logger';

const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
const REMOTE_CONFIG_CACHE_KEY = 'remote_config_cache_v1';
const REMOTE_CONFIG_LIVE_REFRESH_MS = 5 * 60_000;
const REMOTE_CONFIG_FAILURE_BACKOFF_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000] as const;
const REMOTE_CONFIG_MAX_CACHE_BYTES = 64 * 1024;
const REMOTE_CONFIG_MAX_KEYS_PER_SECTION = 256;
const REMOTE_CONFIG_MAX_KEY_LENGTH = 100;
const REMOTE_CONFIG_MAX_TEXT_LENGTH = 4_096;
const REMOTE_CONFIG_NUMBER_ARRAY_KEYS = new Set(['friends_level_thresholds', 'friends_chest_tiers']);

type RawConfig = {
  numbers?: Record<string, unknown>;
  bools?: Record<string, unknown>;
  texts?: Record<string, unknown>;
};

type FirestoreFactory = () => {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => RawConfig | undefined }>;
    };
  };
};

const boundedUtf8Bytes = (value: string, max: number): number => {
  if (value.length > max) throw new Error('remote_config_overflow');
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x7f) bytes += 1;
    else if (unit <= 0x7ff) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > max) throw new Error('remote_config_overflow');
  }
  return bytes;
};

async function getFirestoreModule(): Promise<FirestoreFactory | null> {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const mod = await import('@react-native-firebase/firestore');
    return mod.default as unknown as FirestoreFactory;
  } catch {
    return null;
  }
}

const dataRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  if (keys.length > REMOTE_CONFIG_MAX_KEYS_PER_SECTION) return null;
  const record = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable || !('value' in descriptor) ||
      key.length === 0 || key.length > REMOTE_CONFIG_MAX_KEY_LENGTH ||
      key === '__proto__' || key === 'prototype' || key === 'constructor') return null;
    record[key] = descriptor.value;
  }
  return record;
};

function sanitizeRaw(raw: unknown): RawConfig {
  const top = dataRecord(raw);
  const numberInput = dataRecord(top?.numbers) ?? {};
  const boolInput = dataRecord(top?.bools) ?? {};
  const textInput = dataRecord(top?.texts) ?? {};
  const numbers: Record<string, unknown> = {};
  const bools: Record<string, boolean> = {};
  const texts: Record<string, string> = {};

  for (const [key, value] of Object.entries(numberInput)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      // Keep the persisted wire snapshot canonical too; remote_flags repeats
      // the clamp at consumption so malformed cache/network input cannot widen
      // the PhoneState cohort after restart.
      numbers[key] = key === 'phone_state_cutover_percent'
        ? Math.round(Math.max(0, Math.min(100, value)))
        : value;
    } else if (
      REMOTE_CONFIG_NUMBER_ARRAY_KEYS.has(key)
      && Array.isArray(value)
      && value.length > 0
      && value.length <= 10
      && value.every((item) => typeof item === 'number' && Number.isFinite(item))
    ) {
      // Эти две серверные ручки по контракту являются массивами. Сохраняем только
      // узкий allowlist; общий remote-config по-прежнему отбрасывает произвольные массивы.
      numbers[key] = [...value];
    }
  }
  for (const [key, value] of Object.entries(boolInput)) {
    if (typeof value === 'boolean') bools[key] = value;
  }
  for (const [key, value] of Object.entries(textInput)) {
    if (typeof value === 'string' && value.length <= REMOTE_CONFIG_MAX_TEXT_LENGTH) texts[key] = value;
  }

  return Object.freeze({
    numbers: Object.freeze(numbers),
    bools: Object.freeze(bools),
    texts: Object.freeze(texts),
  });
}

function applyAndCache(raw: RawConfig | undefined): void {
  const clean = sanitizeRaw(raw);
  const encoded = JSON.stringify(clean);
  try { boundedUtf8Bytes(encoded, REMOTE_CONFIG_MAX_CACHE_BYTES); } catch { return; }
  applyRemoteConfigSnapshot(clean);
  emitAppEvent('remote_config_changed');
  void AsyncStorage.setItem(REMOTE_CONFIG_CACHE_KEY, encoded).catch(() => {});
}

/**
 * Applies the persisted admin flags before route components take their first
 * visibility decision. Network refresh remains deliberately separate.
 */
export async function primeRemoteConfigCacheFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_CONFIG_CACHE_KEY);
    if (!raw) return;
    boundedUtf8Bytes(raw, REMOTE_CONFIG_MAX_CACHE_BYTES);
    const parsed = JSON.parse(raw) as RawConfig;
    applyRemoteConfigSnapshot(sanitizeRaw(parsed));
    emitAppEvent('remote_config_changed');
  } catch (e) {
      // Cache is best-effort.
      DebugLogger.error('remote_config_client:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * One-shot load at startup: apply cache immediately (so flags are right before
 * the network responds), then fetch the live doc once. Safe to call always.
 */
export async function loadRemoteConfig(): Promise<void> {
  if (startupLoadPromise) return startupLoadPromise;
  explicitRefreshDemand += 1;
  const loading = (async () => {
    try {
      await primeRemoteConfigCacheFromStorage();
      await refreshRemoteConfigFromNetwork();
    } catch (e) {
      // Keep cache/defaults on any failure (offline, permission, or session deferral).
      DebugLogger.error('remote_config_client:loading', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
      explicitRefreshDemand = Math.max(0, explicitRefreshDemand - 1);
    }
  })().finally(() => {
    if (startupLoadPromise === loading) startupLoadPromise = null;
  });
  startupLoadPromise = loading;
  return loading;
}

const hasRemoteRefreshDemand = (): boolean => explicitRefreshDemand > 0 || (
  liveSubscriberCount > 0 && liveAppActive && !livePausedForInteractiveSession
);

async function readRemoteConfigFromNetwork(): Promise<RawConfig | null> {
  return withBackgroundNetworkLease('remote_config.load', async (lease) => {
    lease.assertCurrent();
    const factory = await getFirestoreModule();
    lease.assertCurrent();
    if (!factory) return null;
    const db = factory();
    lease.assertCurrent();
    // Recheck after the dynamic import and immediately before the native call.
    // A removed final subscriber must not start a read merely because its timer
    // callback had already entered this function.
    if (!hasRemoteRefreshDemand()) return null;
    // Do not Promise.race a native Firestore read: a JS timeout would detach
    // still-live native traffic from the interactive-session fence.
    const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
    lease.assertCurrent();
    if (!hasRemoteRefreshDemand()) return null;
    return snap.exists ? snap.data() ?? {} : null;
  });
}

/**
 * Live refresh: keeps flags in sync while the app is open. RN Firebase's
 * onSnapshot unsubscribe is a void bridge command and cannot prove that its
 * native stream has physically stopped. A foreground-only five-minute one-shot refresh
 * preserves live admin updates while making every native read an exact,
 * non-abandoning network lease. Returns an unsubscribe handle.
 */
let liveSubscriberCount = 0;
let livePausedForInteractiveSession = false;
let liveAppActive = runtimeAppStateStore.getSnapshot();
let liveRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let liveRefreshPromise: Promise<void> | null = null;
let liveRefreshPromiseGeneration = -1;
let liveRefreshPendingAfterInFlight = false;
let sharedNetworkRefreshPromise: Promise<RawConfig | null> | null = null;
let startupLoadPromise: Promise<void> | null = null;
let explicitRefreshDemand = 0;
let liveFailureCount = 0;
let liveGeneration = 0;

const stopLiveRefreshTimer = (): void => {
  if (liveRefreshTimer !== null) clearTimeout(liveRefreshTimer);
  liveRefreshTimer = null;
};

const scheduleNextLiveRefresh = (): void => {
  stopLiveRefreshTimer();
  if (livePausedForInteractiveSession || !liveAppActive || liveSubscriberCount === 0) return;
  const baseDelay = liveFailureCount === 0
    ? REMOTE_CONFIG_LIVE_REFRESH_MS
    : REMOTE_CONFIG_FAILURE_BACKOFF_MS[Math.min(
      liveFailureCount - 1,
      REMOTE_CONFIG_FAILURE_BACKOFF_MS.length - 1,
    )]!;
  const delay = baseDelay + Math.floor(Math.random() * Math.max(1, baseDelay * 0.1));
  const ticket = liveGeneration;
  liveRefreshTimer = setTimeout(() => {
    liveRefreshTimer = null;
    if (ticket !== liveGeneration) return;
    void startLiveRefresh();
  }, delay);
};

const refreshRemoteConfigFromNetwork = (): Promise<RawConfig | null> => {
  if (sharedNetworkRefreshPromise) return sharedNetworkRefreshPromise;
  const refresh = readRemoteConfigFromNetwork().then((raw) => {
    if (raw && hasRemoteRefreshDemand()) applyAndCache(raw);
    return raw;
  }).finally(() => {
    if (sharedNetworkRefreshPromise === refresh) sharedNetworkRefreshPromise = null;
  });
  sharedNetworkRefreshPromise = refresh;
  return refresh;
};

const startLiveRefresh = (): Promise<void> => {
  if (livePausedForInteractiveSession || !liveAppActive || liveSubscriberCount === 0) {
    return Promise.resolve();
  }
  if (liveRefreshPromise) {
    if (liveRefreshPromiseGeneration !== liveGeneration) {
      liveRefreshPendingAfterInFlight = true;
    }
    return liveRefreshPromise;
  }
  stopLiveRefreshTimer();
  const ticket = liveGeneration;
  liveRefreshPendingAfterInFlight = false;
  const source = startupLoadPromise ?? refreshRemoteConfigFromNetwork().then(() => undefined);
  const refresh = source.then(() => {
    if (ticket === liveGeneration) liveFailureCount = 0;
  }).catch(() => {
    // Cache/defaults remain and the next bounded refresh retries.
    if (ticket === liveGeneration) liveFailureCount = Math.min(
      liveFailureCount + 1,
      REMOTE_CONFIG_FAILURE_BACKOFF_MS.length,
    );
  }).finally(() => {
    if (liveRefreshPromise === refresh) liveRefreshPromise = null;
    liveRefreshPromiseGeneration = -1;
    if (liveRefreshPendingAfterInFlight && hasRemoteRefreshDemand()) {
      liveRefreshPendingAfterInFlight = false;
      void startLiveRefresh();
    } else if (ticket === liveGeneration) {
      scheduleNextLiveRefresh();
    }
  });
  liveRefreshPromise = refresh;
  liveRefreshPromiseGeneration = ticket;
  return refresh;
};

registerInteractiveNetworkQuietParticipant('remote_config.poll', {
  quiesce: async () => {
    liveGeneration += 1;
    const ticket = liveGeneration;
    livePausedForInteractiveSession = true;
    liveRefreshPendingAfterInFlight = false;
    stopLiveRefreshTimer();
    if (liveRefreshPromise) await liveRefreshPromise;
    if (ticket === liveGeneration && livePausedForInteractiveSession) {
      stopLiveRefreshTimer();
    }
  },
  resume: () => {
    liveGeneration += 1;
    livePausedForInteractiveSession = false;
    void startLiveRefresh();
  },
});

export function subscribeRemoteConfig(): { remove: () => void } {
  let disposed = false;
  liveSubscriberCount += 1;
  void startLiveRefresh();

  return {
    remove: () => {
      if (disposed) return;
      disposed = true;
      liveSubscriberCount = Math.max(0, liveSubscriberCount - 1);
      if (liveSubscriberCount === 0) {
        liveGeneration += 1;
        liveRefreshPendingAfterInFlight = false;
        stopLiveRefreshTimer();
      }
    },
  };
}

runtimeAppStateStore.subscribe(() => {
  const active = runtimeAppStateStore.getSnapshot();
  if (liveAppActive === active) return;
  liveAppActive = active;
  liveGeneration += 1;
  if (!active) {
    liveRefreshPendingAfterInFlight = false;
    stopLiveRefreshTimer();
  }
  else void startLiveRefresh();
});

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

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
import { applyRemoteConfigSnapshot } from './remote_flags';

const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';
const REMOTE_CONFIG_CACHE_KEY = 'remote_config_cache_v1';

type RawConfig = {
  numbers?: Record<string, unknown>;
  bools?: Record<string, unknown>;
  texts?: Record<string, unknown>;
};

type FirestoreFactory = () => {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => RawConfig | undefined }>;
      onSnapshot: (
        onNext: (snap: { exists: boolean; data: () => RawConfig | undefined }) => void,
        onError?: (e: unknown) => void,
      ) => () => void;
    };
  };
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

function sanitizeRaw(raw: RawConfig | undefined): RawConfig {
  if (!raw || typeof raw !== 'object') return {};
  const numbers = raw.numbers && typeof raw.numbers === 'object' ? raw.numbers : {};
  const bools = raw.bools && typeof raw.bools === 'object' ? raw.bools : {};
  const texts = raw.texts && typeof raw.texts === 'object' ? raw.texts : {};
  return { numbers, bools, texts };
}

function applyAndCache(raw: RawConfig | undefined): void {
  const clean = sanitizeRaw(raw);
  applyRemoteConfigSnapshot(clean);
  emitAppEvent('remote_config_changed');
  void AsyncStorage.setItem(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(clean)).catch(() => {});
}

async function applyCachedConfig(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_CONFIG_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as RawConfig;
    applyRemoteConfigSnapshot(sanitizeRaw(parsed));
  } catch {
    // Cache is best-effort.
  }
}

/**
 * One-shot load at startup: apply cache immediately (so flags are right before
 * the network responds), then fetch the live doc once. Safe to call always.
 */
const REMOTE_CONFIG_FETCH_TIMEOUT_MS = 3000;

export async function loadRemoteConfig(): Promise<void> {
  await applyCachedConfig();
  const factory = await getFirestoreModule();
  if (!factory) return;
  try {
    const db = factory();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('remote_config_timeout')), REMOTE_CONFIG_FETCH_TIMEOUT_MS),
    );
    const snap = await Promise.race([
      db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get(),
      timeout,
    ]);
    if (snap.exists) applyAndCache(snap.data());
  } catch {
    // Keep cache/defaults on any failure (offline, timeout, permission).
  }
}

/**
 * Live subscription: keeps flags in sync while the app is open (admin changes
 * propagate within seconds). Returns an unsubscribe fn. No-op handle on web/
 * Expo Go.
 */
export function subscribeRemoteConfig(): { remove: () => void } {
  let disposed = false;
  let unsub: null | (() => void) = null;

  void getFirestoreModule().then((factory) => {
    if (disposed || !factory) return;
    try {
      const db = factory();
      unsub = db
        .collection(REMOTE_CONFIG_COLLECTION)
        .doc(REMOTE_CONFIG_DOC)
        .onSnapshot(
          (snap) => {
            if (snap.exists) applyAndCache(snap.data());
          },
          () => {
            // Ignore snapshot errors; cache/defaults remain.
          },
        );
    } catch {
      // ignore
    }
  });

  return {
    remove: () => {
      disposed = true;
      if (unsub) {
        try {
          unsub();
        } catch {
          // ignore
        }
        unsub = null;
      }
    },
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

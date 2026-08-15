import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCosmeticAssetCatalogRevision,
  replaceCosmeticSaleOverrides,
} from '../constants/cosmetic_asset_availability';
import { IS_EXPO_GO } from './config';
import { emitAppEvent } from './events';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const CACHE_KEY = 'cosmetic_asset_catalog_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FUNCTIONS_REGION = 'us-central1';

type CatalogCache = {
  schemaVersion: 1;
  fetchedAtMs: number;
  revision: number;
  values: Record<string, boolean>;
};

let appliedCatalogFingerprint: string | null = null;
let remoteRefreshInFlight: Promise<void> | null = null;

function parseCatalog(value: unknown): CatalogCache | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const source = row.values;
  if (row.schemaVersion !== 1 || !source || typeof source !== 'object' || Array.isArray(source)) return null;
  const values: Record<string, boolean> = {};
  for (const [key, forSale] of Object.entries(source as Record<string, unknown>)) {
    if (/^(aura|avatar|achievement|other):[A-Za-z0-9._-]{1,160}$/.test(key)
      && typeof forSale === 'boolean') values[key] = forSale;
  }
  return {
    schemaVersion: 1,
    fetchedAtMs: Math.max(0, Math.floor(Number(row.fetchedAtMs) || 0)),
    revision: Math.max(0, Math.floor(Number(row.revision) || 0)),
    values,
  };
}

function applyCatalog(cache: CatalogCache): void {
  if (cache.revision < getCosmeticAssetCatalogRevision()) return;
  const fingerprint = JSON.stringify([
    cache.revision,
    Object.entries(cache.values).sort(([left], [right]) => left.localeCompare(right)),
  ]);
  if (fingerprint === appliedCatalogFingerprint) return;
  appliedCatalogFingerprint = fingerprint;
  replaceCosmeticSaleOverrides(cache.values, cache.revision);
  emitAppEvent('cosmetic_asset_catalog_changed');
}

async function refreshRemoteCatalog(): Promise<void> {
  try {
    await initFirebaseAppCheckIfAvailable();
    // Lazy native imports keep Expo Go and the first app frame free of Firebase work.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app') as typeof import('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as typeof import('@react-native-firebase/functions');
    const call = httpsCallable<
      Record<string, never>,
      { ok?: boolean; schemaVersion?: number; revision?: number; values?: Record<string, boolean> }
    >(getFunctions(getApp(), FUNCTIONS_REGION), 'cosmeticAssetCatalogGet');
    const response = await call({});
    const next = parseCatalog({
      schemaVersion: response.data?.schemaVersion,
      fetchedAtMs: Date.now(),
      revision: response.data?.revision,
      values: response.data?.values,
    });
    if (!next) return;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
    applyCatalog(next);
  } catch {
    // The cached/default catalog remains authoritative while offline.
  }
}

export async function hydrateCosmeticAssetCatalog(force = false): Promise<void> {
  let cached: CatalogCache | null = null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    cached = raw ? parseCatalog(JSON.parse(raw)) : null;
  } catch {
    cached = null;
  }
  if (cached) applyCatalog(cached);
  if (!force && cached && Date.now() - cached.fetchedAtMs < CACHE_TTL_MS) return;
  if (IS_EXPO_GO) return;
  if (!remoteRefreshInFlight) {
    remoteRefreshInFlight = refreshRemoteCatalog().finally(() => {
      remoteRefreshInFlight = null;
    });
  }
  await remoteRefreshInFlight;
}

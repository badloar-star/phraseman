import type { V2PublishedSeasonManifestView } from './release_manifest';

export interface V2ReleaseCache {
  get(key: string): Promise<V2PublishedSeasonManifestView | undefined>;
  set(key: string, view: V2PublishedSeasonManifestView): Promise<void>;
  clear(): Promise<void>;
}

export function createV2ReleaseCache(options: { maxEntries: number; ttlMs: number; now?: () => number }): V2ReleaseCache {
  if (!Number.isSafeInteger(options.maxEntries) || options.maxEntries < 1 || !Number.isFinite(options.ttlMs) || options.ttlMs <= 0) throw new Error('v2_release_cache_options_invalid');
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, { view: V2PublishedSeasonManifestView; expiresAt: number }>();
  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) { entries.delete(key); return undefined; }
      entries.delete(key); entries.set(key, entry);
      return entry.view;
    },
    async set(key, view) {
      entries.delete(key);
      entries.set(key, { view, expiresAt: now() + options.ttlMs });
      while (entries.size > options.maxEntries) entries.delete(entries.keys().next().value as string);
    },
    async clear() { entries.clear(); },
  };
}

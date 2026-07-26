import type { ProgressSnapshot } from "./progress_types";

const MAX_ENTRIES = 8;
const TTL_MS = 5 * 60 * 1000;
type Entry = { readonly snapshot: ProgressSnapshot; readonly storedAt: number };
const cache = new Map<string, Entry>();

const prune = (now: number): void => {
  for (const [key, value] of cache) if (now - value.storedAt > TTL_MS) cache.delete(key);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
};

export const peekProgress = (accountKey: string, now = Date.now()): ProgressSnapshot | undefined => {
  prune(now);
  const entry = cache.get(accountKey);
  return entry ? entry.snapshot : undefined;
};

export const primeProgressPeek = (accountKey: string, snapshot: ProgressSnapshot, now = Date.now()): void => {
  cache.set(accountKey, { snapshot, storedAt: now });
  prune(now);
};

export const clearProgressPeek = (accountKey?: string): void => {
  if (accountKey) cache.delete(accountKey); else cache.clear();
};

export const __resetProgressPeekForTests = clearProgressPeek;

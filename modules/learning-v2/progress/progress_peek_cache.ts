import type { ProgressSnapshot } from "./progress_types";

const MAX_ENTRIES = 8;
const TTL_MS = 5 * 60 * 1000;
export type ProgressPeekRecord = { readonly snapshot: ProgressSnapshot; readonly revision: number };
type Entry = ProgressPeekRecord & { readonly storedAt: number };
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

export const peekProgressRecord = (accountKey: string, now = Date.now()): ProgressPeekRecord | undefined => {
  prune(now);
  const entry = cache.get(accountKey);
  return entry ? { snapshot: entry.snapshot, revision: entry.revision } : undefined;
};

export const primeProgressPeek = (accountKey: string, snapshot: ProgressSnapshot, revision: number, now = Date.now()): void => {
  cache.set(accountKey, { snapshot, revision, storedAt: now });
  prune(now);
};

export const clearProgressPeek = (accountKey?: string): void => {
  if (accountKey) cache.delete(accountKey); else cache.clear();
};

export const __resetProgressPeekForTests = clearProgressPeek;

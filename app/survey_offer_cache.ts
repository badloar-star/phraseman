import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import type { SurveyOfferSnapshot } from './survey_offer_model';

export type SurveyOfferScope = { stableId: string; dayKey: string; lang: Lang };
type Entry = { snapshot: SurveyOfferSnapshot | null; writtenAtMs: number; requestId: number };

const TTL_MS = 26 * 60 * 60_000;
const MAX_ENTRIES = 4;
const STORAGE_KEY = 'survey_offer_cache_v1';
const cache = new Map<string, Entry>();
let nextRequestId = 0;

function key(scope: SurveyOfferScope): string {
  return JSON.stringify([scope.stableId, scope.dayKey, scope.lang]);
}

function prune(nowMs: number): void {
  for (const [entryKey, entry] of cache) {
    if (nowMs - entry.writtenAtMs > TTL_MS) cache.delete(entryKey);
  }
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

function persist(): void {
  const entries = [...cache.entries()].slice(-MAX_ENTRIES);
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
}

/** Loads the last known survey decision before Home mounts, so 4/5 never flips visibly. */
export async function primeSurveyOfferCacheFromStorage(nowMs = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (!Array.isArray(item) || typeof item[0] !== 'string' || !item[1] || typeof item[1] !== 'object') continue;
      const entry = item[1] as Partial<Entry>;
      if (typeof entry.writtenAtMs !== 'number' || nowMs - entry.writtenAtMs > TTL_MS) continue;
      cache.set(item[0], {
        snapshot: entry.snapshot && typeof entry.snapshot === 'object' ? entry.snapshot as SurveyOfferSnapshot : null,
        writtenAtMs: entry.writtenAtMs,
        requestId: typeof entry.requestId === 'number' ? entry.requestId : 0,
      });
    }
    prune(nowMs);
  } catch {
    // Cached survey state is best-effort only.
  }
}

export function peekSurveyOffer(scope: SurveyOfferScope, nowMs = Date.now()): SurveyOfferSnapshot | null {
  const entry = cache.get(key(scope));
  if (!entry || nowMs - entry.writtenAtMs > TTL_MS) return null;
  return entry.snapshot;
}

export function beginSurveyOfferRequest(scope: SurveyOfferScope, nowMs = Date.now()): number {
  prune(nowMs);
  const requestId = ++nextRequestId;
  const entryKey = key(scope);
  const current = cache.get(entryKey);
  cache.set(entryKey, { snapshot: current?.snapshot ?? null, writtenAtMs: current?.writtenAtMs ?? nowMs, requestId });
  prune(nowMs);
  return requestId;
}

export function commitSurveyOfferRequest(scope: SurveyOfferScope, requestId: number, snapshot: SurveyOfferSnapshot | null, nowMs = Date.now()): boolean {
  const entryKey = key(scope);
  const current = cache.get(entryKey);
  if (!current || current.requestId !== requestId) return false;
  if (current.snapshot?.phase === 'completed' && snapshot == null) return false;
  cache.delete(entryKey);
  cache.set(entryKey, { snapshot, writtenAtMs: nowMs, requestId });
  prune(nowMs);
  persist();
  return true;
}

export function resetSurveyOfferCacheForTests(): void {
  cache.clear();
  nextRequestId = 0;
}

export default function __RouteShim() { return null; }

import type { Lang } from '../constants/i18n';
import type { SurveyDailyChallengeSnapshot } from './survey_daily_challenge_model';

export type SurveyDailyTaskScope = { stableId: string; dayKey: string; lang: Lang };
type Entry = { snapshot: SurveyDailyChallengeSnapshot | null; writtenAtMs: number; requestId: number };

const TTL_MS = 60_000;
const MAX_ENTRIES = 4;
const cache = new Map<string, Entry>();
let nextRequestId = 0;

function key(scope: SurveyDailyTaskScope): string {
  return JSON.stringify([scope.stableId, scope.dayKey, scope.lang]);
}

function prune(nowMs: number): void {
  for (const [entryKey, entry] of cache) {
    if (nowMs - entry.writtenAtMs > TTL_MS) cache.delete(entryKey);
  }
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export function peekSurveyDailyTask(scope: SurveyDailyTaskScope, nowMs = Date.now()): SurveyDailyChallengeSnapshot | null {
  const entry = cache.get(key(scope));
  if (!entry || nowMs - entry.writtenAtMs > TTL_MS) return null;
  return entry.snapshot;
}

export function beginSurveyDailyTaskRequest(scope: SurveyDailyTaskScope, nowMs = Date.now()): number {
  prune(nowMs);
  const requestId = ++nextRequestId;
  const entryKey = key(scope);
  const current = cache.get(entryKey);
  cache.set(entryKey, { snapshot: current?.snapshot ?? null, writtenAtMs: current?.writtenAtMs ?? nowMs, requestId });
  prune(nowMs);
  return requestId;
}

export function commitSurveyDailyTaskRequest(scope: SurveyDailyTaskScope, requestId: number, snapshot: SurveyDailyChallengeSnapshot | null, nowMs = Date.now()): boolean {
  const entryKey = key(scope);
  const current = cache.get(entryKey);
  if (!current || current.requestId !== requestId) return false;
  if (current.snapshot?.phase === 'completed' && snapshot == null) return false;
  cache.delete(entryKey);
  cache.set(entryKey, { snapshot, writtenAtMs: nowMs, requestId });
  prune(nowMs);
  return true;
}

export function resetSurveyDailyTaskCacheForTests(): void {
  cache.clear();
  nextRequestId = 0;
}

export default function __RouteShim() { return null; }

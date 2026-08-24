import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { PhraseAnalyticsResult } from './phrase_analytics';
import {
  peekScreenSnapshotForToken,
  rememberScreenSnapshot,
  screenSnapshotKey,
} from './screen_snapshot_store';

/** Идентификатор экрана в общем дисковом снапшоте (screen_snapshot_store). */
const SCREEN_ID = 'phrase-analytics';

export type PhraseAnalyticsWarmValue = {
  data: PhraseAnalyticsResult | null;
};

type Entry = { key: string; value: PhraseAnalyticsWarmValue; updatedAt: number };
export type PhraseAnalyticsRequest = Readonly<{
  key: string | null;
  token: AccountGenerationToken;
  requestId: number;
}>;

const TTL_MS = 45_000;
let entry: Entry | null = null;
let latestRequestId = 0;

const cacheKey = (token: AccountGenerationToken, contentKey: string): string | null => {
  const account = accountScopeKey(token);
  return account ? `${account}:phrase-analytics:${contentKey}` : null;
};

export function readPhraseAnalyticsWarm(
  token: AccountGenerationToken,
  contentKey: string,
  now = Date.now(),
): { value: PhraseAnalyticsWarmValue; isFresh: boolean } | null {
  const key = cacheKey(token, contentKey);
  if (!key || !isCurrentAccountGeneration(token)) return null;
  if (entry?.key === key) return { value: entry.value, isFresh: now - entry.updatedAt <= TTL_MS };
  // зачем: entry живёт только в памяти процесса — после холодного старта экран
  // показывал скелетон вместо аналитики. Поднимаем снапшот прошлой сессии (его
  // положил бутстрап одним общим чтением): цифры видны с первого кадра, а полный
  // пересчёт идёт фоном и тихо уточняет (isFresh:false).
  const restored = peekScreenSnapshotForToken<PhraseAnalyticsWarmValue>(
    SCREEN_ID, token, { variant: contentKey, nowMs: now },
  );
  if (!restored) return null;
  return { value: restored, isFresh: false };
}

export function beginPhraseAnalyticsRequest(
  token: AccountGenerationToken,
  contentKey: string,
): PhraseAnalyticsRequest {
  latestRequestId += 1;
  return { key: cacheKey(token, contentKey), token, requestId: latestRequestId };
}

export function commitPhraseAnalyticsWarm(
  request: PhraseAnalyticsRequest,
  value: PhraseAnalyticsWarmValue,
  now = Date.now(),
): boolean {
  if (!request.key || request.requestId !== latestRequestId || !isCurrentAccountGeneration(request.token)) return false;
  entry = { key: request.key, value, updatedAt: now };
  // зачем: зеркалим на диск — следующий холодный старт откроет аналитику мгновенно.
  const marker = ':phrase-analytics:';
  const at = request.key.indexOf(marker);
  rememberScreenSnapshot(
    screenSnapshotKey(SCREEN_ID, request.token, at < 0 ? '' : request.key.slice(at + marker.length)),
    value,
    now,
  );
  return true;
}

export function isPhraseAnalyticsRequestCurrent(request: PhraseAnalyticsRequest): boolean {
  return !!request.key
    && request.requestId === latestRequestId
    && isCurrentAccountGeneration(request.token);
}

export function resetPhraseAnalyticsWarmForTests(): void {
  entry = null;
  latestRequestId = 0;
}

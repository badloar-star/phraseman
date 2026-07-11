import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { PhraseAnalyticsResult } from './phrase_analytics';
import type { ResolvedPersonalTrainingsState } from './diagnosis_training_progress';

export type PhraseAnalyticsWarmValue = {
  data: PhraseAnalyticsResult | null;
  resolved: ResolvedPersonalTrainingsState | null;
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
  if (!key || entry?.key !== key || !isCurrentAccountGeneration(token)) return null;
  return { value: entry.value, isFresh: now - entry.updatedAt <= TTL_MS };
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

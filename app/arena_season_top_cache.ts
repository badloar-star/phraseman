import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { SeasonTopResult } from './services/arena_season_client';

type Entry = { key: string; value: SeasonTopResult; updatedAt: number };
export type SeasonTopRequest = Readonly<{
  key: string | null;
  expectedSeasonId: string;
  token: AccountGenerationToken;
  requestId: number;
}>;

const TTL_MS = 30_000;
let entry: Entry | null = null;
let latestRequestId = 0;

export const seasonTopCacheKey = (token: AccountGenerationToken, seasonId: string): string | null => {
  const account = accountScopeKey(token);
  return account ? `${account}:season-top:${seasonId}` : null;
};

export function readSeasonTop(token: AccountGenerationToken, seasonId: string, now = Date.now()) {
  const key = seasonTopCacheKey(token, seasonId);
  if (!key || entry?.key !== key || !isCurrentAccountGeneration(token)) return null;
  return { value: entry.value, isFresh: now - entry.updatedAt <= TTL_MS };
}

export function beginSeasonTopRequest(token: AccountGenerationToken, seasonId: string): SeasonTopRequest {
  latestRequestId += 1;
  return { key: seasonTopCacheKey(token, seasonId), expectedSeasonId: seasonId, token, requestId: latestRequestId };
}

export function isSeasonTopRequestCurrent(request: SeasonTopRequest): boolean {
  return !!request.key && request.requestId === latestRequestId && isCurrentAccountGeneration(request.token);
}

export function commitSeasonTop(request: SeasonTopRequest, value: SeasonTopResult, now = Date.now()): boolean {
  if (!isSeasonTopRequestCurrent(request) || value.seasonId !== request.expectedSeasonId) return false;
  entry = { key: request.key!, value, updatedAt: now };
  return true;
}

export function resetSeasonTopCacheForTests(): void { entry = null; latestRequestId = 0; }

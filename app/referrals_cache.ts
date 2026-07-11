import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { ReferralInvite } from './referral_vip';

type Entry = Readonly<{ value: ReferralInvite[]; updatedAt: number }>;
export type ReferralInvitesRequest = Readonly<{
  key: string | null;
  token: AccountGenerationToken;
  requestId: number;
}>;

type PersistedPayload = Readonly<{
  version: 2;
  stableUid: string;
  value: ReferralInvite[];
  updatedAt: number;
}>;

const TTL_MS = 60_000;
const MAX_ENTRIES = 2;
const entries = new Map<string, Entry>();
let latestRequestId = 0;

export function referralInvitesCacheKey(token: AccountGenerationToken): string | null {
  const account = accountScopeKey(token);
  return account ? `${account}:referral-invites` : null;
}

export function readReferralInvites(
  token: AccountGenerationToken,
  now = Date.now(),
): { value: ReferralInvite[]; isFresh: boolean } | null {
  const key = referralInvitesCacheKey(token);
  const cached = key ? entries.get(key) : undefined;
  if (!key || !cached || !isCurrentAccountGeneration(token)) return null;
  return { value: cached.value, isFresh: now - cached.updatedAt <= TTL_MS };
}

export function beginReferralInvitesRequest(token: AccountGenerationToken): ReferralInvitesRequest {
  latestRequestId += 1;
  return { key: referralInvitesCacheKey(token), token, requestId: latestRequestId };
}

export function isReferralInvitesRequestCurrent(request: ReferralInvitesRequest): boolean {
  return !!request.key
    && request.requestId === latestRequestId
    && isCurrentAccountGeneration(request.token);
}

export function commitReferralInvites(
  request: ReferralInvitesRequest,
  value: ReferralInvite[],
  updatedAt = Date.now(),
): boolean {
  if (!isReferralInvitesRequestCurrent(request)) return false;
  entries.delete(request.key!);
  entries.set(request.key!, { value, updatedAt });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
  return true;
}

export function invalidateReferralInvites(token: AccountGenerationToken): void {
  const key = referralInvitesCacheKey(token);
  if (key) entries.delete(key);
}

export function hydrateReferralInvitesIfEmpty(
  token: AccountGenerationToken,
  value: ReferralInvite[],
  updatedAt: number,
): boolean {
  const key = referralInvitesCacheKey(token);
  if (!key || entries.has(key) || !isCurrentAccountGeneration(token)) return false;
  entries.set(key, { value, updatedAt });
  return true;
}

export function serializeReferralInvites(
  token: AccountGenerationToken,
  value: ReferralInvite[],
  updatedAt = Date.now(),
): string | null {
  const stableUid = token.phase === 'active' ? String(token.stableId ?? '').trim() : '';
  if (!stableUid) return null;
  return JSON.stringify({ version: 2, stableUid, value, updatedAt } satisfies PersistedPayload);
}

export function parsePersistedReferralInvites(
  raw: string | null | undefined,
  token: AccountGenerationToken,
  now = Date.now(),
): { value: ReferralInvite[]; updatedAt: number; isFresh: boolean } | null {
  const stableUid = token.phase === 'active' ? String(token.stableId ?? '').trim() : '';
  if (!raw || !stableUid) return null;
  try {
    const payload = JSON.parse(raw) as Partial<PersistedPayload>;
    if (payload.version !== 2 || payload.stableUid !== stableUid || !Array.isArray(payload.value)) return null;
    const updatedAt = Number(payload.updatedAt) || 0;
    return { value: payload.value, updatedAt, isFresh: now - updatedAt <= TTL_MS };
  } catch {
    return null;
  }
}

export function referralInvitesCacheSizeForTests(): number { return entries.size; }
export function resetReferralInvitesCacheForTests(): void { entries.clear(); latestRequestId = 0; }

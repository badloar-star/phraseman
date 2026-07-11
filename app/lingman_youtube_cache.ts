import type { AccountGenerationToken } from './account_generation';
import { isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { LingmanYoutubeSnapshot } from './lingman_youtube';

type Entry = { key: string; value: LingmanYoutubeSnapshot; updatedAt: number };
export type LingmanSnapshotRequest = Readonly<{
  key: string | null; token: AccountGenerationToken; requestId: number; unreadRevision: number;
}>;
const TTL_MS = 60_000;
let entry: Entry | null = null;
let latestRequestId = 0;
let unreadRevision = 0;

export const lingmanSnapshotCacheKey = (token: AccountGenerationToken, channelId: string) => {
  const account = accountScopeKey(token);
  return account ? `${account}:lingman-youtube:${channelId}` : null;
};
export function readLingmanSnapshot(token: AccountGenerationToken, channelId: string, now = Date.now()) {
  const key = lingmanSnapshotCacheKey(token, channelId);
  if (!key || entry?.key !== key || !isCurrentAccountGeneration(token)) return null;
  return { value: entry.value, isFresh: now - entry.updatedAt <= TTL_MS };
}
export function beginLingmanSnapshotRequest(token: AccountGenerationToken, channelId: string): LingmanSnapshotRequest {
  latestRequestId += 1;
  return { key: lingmanSnapshotCacheKey(token, channelId), token, requestId: latestRequestId, unreadRevision };
}
export function isLingmanSnapshotRequestCurrent(request: LingmanSnapshotRequest): boolean {
  return !!request.key && request.requestId === latestRequestId && isCurrentAccountGeneration(request.token);
}
export function commitLingmanSnapshot(request: LingmanSnapshotRequest, value: LingmanYoutubeSnapshot, now = Date.now()): boolean {
  if (!isLingmanSnapshotRequestCurrent(request)) return false;
  const committedValue = request.unreadRevision < unreadRevision && entry?.key === request.key
    ? { ...value, unreadCount: Math.min(value.unreadCount, entry.value.unreadCount) }
    : value;
  entry = { key: request.key!, value: committedValue, updatedAt: now };
  return true;
}
export function patchLingmanUnread(token: AccountGenerationToken, channelId: string, unreadCount: number): boolean {
  const key = lingmanSnapshotCacheKey(token, channelId);
  if (!key || entry?.key !== key || !isCurrentAccountGeneration(token)) return false;
  unreadRevision += 1;
  entry = { ...entry, value: { ...entry.value, unreadCount: Math.max(0, Math.floor(unreadCount)) } };
  return true;
}
export function resetLingmanSnapshotCacheForTests(): void { entry = null; latestRequestId = 0; unreadRevision = 0; }

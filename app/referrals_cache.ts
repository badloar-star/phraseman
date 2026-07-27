import { isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { ReferralDrainState, ReferralInvite } from './referral_cloud';
import {
  peekScreenSnapshotForToken,
  rememberScreenSnapshot,
  screenSnapshotKey,
} from './screen_snapshot_store';

type Entry = Readonly<{
  value: ReferralInvite[];
  drain?: ReferralDrainState;
  updatedAt: number;
}>;
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

type PersistedStatePayload = Readonly<{
  version: 3;
  stableUid: string;
  value: ReferralInvite[];
  drain: ReferralDrainState;
  updatedAt: number;
}>;

const TTL_MS = 60_000;
const MAX_ENTRIES = 2;
/** Идентификатор экрана в общем дисковом снапшоте (screen_snapshot_store). */
const SCREEN_ID = 'referral-invites';
export const REFERRAL_STATE_STORAGE_KEY = 'referrals_state_cache_v3';
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
  if (!key || !isCurrentAccountGeneration(token)) return null;
  if (cached) return { value: cached.value, isFresh: now - cached.updatedAt <= TTL_MS };
  // зачем: Map выше живёт только внутри процесса, поэтому на ПЕРВОМ открытии после
  // холодного старта она пуста — экран показывал скелетоны приглашений. Поднимаем
  // снапшот прошлой сессии (его положил бутстрап одним общим чтением) и отдаём как
  // «данные есть, но не свежие»: список виден с первого кадра, а фоновая загрузка
  // всё равно идёт (isFresh:false) и тихо уточняет. Firestore не трогаем.
  const restored = peekScreenSnapshotForToken<ReferralInvite[]>(SCREEN_ID, token, { nowMs: now });
  if (!restored) return null;
  return { value: restored, isFresh: false };
}

export function readReferralDrain(
  token: AccountGenerationToken,
  now = Date.now(),
): { value: ReferralDrainState; isFresh: boolean } | null {
  const key = referralInvitesCacheKey(token);
  const cached = key ? entries.get(key) : undefined;
  if (!key || !cached?.drain || !isCurrentAccountGeneration(token)) return null;
  return { value: cached.drain, isFresh: now - cached.updatedAt <= TTL_MS };
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
  const previous = entries.get(request.key!);
  entries.delete(request.key!);
  entries.set(request.key!, { value, ...(previous?.drain ? { drain: previous.drain } : {}), updatedAt });
  // зачем: зеркалим результат на диск, чтобы СЛЕДУЮЩИЙ холодный старт открыл экран
  // мгновенно, без скелетонов. Запись фоновая и отложенная — UI её не ждёт.
  rememberScreenSnapshot(
    screenSnapshotKey(SCREEN_ID, request.token),
    value,
    updatedAt,
  );
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
  return true;
}

export function isReferralAccountRequestCurrent(
  token: AccountGenerationToken,
  expectedAccountKey: string | null,
): boolean {
  return !!expectedAccountKey
    && accountScopeKey(token) === expectedAccountKey
    && isCurrentAccountGeneration(token);
}

export function commitReferralState(
  request: ReferralInvitesRequest,
  value: ReferralInvite[],
  drain: ReferralDrainState,
  updatedAt = Date.now(),
): boolean {
  if (!isReferralInvitesRequestCurrent(request)) return false;
  return storeReferralState(request.token, value, drain, updatedAt);
}

export function storeReferralState(
  token: AccountGenerationToken,
  value: ReferralInvite[],
  drain: ReferralDrainState,
  updatedAt = Date.now(),
): boolean {
  const key = referralInvitesCacheKey(token);
  if (!key || !isCurrentAccountGeneration(token)) return false;
  entries.delete(key);
  entries.set(key, { value, drain, updatedAt });
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

export function hydrateReferralStateIfEmpty(
  token: AccountGenerationToken,
  value: ReferralInvite[],
  drain: ReferralDrainState,
  updatedAt: number,
): boolean {
  const key = referralInvitesCacheKey(token);
  if (!key || !isCurrentAccountGeneration(token)) return false;
  const existing = entries.get(key);
  if (existing?.drain || (existing && existing.updatedAt > updatedAt)) return false;
  entries.set(key, { value, drain, updatedAt });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
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

export function serializeReferralState(
  token: AccountGenerationToken,
  value: ReferralInvite[],
  drain: ReferralDrainState,
  updatedAt = Date.now(),
): string | null {
  const stableUid = token.phase === 'active' ? String(token.stableId ?? '').trim() : '';
  if (!stableUid) return null;
  return JSON.stringify({
    version: 3,
    stableUid,
    value,
    drain,
    updatedAt,
  } satisfies PersistedStatePayload);
}

export function parsePersistedReferralState(
  raw: string | null | undefined,
  token: AccountGenerationToken,
  now = Date.now(),
): {
  value: ReferralInvite[];
  drain: ReferralDrainState;
  updatedAt: number;
  isFresh: boolean;
} | null {
  const stableUid = token.phase === 'active' ? String(token.stableId ?? '').trim() : '';
  if (!raw || !stableUid) return null;
  try {
    const payload = JSON.parse(raw) as Partial<PersistedStatePayload>;
    if (
      payload.version !== 3
      || payload.stableUid !== stableUid
      || !Array.isArray(payload.value)
      || !payload.drain
      || typeof payload.drain !== 'object'
    ) return null;
    const updatedAt = Number(payload.updatedAt) || 0;
    return {
      value: payload.value,
      drain: payload.drain as ReferralDrainState,
      updatedAt,
      isFresh: now - updatedAt <= TTL_MS,
    };
  } catch {
    return null;
  }
}

export function hydrateReferralStateFromRaw(
  raw: string | null | undefined,
  token: AccountGenerationToken,
  now = Date.now(),
): boolean {
  const cached = parsePersistedReferralState(raw, token, now);
  if (!cached) return false;
  hydrateReferralStateIfEmpty(token, cached.value, cached.drain, cached.updatedAt);
  return readReferralDrain(token, now) !== null;
}

export function referralInvitesCacheSizeForTests(): number { return entries.size; }
export function resetReferralInvitesCacheForTests(): void { entries.clear(); latestRequestId = 0; }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_SNAPSHOT_RESOURCE_LIMITS, limitArray, patchAppSnapshot } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';

export const FRIENDS_TAB_SWR_CACHE_KEY = 'friends_tab_swr_v1';
export const FRIEND_PROFILES_CACHE_KEY = 'friend_profiles_cache_v1';
const FRIEND_PROFILES_CACHE_MAX_ENTRIES = 240;
const FRIEND_PROFILES_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ACCOUNT_SCOPES = 2;

export interface FriendsTabProfileWarm {
  uid: string;
  name: string;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  isPremium: boolean;
  avatar: string;
  frame: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
}

export type FriendsTabWarmSnapshot = {
  canonicalUid: string;
  friends: FriendEntry[];
  requests: FriendRequestEntry[];
  profiles: Record<string, FriendsTabProfileWarm>;
};

export interface FriendsProfileCacheEntry {
  profile: FriendsTabProfileWarm;
  fetchedAt: number;
}

const warmByScope = new Map<string, FriendsTabWarmSnapshot>();
const profilesByScope = new Map<string, Record<string, FriendsProfileCacheEntry>>();
const primePromisesByScope = new Map<string, Promise<void>>();
const coldWarmByOwner = new Map<string, FriendsTabWarmSnapshot>();
const coldProfilesByOwner = new Map<string, Record<string, FriendsProfileCacheEntry>>();
let coldPrimePromise: Promise<void> | null = null;

function currentScope(token: AccountGenerationToken): string | null {
  if (!token.stableId || !isCurrentAccountGeneration(token, token.stableId)) return null;
  return accountScopeKey(token);
}

function setBounded<T>(map: Map<string, T>, key: string, value: T): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > MAX_ACCOUNT_SCOPES) {
    const oldest = map.keys().next().value as string | undefined;
    if (!oldest) break;
    map.delete(oldest);
  }
}

function publishFriendsSnapshot(
  token: AccountGenerationToken,
  warm: FriendsTabWarmSnapshot,
  source: 'storage' | 'memory',
): void {
  if (!currentScope(token) || warm.canonicalUid !== token.stableId) return;
  patchAppSnapshot({
    friends: {
      source,
      updatedAt: Date.now(),
      canonicalUid: warm.canonicalUid,
      friends: limitArray(warm.friends, APP_SNAPSHOT_RESOURCE_LIMITS.friendProfileMaxEntries),
      requests: limitArray(warm.requests, APP_SNAPSHOT_RESOURCE_LIMITS.recentItemsMax),
      profiles: Object.fromEntries(
        Object.entries(warm.profiles).slice(0, APP_SNAPSHOT_RESOURCE_LIMITS.friendProfileMaxEntries),
      ),
    },
  });
}

function hydrateCurrentScopeFromColdPrime(token: AccountGenerationToken): boolean {
  const scope = currentScope(token);
  const owner = token.stableId;
  if (!scope || !owner || warmByScope.has(scope)) return false;
  const stagedWarm = coldWarmByOwner.get(owner);
  if (!stagedWarm || stagedWarm.canonicalUid !== owner) return false;
  setBounded(warmByScope, scope, stagedWarm);
  const stagedProfiles = coldProfilesByOwner.get(owner);
  if (stagedProfiles) setBounded(profilesByScope, scope, stagedProfiles);
  publishFriendsSnapshot(token, stagedWarm, 'storage');
  return true;
}

function isValidProfileCacheEntry(entry: unknown): entry is FriendsProfileCacheEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as FriendsProfileCacheEntry;
  return !!candidate.profile
    && typeof candidate.profile.uid === 'string'
    && candidate.profile.uid.trim().length > 0;
}

export function pruneFriendsProfileCache(
  cache: Record<string, FriendsProfileCacheEntry>,
  nowMs = Date.now(),
  retainUids: readonly string[] = [],
): Record<string, FriendsProfileCacheEntry> {
  const retain = new Set(retainUids.filter(Boolean));
  const entries = Object.entries(cache)
    .filter(([uid, entry]) => uid && isValidProfileCacheEntry(entry))
    .filter(([uid, entry]) => {
      if (retain.has(uid)) return true;
      const fetchedAt = Number(entry.fetchedAt) || 0;
      return fetchedAt <= 0 || nowMs - fetchedAt <= FRIEND_PROFILES_CACHE_TTL_MS;
    })
    .sort((a, b) => {
      const aPinned = retain.has(a[0]) ? 1 : 0;
      const bPinned = retain.has(b[0]) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (Number(b[1].fetchedAt) || 0) - (Number(a[1].fetchedAt) || 0);
    });

  const out: Record<string, FriendsProfileCacheEntry> = {};
  for (const [uid, entry] of entries) {
    // Retained/current friends sort first, but never bypass the hard cap: the
    // account can grow indefinitely and this module cache must not grow with it.
    if (Object.keys(out).length >= FRIEND_PROFILES_CACHE_MAX_ENTRIES) break;
    out[uid] = entry;
  }
  return out;
}

export function peekProfilesCache(
  token: AccountGenerationToken = captureAccountGeneration(),
): Record<string, FriendsProfileCacheEntry> {
  const scope = currentScope(token);
  hydrateCurrentScopeFromColdPrime(token);
  return scope ? profilesByScope.get(scope) ?? {} : {};
}

export function upsertProfilesCache(
  updates: Record<string, FriendsProfileCacheEntry>,
  token: AccountGenerationToken = captureAccountGeneration(),
): void {
  const scope = currentScope(token);
  if (!scope) return;
  const profilesCache = pruneFriendsProfileCache({ ...peekProfilesCache(token), ...updates });
  setBounded(profilesByScope, scope, profilesCache);
  const warm = warmByScope.get(scope);
  if (!warm) return;
  const boundedWarmProfiles = Object.fromEntries(
    Object.entries(profilesCache).map(([uid, entry]) => [uid, entry.profile]),
  );
  const nextWarm = { ...warm, profiles: boundedWarmProfiles };
  setBounded(warmByScope, scope, nextWarm);
  publishFriendsSnapshot(token, nextWarm, 'memory');
}

export function startFriendsTabSwrPrime(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<void> {
  const scope = currentScope(token);
  if (!scope) {
    if (token.phase !== 'uninitialized') return Promise.resolve();
    if (!coldPrimePromise) {
      coldPrimePromise = (async () => {
        try {
          const [swrRaw, profileRaw] = await Promise.all([
            AsyncStorage.getItem(FRIENDS_TAB_SWR_CACHE_KEY),
            AsyncStorage.getItem(FRIEND_PROFILES_CACHE_KEY),
          ]);
          const parsedSwr = swrRaw ? JSON.parse(swrRaw) as {
            canonicalUid?: unknown;
            friends?: FriendEntry[];
            requests?: FriendRequestEntry[];
          } : null;
          const parsedEnvelope = profileRaw ? JSON.parse(profileRaw) as {
            canonicalUid?: unknown;
            profiles?: Record<string, FriendsProfileCacheEntry>;
          } & Record<string, unknown> : null;
          const swrOwner = typeof parsedSwr?.canonicalUid === 'string' ? parsedSwr.canonicalUid : '';
          const profileOwner = typeof parsedEnvelope?.canonicalUid === 'string'
            ? parsedEnvelope.canonicalUid
            : '';
          const owner = swrOwner || profileOwner;
          if (!owner) return;

          const rawProfiles = parsedEnvelope?.profiles
            ?? (swrOwner === owner && !profileOwner
              ? parsedEnvelope as Record<string, FriendsProfileCacheEntry>
              : null);
          const parsedProfiles: Record<string, FriendsProfileCacheEntry> = {};
          if ((!profileOwner || profileOwner === owner) && rawProfiles) {
            const now = Date.now();
            for (const [uid, rawEntry] of Object.entries(rawProfiles)) {
              const entry = { profile: rawEntry?.profile, fetchedAt: rawEntry?.fetchedAt ?? now };
              if (isValidProfileCacheEntry(entry)) parsedProfiles[uid] = entry;
            }
          }
          const profilesCache = pruneFriendsProfileCache(parsedProfiles);
          const warmProfiles = Object.fromEntries(
            Object.entries(profilesCache).map(([uid, entry]) => [uid, entry.profile]),
          );
          setBounded(coldProfilesByOwner, owner, profilesCache);
          setBounded(coldWarmByOwner, owner, {
            canonicalUid: owner,
            friends: swrOwner === owner && Array.isArray(parsedSwr?.friends) ? parsedSwr.friends : [],
            requests: swrOwner === owner && Array.isArray(parsedSwr?.requests) ? parsedSwr.requests : [],
            profiles: warmProfiles,
          });
        } catch {
          // A corrupt or unavailable cold cache must never block live subscriptions.
        }
      })();
    }
    return coldPrimePromise;
  }
  const existing = primePromisesByScope.get(scope);
  if (existing) return existing;

  const primePromise = (async () => {
    try {
      if (coldPrimePromise) {
        await coldPrimePromise;
        if (!currentScope(token)) return;
        if (hydrateCurrentScopeFromColdPrime(token)) return;
      }
      const [swrRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(FRIENDS_TAB_SWR_CACHE_KEY),
        AsyncStorage.getItem(FRIEND_PROFILES_CACHE_KEY),
      ]);
      if (!currentScope(token)) return;

      const parsedSwr = swrRaw ? JSON.parse(swrRaw) as {
        canonicalUid?: unknown;
        friends?: FriendEntry[];
        requests?: FriendRequestEntry[];
      } : null;
      const canonicalUid = typeof parsedSwr?.canonicalUid === 'string' ? parsedSwr.canonicalUid : '';
      const ownsSwr = canonicalUid === token.stableId;
      const warmProfiles: Record<string, FriendsTabProfileWarm> = {};

      if (profileRaw) {
        const parsedEnvelope = JSON.parse(profileRaw) as {
          canonicalUid?: unknown;
          profiles?: Record<string, FriendsProfileCacheEntry>;
        } & Record<string, unknown>;
        const profileOwner = typeof parsedEnvelope.canonicalUid === 'string'
          ? parsedEnvelope.canonicalUid
          : '';
        const rawProfiles = parsedEnvelope.profiles
          ?? (ownsSwr && !profileOwner ? parsedEnvelope as Record<string, FriendsProfileCacheEntry> : null);
        if ((!profileOwner || profileOwner === token.stableId) && rawProfiles) {
          const now = Date.now();
          const parsedProfiles: Record<string, FriendsProfileCacheEntry> = {};
          for (const [uid, rawEntry] of Object.entries(rawProfiles)) {
            const entry = { profile: rawEntry?.profile, fetchedAt: rawEntry?.fetchedAt ?? now };
            if (isValidProfileCacheEntry(entry)) parsedProfiles[uid] = entry;
          }
          const profilesCache = pruneFriendsProfileCache(parsedProfiles, now);
          if (!currentScope(token)) return;
          setBounded(profilesByScope, scope, profilesCache);
          for (const [uid, entry] of Object.entries(profilesCache)) warmProfiles[uid] = entry.profile;
        }
      }

      if (!ownsSwr) {
        if (Object.keys(warmProfiles).length > 0) {
          const nextWarm = { canonicalUid: token.stableId!, friends: [], requests: [], profiles: warmProfiles };
          setBounded(warmByScope, scope, nextWarm);
          publishFriendsSnapshot(token, nextWarm, 'storage');
        }
        return;
      }

      const friends = Array.isArray(parsedSwr?.friends) ? parsedSwr.friends : [];
      const requests = Array.isArray(parsedSwr?.requests) ? parsedSwr.requests : [];
      if (!currentScope(token)) return;
      const nextWarm = { canonicalUid: token.stableId!, friends, requests, profiles: warmProfiles };
      setBounded(warmByScope, scope, nextWarm);
      publishFriendsSnapshot(token, nextWarm, 'storage');
    } catch {
      // A corrupt or unavailable cache must never block live subscriptions.
    }
  })();
  setBounded(primePromisesByScope, scope, primePromise);
  return primePromise;
}

export function peekFriendsTabSwrWarm(
  token: AccountGenerationToken = captureAccountGeneration(),
): FriendsTabWarmSnapshot | null {
  const scope = currentScope(token);
  hydrateCurrentScopeFromColdPrime(token);
  return scope ? warmByScope.get(scope) ?? null : null;
}

export function memoryUpsertFriendsTabSwr(
  canonicalUid: string,
  friends: FriendEntry[],
  requests: FriendRequestEntry[],
  token: AccountGenerationToken = captureAccountGeneration(),
): void {
  const scope = currentScope(token);
  if (!scope || !canonicalUid || canonicalUid !== token.stableId) return;
  const warm = warmByScope.get(scope);
  const profiles = warm?.canonicalUid === canonicalUid ? warm.profiles : {};
  const nextWarm = { canonicalUid, friends, requests, profiles };
  setBounded(warmByScope, scope, nextWarm);
  publishFriendsSnapshot(token, nextWarm, 'memory');
}

export async function persistFriendsTabSwrForAccount(
  token: AccountGenerationToken,
  friends: FriendEntry[],
  requests: FriendRequestEntry[],
): Promise<boolean> {
  return withAccountTransitionLock(async () => {
    const canonicalUid = token.stableId;
    if (!canonicalUid || !currentScope(token)) return false;
    await AsyncStorage.setItem(
      FRIENDS_TAB_SWR_CACHE_KEY,
      JSON.stringify({ canonicalUid, friends, requests, savedAt: Date.now() }),
    );
    if (!currentScope(token)) return false;
    memoryUpsertFriendsTabSwr(canonicalUid, friends, requests, token);
    return true;
  });
}

export async function persistFriendsProfilesForAccount(
  token: AccountGenerationToken,
  cache: Record<string, FriendsProfileCacheEntry>,
  retainUids: readonly string[] = [],
): Promise<boolean> {
  return withAccountTransitionLock(async () => {
    const canonicalUid = token.stableId;
    const scope = currentScope(token);
    if (!canonicalUid || !scope) return false;
    const profiles = pruneFriendsProfileCache(cache, Date.now(), retainUids);
    await AsyncStorage.setItem(
      FRIEND_PROFILES_CACHE_KEY,
      JSON.stringify({ canonicalUid, profiles }),
    );
    if (!currentScope(token)) return false;
    setBounded(profilesByScope, scope, profiles);
    return true;
  });
}

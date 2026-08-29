import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_SNAPSHOT_RESOURCE_LIMITS, limitArray, patchAppSnapshot } from './app_snapshot_store';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';
import { DebugLogger } from './debug-logger';

/** Тот же ключ, что во вкладке — один источник правды для SWR. */
export const FRIENDS_TAB_SWR_CACHE_KEY = 'friends_tab_swr_v1';

export const FRIEND_PROFILES_CACHE_KEY = 'friend_profiles_cache_v1';
const FRIEND_PROFILES_CACHE_MAX_ENTRIES = 240;
const FRIEND_PROFILES_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Совпадает по полям с FriendProfile во вкладке «Друзья». */
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

let warm: FriendsTabWarmSnapshot | null = null;
let primePromise: Promise<void> | null = null;

function publishFriendsSnapshot(source: 'storage' | 'memory'): void {
  if (!warm) return;
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

/** Модульный кеш ProfileCacheEntry — переживает ремаунты компонента (Expo Router). */
export interface FriendsProfileCacheEntry {
  profile: FriendsTabProfileWarm;
  fetchedAt: number;
}
let _profilesCache: Record<string, FriendsProfileCacheEntry> = {};

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
    if (Object.keys(out).length >= FRIEND_PROFILES_CACHE_MAX_ENTRIES && !retain.has(uid)) continue;
    out[uid] = entry;
  }
  return out;
}

/** Синхронно: последний известный кеш профилей (после prime или upsert). */
export function peekProfilesCache(): Record<string, FriendsProfileCacheEntry> {
  return _profilesCache;
}

/** Обновить модульный кеш профилей после загрузки/обновления с Firestore. */
export function upsertProfilesCache(updates: Record<string, FriendsProfileCacheEntry>): void {
  _profilesCache = pruneFriendsProfileCache({ ..._profilesCache, ...updates });
  // Также отражаем свежие профили в warm-снимке (для следующего prime).
  if (warm) {
    const mergedProfiles: Record<string, FriendsTabProfileWarm> = { ...warm.profiles };
    for (const [uid, e] of Object.entries(updates)) {
      mergedProfiles[uid] = e.profile;
    }
    warm = { ...warm, profiles: mergedProfiles };
    publishFriendsSnapshot('memory');
  }
}

/**
 * Читает AsyncStorage как можно раньше (вызывать из root layout при старте приложения).
 * Повторные вызовы возвращают тот же Promise.
 */
export function startFriendsTabSwrPrime(): Promise<void> {
  if (!primePromise) {
    primePromise = (async () => {
      try {
        const [swrRaw, profRaw] = await Promise.all([
          AsyncStorage.getItem(FRIENDS_TAB_SWR_CACHE_KEY),
          AsyncStorage.getItem(FRIEND_PROFILES_CACHE_KEY),
        ]);

        const profiles: Record<string, FriendsTabProfileWarm> = {};
        if (profRaw) {
          const p = JSON.parse(profRaw) as Record<string, { profile?: FriendsTabProfileWarm; fetchedAt?: number }>;
          const now = Date.now();
          const parsedProfiles: Record<string, FriendsProfileCacheEntry> = {};
          for (const [uid, e] of Object.entries(p)) {
            const entry = { profile: e?.profile, fetchedAt: e?.fetchedAt ?? now };
            if (isValidProfileCacheEntry(entry)) {
              parsedProfiles[uid] = entry;
            }
          }
          _profilesCache = pruneFriendsProfileCache(parsedProfiles, now);
          if (Object.keys(_profilesCache).length !== Object.keys(parsedProfiles).length) {
            void AsyncStorage.setItem(FRIEND_PROFILES_CACHE_KEY, JSON.stringify(_profilesCache)).catch(() => {});
          }
          for (const [uid, entry] of Object.entries(_profilesCache)) profiles[uid] = entry.profile;
        }

        if (!swrRaw) {
          // Профили загружены — сохраняем без friends/requests чтобы они были доступны через peek
          if (Object.keys(profiles).length > 0) {
            warm = { canonicalUid: '', friends: [], requests: [], profiles };
            publishFriendsSnapshot('storage');
          }
          return;
        }
        const parsed = JSON.parse(swrRaw) as {
          canonicalUid?: string;
          friends?: FriendEntry[];
          requests?: FriendRequestEntry[];
        };
        const canon = typeof parsed.canonicalUid === 'string' ? parsed.canonicalUid : '';
        if (!canon) return;
        const friends = Array.isArray(parsed.friends) ? parsed.friends : [];
        const requests = Array.isArray(parsed.requests) ? parsed.requests : [];

        warm = { canonicalUid: canon, friends, requests, profiles };
        publishFriendsSnapshot('storage');
      } catch (e) {
      // ignore
      DebugLogger.error('friends_tab_swr_warm:requests', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    })();
  }
  return primePromise;
}

/** Синхронно: последний снимок после prime (или null). */
export function peekFriendsTabSwrWarm(): FriendsTabWarmSnapshot | null {
  return warm;
}

/** Обновить память после успешной записи на диск — для консистентности до следующего старта. */
export function memoryUpsertFriendsTabSwr(
  canonicalUid: string,
  friends: FriendEntry[],
  requests: FriendRequestEntry[],
): void {
  if (!canonicalUid) return;
  const keepProfiles = warm?.canonicalUid === canonicalUid ? warm.profiles : {};
  warm = { canonicalUid, friends, requests, profiles: keepProfiles ?? {} };
  publishFriendsSnapshot('memory');
}

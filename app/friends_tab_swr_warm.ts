import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';

/** Тот же ключ, что во вкладке — один источник правды для SWR. */
export const FRIENDS_TAB_SWR_CACHE_KEY = 'friends_tab_swr_v1';

export const FRIEND_PROFILES_CACHE_KEY = 'friend_profiles_cache_v1';

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
}

export type FriendsTabWarmSnapshot = {
  canonicalUid: string;
  friends: FriendEntry[];
  requests: FriendRequestEntry[];
  profiles: Record<string, FriendsTabProfileWarm>;
};

let warm: FriendsTabWarmSnapshot | null = null;
let primePromise: Promise<void> | null = null;

/** Модульный кеш ProfileCacheEntry — переживает ремаунты компонента (Expo Router). */
export interface FriendsProfileCacheEntry {
  profile: FriendsTabProfileWarm;
  fetchedAt: number;
}
let _profilesCache: Record<string, FriendsProfileCacheEntry> = {};

/** Синхронно: последний известный кеш профилей (после prime или upsert). */
export function peekProfilesCache(): Record<string, FriendsProfileCacheEntry> {
  return _profilesCache;
}

/** Обновить модульный кеш профилей после загрузки/обновления с Firestore. */
export function upsertProfilesCache(updates: Record<string, FriendsProfileCacheEntry>): void {
  _profilesCache = { ..._profilesCache, ...updates };
  // Также отражаем свежие профили в warm-снимке (для следующего prime).
  if (warm) {
    const mergedProfiles: Record<string, FriendsTabProfileWarm> = { ...warm.profiles };
    for (const [uid, e] of Object.entries(updates)) {
      mergedProfiles[uid] = e.profile;
    }
    warm = { ...warm, profiles: mergedProfiles };
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
          for (const [uid, e] of Object.entries(p)) {
            if (e?.profile && typeof e.profile.uid === 'string') {
              profiles[uid] = e.profile;
              _profilesCache[uid] = { profile: e.profile, fetchedAt: e.fetchedAt ?? now };
            }
          }
        }

        if (!swrRaw) {
          // Профили загружены — сохраняем без friends/requests чтобы они были доступны через peek
          if (Object.keys(profiles).length > 0) {
            warm = { canonicalUid: '', friends: [], requests: [], profiles };
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
      } catch {
        /* ignore */
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
}

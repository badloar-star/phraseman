import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_SNAPSHOT_RESOURCE_LIMITS, limitArray, patchAppSnapshot } from './app_snapshot_store';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';
import { DebugLogger } from './debug-logger';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';

// зачем: PM-213 — кэш друзей (память + диск) раньше не принадлежал аккаунту: модульный
// `primePromise` читал общий ключ один раз за процесс, `warm` и `_profilesCache` переживали
// смену аккаунта, а позднее чтение диска, начатое для прошлого владельца, могло лечь в память
// нового. Лог с этим префиксом покажет, какое чтение отброшено и почему.
const WARM_LOG = '[FRIENDS-WARM]';

/** Тот же ключ, что во вкладке — один источник правды для SWR. */
export const FRIENDS_TAB_SWR_CACHE_KEY = 'friends_tab_swr_v1';

export const FRIEND_PROFILES_CACHE_KEY = 'friend_profiles_cache_v1';
const FRIEND_PROFILES_CACHE_MAX_ENTRIES = 240;
const FRIEND_PROFILES_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Совпадает по полям с FriendProfile во вкладке «Друзья». */
export interface FriendsTabProfileWarm {
  uid: string;
  name: string;
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
// зачем: смена эпохи сбрасывает все чтения, начатые до смены аккаунта, даже если токен поколения ещё не успел обновиться.
let resetEpoch = 0;

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
    // зачем: владелец чтения фиксируется ДО await — ответ диска, пришедший уже после смены
    // аккаунта, не должен записаться в память нового владельца (поздний результат).
    const ownerToken = captureAccountGeneration();
    const ownerKnown = ownerToken.stableId !== null && ownerToken.phase === 'active';
    const epochAtStart = resetEpoch;
    let run: Promise<void> | null = null;
    run = (async () => {
      try {
        const [swrRaw, profRaw] = await Promise.all([
          AsyncStorage.getItem(FRIENDS_TAB_SWR_CACHE_KEY),
          AsyncStorage.getItem(FRIEND_PROFILES_CACHE_KEY),
        ]);
        if (epochAtStart !== resetEpoch || (ownerKnown && !isCurrentAccountGeneration(ownerToken))) {
          // зачем: чтение устарело — сбрасываем once-промис, чтобы следующий вызов
          // прочитал диск уже для текущего владельца, а не вернул пустой результат.
          console.warn(`${WARM_LOG} prime отброшен: аккаунт сменился во время чтения диска`, JSON.stringify({
            ownerGeneration: ownerToken.generation,
            epochChanged: epochAtStart !== resetEpoch,
            hadSwr: swrRaw !== null,
            hadProfiles: profRaw !== null,
          }));
          if (primePromise === run) primePromise = null;
          return;
        }

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
    primePromise = run;
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

/**
 * Сброс при смене аккаунта (вызывается из стирания локальных данных аккаунта).
 *
 * зачем: PM-213 — друзья прошлого владельца не должны попасть на первый кадр нового:
 * память (`warm`, `_profilesCache`, once-промис) и дисковые ключи — это воспроизводимый
 * кэш (см. REPRODUCIBLE_CACHE_KEYS в phone_state_recovery), его потеря стоит одного
 * обычного чтения списка при открытии вкладки «Друзья». Память чистим синхронно, до
 * await диска, чтобы ни один рендер между ними не увидел чужой список.
 */
export async function resetFriendsTabSwrWarmForAccountSwitch(): Promise<void> {
  const hadWarm = warm !== null;
  const hadProfiles = Object.keys(_profilesCache).length;
  warm = null;
  _profilesCache = {};
  primePromise = null;
  resetEpoch += 1;
  console.log(`${WARM_LOG} сброс при смене аккаунта`, JSON.stringify({ hadWarm, hadProfiles }));
  try {
    await AsyncStorage.multiRemove([FRIENDS_TAB_SWR_CACHE_KEY, FRIEND_PROFILES_CACHE_KEY]);
  } catch (e) {
    // зачем: непрочитанный диск не должен ломать смену аккаунта, но причину пишем —
    // иначе чужой список вернулся бы после рестарта молча.
    console.warn(`${WARM_LOG} диск не очищен при смене аккаунта`, JSON.stringify({ reason: e instanceof Error ? e.message : String(e) }));
    DebugLogger.error('friends_tab_swr_warm:reset', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
}

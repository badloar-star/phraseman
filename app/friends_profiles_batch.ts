/**
 * Пачковая загрузка профилей друзей через callable friendsGetProfiles
 * (заменяет 4-RTT цепочку fetchFriendProfileFromFirestore в friends.tsx:498-523).
 *
 * Было: до 4 последовательных Firestore-запросов на КАЖДОГО друга, concurrency 6 —
 * на 20 друзьях до 80 RTT в момент открытия таба. Стало: 1 callable на пачку
 * (до 100 uid), серверная сборка leaderboard/arena_profiles + серверный кэш 60 c.
 *
 * Модульный TTL-кэш (5 мин) переживает ремаунты экрана — как peekProfilesCache(),
 * но не дублирует его: friends.tsx продолжает вести свой ProfileCacheEntry-кэш,
 * этот модуль только снимает повторные сетевые вызовы внутри TTL.
 *
 * TODO(types): FriendProfile сейчас объявлен внутри friends.tsx. Возвращаем
 * FriendProfileBatchRecord и конвертируем на стороне diff'а (см. friends.tsx.diffs.md).
 * При декомпозиции friends.tsx вынести общий тип в app/friends_profile_types.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { isReferralCloudEnabled } from './referral_flags';

const REGION = 'us-central1';
const BATCH_CACHE_TTL_MS = 5 * 60 * 1000;
/** Размер пачки должен совпадать с MAX_UIDS_PER_CALL в functions/src/friends_profiles.ts. */
const BATCH_SIZE = 100;

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), REGION), name);
}

/** Публичный профиль друга — зеркало FriendPublicProfile из functions/src/friends_profiles.ts. */
export interface FriendProfileBatchRecord {
  uid: string;
  displayName: string;
  totalXp: number;
  level: number;
  avatar: string;
  frame: string;
  aura: string;
  profileCardLevel: number;
  isPremium: boolean;
  isVip: boolean;
  isLifetime: boolean;
}

type ProfilesResponse = {
  ok?: boolean;
  profiles: Record<string, FriendProfileBatchRecord | null>;
};

interface CacheEntry {
  profile: FriendProfileBatchRecord | null;
  fetchedAt: number;
}

const batchCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<FriendProfileBatchRecord | null>>();

async function fetchBatch(uids: string[]): Promise<Record<string, FriendProfileBatchRecord | null>> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = callable<{ uids: string[] }, ProfilesResponse>('friendsGetProfiles');
  const res = await fn({ uids });
  return res.data?.profiles ?? {};
}

/** Инвалидировать кэш (например после принятия заявки — у нового друга профиль нужен свежий). */
export function invalidateFriendsProfilesBatchCache(uids?: string[]): void {
  if (!uids) {
    batchCache.clear();
    return;
  }
  for (const uid of uids) batchCache.delete(uid);
}

/**
 * Пачковая загрузка профилей: TTL-кэш + dedupe inflight + разбиение на чанки по 100.
 * Возвращает map uid → профиль (null — профиля нет/ошибка, вызывающий решает про fallback).
 * НИКОГДА не бросает: при сбое сети отдаёт то, что есть в кэше (null для промахов).
 */
export async function fetchFriendProfilesBatch(
  uids: string[],
  options: { force?: boolean } = {},
): Promise<Record<string, FriendProfileBatchRecord | null>> {
  const unique = [...new Set(uids.map((u) => String(u ?? '').trim()).filter(Boolean))];
  const result: Record<string, FriendProfileBatchRecord | null> = {};
  if (unique.length === 0) return result;

  const now = Date.now();
  const toFetch: string[] = [];
  for (const uid of unique) {
    const hit = batchCache.get(uid);
    if (!options.force && hit && now - hit.fetchedAt < BATCH_CACHE_TTL_MS) {
      result[uid] = hit.profile;
    } else {
      toFetch.push(uid);
    }
  }

  // Dedupe: uid уже в полёте — ждём тот же промис.
  const waiters: Promise<void>[] = [];
  const owners: string[] = [];
  for (const uid of toFetch) {
    const existing = inFlight.get(uid);
    if (existing) {
      waiters.push(existing.then((p) => { result[uid] = p; }));
    } else {
      owners.push(uid);
    }
  }

  if (owners.length > 0) {
    if (!isReferralCloudEnabled()) {
      // Без облака (Expo Go) — кладём null в кэш, вызывающий уйдёт в legacy-путь.
      for (const uid of owners) {
        batchCache.set(uid, { profile: null, fetchedAt: now });
        result[uid] = null;
      }
    } else {
      const chunks: string[][] = [];
      for (let i = 0; i < owners.length; i += BATCH_SIZE) {
        chunks.push(owners.slice(i, i + BATCH_SIZE));
      }
      await Promise.all(
        chunks.map(async (chunk) => {
          const request = fetchBatch(chunk).catch((): Record<string, FriendProfileBatchRecord | null> => ({}));
          for (const uid of chunk) {
            const perUid = request.then((map) => {
              const profile = map[uid] ?? null;
              batchCache.set(uid, { profile, fetchedAt: Date.now() });
              return profile;
            });
            inFlight.set(uid, perUid);
            waiters.push(
              perUid
                .then((p) => { result[uid] = p; })
                .finally(() => { inFlight.delete(uid); }),
            );
          }
        }),
      );
    }
  }

  await Promise.all(waiters);
  return result;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

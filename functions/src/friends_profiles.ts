/**
 * Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента).
 *
 * Было (friends.tsx fetchFriendProfileFromFirestore): на КАЖДОГО друга до 4 последовательных
 * запросов (leaderboard/{uid} → leaderboard where firebaseAuthUid → arena_profiles where
 * mirrorStableId → arena_profiles/{uid}) с concurrency 6 — на 20 друзьях до 80 RTT.
 * Стало: один callable friendsGetProfiles({uids}) — цепочка выполняется server-to-server,
 * ответ кэшируется на 60 c (как listMyInvitesServerCache).
 *
 * TODO(mapping): набор полей выровнен по клиентским profileFromLeaderboardDoc /
 * profileFromArenaDoc (friends.tsx). Если там появятся новые поля карточки профиля —
 * дополнить FRIEND_PROFILE_FIELDS-маппинг здесь, не раздувая клиент.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { getLevelFromXP } from './xp_levels';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Сколько uid принимаем за вызов. */
const MAX_UIDS_PER_CALL = 100;
/** Server-side кэш ответа: 60 c — список друзей не требует realtime-точности. */
const SERVER_CACHE_TTL_MS = 60 * 1000;
const SERVER_CACHE_MAX_ENTRIES = 500;

export interface FriendPublicProfile {
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

type ProfilesResponse = { ok: true; profiles: Record<string, FriendPublicProfile | null> };

const serverCache = new Map<string, { expiresAtMs: number; data: ProfilesResponse }>();

function readServerCache(key: string): ProfilesResponse | null {
  const hit = serverCache.get(key);
  if (hit && hit.expiresAtMs > Date.now()) return hit.data;
  return null;
}

function writeServerCache(key: string, data: ProfilesResponse): void {
  const now = Date.now();
  serverCache.set(key, { expiresAtMs: now + SERVER_CACHE_TTL_MS, data });
  if (serverCache.size > SERVER_CACHE_MAX_ENTRIES) {
    for (const [k, entry] of serverCache) {
      if (entry.expiresAtMs <= now || serverCache.size > SERVER_CACHE_MAX_ENTRIES - 100) {
        serverCache.delete(k);
      }
    }
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

type DocData = Record<string, unknown> | undefined;

/** Сборка публичного профиля из leaderboard + arena_profiles (приоритет leaderboard). */
function buildFriendProfile(uid: string, lb: DocData, arena: DocData): FriendPublicProfile | null {
  if (!lb && !arena) return null;
  const displayName = str(lb?.displayName) || str(lb?.name) || str(arena?.displayName) || '';
  const totalXp = num(lb?.totalXp ?? lb?.user_total_xp ?? arena?.totalXp ?? arena?.user_total_xp);
  const profileCardLevel = num(lb?.courseProfileCardLevel ?? arena?.courseProfileCardLevel);
  const profile: FriendPublicProfile = {
    uid,
    displayName,
    totalXp,
    level: getLevelFromXP(totalXp),
    avatar: str(lb?.avatar ?? arena?.avatar),
    frame: str(lb?.courseProfileCardFrame ?? arena?.courseProfileCardFrame),
    aura: str(lb?.courseProfileCardAura ?? arena?.courseProfileCardAura),
    profileCardLevel,
    isPremium: lb?.courseIsPremium === true || lb?.isPremium === true || arena?.courseIsPremium === true,
    isVip: lb?.courseIsVip === true || lb?.isVip === true || arena?.courseIsVip === true,
    isLifetime: lb?.courseIsLifetime === true || lb?.isLifetime === true || arena?.courseIsLifetime === true,
  };
  if (!profile.displayName && profile.totalXp <= 0 && !profile.avatar && profile.profileCardLevel <= 0) {
    return null;
  }
  return profile;
}

/** Та же 4-шаговая цепочка, что была на клиенте, но server-to-server (1 вызов на всех). */
async function fetchOneProfile(db: admin.firestore.Firestore, uid: string): Promise<FriendPublicProfile | null> {
  let lbData: DocData;
  const lbSnap = await db.collection('leaderboard').doc(uid).get();
  if (lbSnap.exists) {
    lbData = lbSnap.data() as DocData;
  } else {
    const byAuth = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
    lbData = byAuth.docs[0]?.data() as DocData;
  }

  let arenaData: DocData;
  const arenaByStable = await db.collection('arena_profiles').where('mirrorStableId', '==', uid).limit(1).get();
  if (!arenaByStable.empty) {
    arenaData = arenaByStable.docs[0]?.data() as DocData;
  } else {
    const arenaSnap = await db.collection('arena_profiles').doc(uid).get();
    arenaData = arenaSnap.exists ? (arenaSnap.data() as DocData) : undefined;
  }

  return buildFriendProfile(uid, lbData, arenaData);
}

export const friendsGetProfiles = onCall(CALLABLE_BASE, async (request): Promise<ProfilesResponse> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const rawUids = request.data?.uids;
  if (!Array.isArray(rawUids)) {
    throw new HttpsError('invalid-argument', 'uids array required');
  }
  const uids = [...new Set(rawUids.map((u) => String(u ?? '').trim()).filter(Boolean))].slice(0, MAX_UIDS_PER_CALL);

  const cacheKey = uids.slice().sort().join(',');
  const cached = readServerCache(cacheKey);
  if (cached) return cached;

  const db = admin.firestore();
  const entries = await Promise.all(
    uids.map(async (uid): Promise<[string, FriendPublicProfile | null]> => {
      try {
        return [uid, await fetchOneProfile(db, uid)];
      } catch (e) {
        console.warn('friendsGetProfiles: failed for uid', uid, e);
        return [uid, null];
      }
    }),
  );

  const profiles: Record<string, FriendPublicProfile | null> = {};
  for (const [uid, profile] of entries) profiles[uid] = profile;

  const result: ProfilesResponse = { ok: true, profiles };
  writeServerCache(cacheKey, result);
  return result;
});

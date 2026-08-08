/**
 * Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента).
 *
 * Стало: один callable friendsGetProfiles({uids}) читает канонический leaderboard
 * server-to-server,
 * ответ кэшируется на 60 c (как listMyInvitesServerCache).
 *
 * TODO(mapping): набор полей выровнен по клиентскому profileFromLeaderboardDoc.
 * Если там появятся новые поля карточки профиля —
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
  /** Цепочка дней. null = писатель её не проставил (не путать с честным нулём). */
  streak: number | null;
  leagueId: number;
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

/** Отличает «поля нет» от честного нуля: карточка не должна врать про цепочку. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

type DocData = Record<string, unknown> | undefined;

/** Сборка публичного профиля из канонического leaderboard. */
export function buildFriendProfile(uid: string, lb: DocData): FriendPublicProfile | null {
  if (!lb) return null;
  // зачем (2026-08-03): карточка чужого игрока всегда показывала 0 опыта и Lv.1.
  // Причина — рассинхрон имён полей: writer (functions/src/sync_leaderboard.ts +
  // firestore_leaderboard.ts) кладёт в leaderboard/{uid} общий XP в поле `points`,
  // имя в `name`, уровень карточки в `profileCardLevel`. Читатель же спрашивал
  // `totalXp`/`courseProfileCardLevel`/`courseProfileCardFrame`, которых в
  // документе нет вовсе → num(undefined) = 0. Молчаливая ложь: профиль
  // возвращался «валидным», но пустым. Канонические ключи теперь идут ПЕРВЫМИ,
  // а прежние оставлены как запасной вариант для документов старых схем.
  const displayName = str(lb?.name) || str(lb?.displayName) || '';
  const totalXp = num(
    lb?.points ?? lb?.totalXp ?? lb?.user_total_xp,
  );
  const profileCardLevel = num(
    lb?.profileCardLevel ?? lb?.courseProfileCardLevel,
  );
  const profile: FriendPublicProfile = {
    uid,
    displayName,
    totalXp,
    level: getLevelFromXP(totalXp),
    avatar: str(lb?.avatar),
    frame: str(lb?.frame ?? lb?.courseProfileCardFrame),
    aura: str(lb?.aura ?? lb?.courseProfileCardAura),
    profileCardLevel,
    streak: numOrNull(lb?.streak),
    leagueId: num(lb?.leagueId),
    isPremium: lb?.isPremium === true || lb?.courseIsPremium === true,
    isVip: lb?.isVip === true || lb?.courseIsVip === true,
    isLifetime: lb?.isLifetime === true || lb?.courseIsLifetime === true,
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

  return buildFriendProfile(uid, lbData);
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

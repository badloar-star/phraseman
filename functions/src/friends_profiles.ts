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

/** Кодек `active_days_v1` — см. functions/src/friends_together_core.ts. */
export interface FriendActiveDays {
  anchor: string;
  bits: string;
}

/** Настройки пуша «Позвать» из `friends_push_v1` (app/hall_of_fame_utils.ts пишет active_days_v1 рядом). */
export interface FriendPushSettings {
  enabled: boolean;
  /** Минуты к востоку от UTC, знак как `getTimezoneOffset()*-1`. */
  tz: number;
}

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
  /** «Вместе» (§3.1): последний известный локальный день активности. null = нет данных. */
  lastActiveDate: string | null;
  /** «Вместе»: кодек активных дней для daysTogether(). null = нет данных. */
  activeDays: FriendActiveDays | null;
  /** «Вместе»: XP за ТЕКУЩУЮ неделю (0, если неделя не совпадает или данных нет). */
  weeklyXp: number;
  /** «Вместе»: настройки пуша «Позвать» этого друга. null = никогда не задавал (трактуем как enabled). */
  friendsPush: FriendPushSettings | null;
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

function getProgress(data: DocData): Record<string, unknown> {
  const raw = (data as { progress?: unknown } | undefined)?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function currentWeekStartIso(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function currentWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Тот же приоритет источников, что sync_leaderboard.ts (~строки 70-90): week_points_v2
 * при совпадении weekKey, иначе weekly_xp при совпадении weekly_xp_period_start с началом
 * ТЕКУЩЕЙ недели, иначе 0. Дублируем узкую чистую функцию вместо кросс-импорта приватной
 * логики sync_leaderboard.ts — тот же паттерн уже используют friends_together.ts и другие модули.
 */
export function weeklyXpFromUserProgress(
  progress: Record<string, unknown> | undefined,
  nowMs: number = Date.now(),
): number {
  const p = progress ?? {};
  let weekPoints = 0;
  try {
    const wpRaw = p['week_points_v2'];
    if (wpRaw) {
      const wpData = JSON.parse(String(wpRaw)) as { weekKey?: string; points?: number };
      weekPoints = wpData.weekKey === currentWeekKey(nowMs) ? (wpData.points ?? 0) : 0;
    }
  } catch { /* malformed json → 0 */ }
  if (p['weekly_xp_period_start'] === currentWeekStartIso(nowMs)) {
    weekPoints = Math.max(weekPoints, Number(p['weekly_xp'] ?? 0) || 0);
  }
  return Math.max(0, Math.floor(weekPoints));
}

/** Читает active_days_v1/friends_push_v1/last_active_date из users/{uid}.progress. */
export function friendTogetherFieldsFromUserData(userData: DocData, nowMs: number = Date.now()): {
  lastActiveDate: string | null;
  activeDays: FriendActiveDays | null;
  weeklyXp: number;
  friendsPush: FriendPushSettings | null;
} {
  const progress = getProgress(userData);
  const lastActiveDate = typeof progress['last_active_date'] === 'string' && progress['last_active_date']
    ? progress['last_active_date'] as string
    : null;

  const activeDaysRaw = parseJsonObject(progress['active_days_v1']);
  const anchor = typeof activeDaysRaw.anchor === 'string' ? activeDaysRaw.anchor : '';
  const bits = typeof activeDaysRaw.bits === 'string' ? activeDaysRaw.bits : '';
  const activeDays = anchor && bits ? { anchor, bits } : null;

  const pushRaw = parseJsonObject(progress['friends_push_v1']);
  const friendsPush = Object.keys(pushRaw).length > 0
    ? { enabled: pushRaw.enabled !== false, tz: Number.isFinite(Number(pushRaw.tz)) ? Number(pushRaw.tz) : 0 }
    : null;

  return {
    lastActiveDate,
    activeDays,
    weeklyXp: weeklyXpFromUserProgress(progress, nowMs),
    friendsPush,
  };
}

/** Сборка публичного профиля из канонического leaderboard (+ опциональные поля «Вместе» из users/{uid}). */
export function buildFriendProfile(
  uid: string,
  lb: DocData,
  userData?: DocData,
): FriendPublicProfile | null {
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
  // «Вместе»: поля читаются из users/{uid}.progress, НЕ из leaderboard — тот документ
  // их не несёт. userData отсутствует → нейтральные значения (профиль всё равно валиден
  // по leaderboard-полям выше; вызывающий решает, стоит ли платить за 2-е чтение).
  const together = friendTogetherFieldsFromUserData(userData);
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
    lastActiveDate: together.lastActiveDate,
    activeDays: together.activeDays,
    weeklyXp: together.weeklyXp,
    friendsPush: together.friendsPush,
  };
  if (!profile.displayName && profile.totalXp <= 0 && !profile.avatar && profile.profileCardLevel <= 0) {
    return null;
  }
  return profile;
}

/**
 * Та же 4-шаговая цепочка, что была на клиенте, но server-to-server (1 вызов на всех).
 * + 1 доп. чтение users/{uid} для полей «Вместе» (§3.1 спецификации: active_days_v1,
 * weekly_xp, friends_push_v1 — leaderboard их не несёт). Оба чтения параллельно —
 * это не удваивает латентность, а серверный кэш 60с (SERVER_CACHE_TTL_MS) держит
 * повторный расход в разумных рамках при частых открытиях вкладки.
 */
async function fetchOneProfile(db: admin.firestore.Firestore, uid: string): Promise<FriendPublicProfile | null> {
  const [lbSnap, userSnap] = await Promise.all([
    db.collection('leaderboard').doc(uid).get(),
    db.collection('users').doc(uid).get(),
  ]);

  let lbData: DocData;
  if (lbSnap.exists) {
    lbData = lbSnap.data() as DocData;
  } else {
    const byAuth = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
    lbData = byAuth.docs[0]?.data() as DocData;
  }

  const userData = userSnap.exists ? (userSnap.data() as DocData) : undefined;
  return buildFriendProfile(uid, lbData, userData);
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

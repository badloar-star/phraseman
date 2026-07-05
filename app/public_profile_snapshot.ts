import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { ensureArenaAuthUid } from './user_id_policy';
import { USER_AVATAR_AURA_KEY, normalizeAvatarAuraId } from '../constants/avatar_auras';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import {
  PROFILE_CARD_LEGEND_NO_KEY,
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import { readLifetimeProfileStatsCache } from './lifetime_profile_stats';
import { parseWeekPointsForWeek } from './hall_of_fame_utils';
import { isLifetimePlanLocal } from './premium_guard';

export const PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY = 'public_profile_snapshot_v1';
export const PUBLIC_PROFILE_XP_TTL_MS = 24 * 60 * 60 * 1000;

type PublicProfileReason = 'daily_xp' | 'display_change' | 'entitlement_change';

type SnapshotInput = {
  reason: PublicProfileReason;
  name?: string;
  totalXp?: number;
  weekPoints?: number;
  lang?: string;
  avatar?: string | null;
  frame?: string | null;
  aura?: string | null;
  streak?: number | null;
  leagueId?: number | null;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

type SnapshotCache = {
  xpSyncedAt?: number;
  displayHash?: string;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
};

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

async function readString(key: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(key)) ?? '';
  } catch {
    return '';
  }
}

function readNumber(raw: string | undefined | null, fallback = 0): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function readSnapshotCache(): Promise<SnapshotCache> {
  try {
    const raw = await AsyncStorage.getItem(PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY);
    return raw ? JSON.parse(raw) as SnapshotCache : {};
  } catch {
    return {};
  }
}

async function writeSnapshotCache(cache: SnapshotCache): Promise<void> {
  try {
    await AsyncStorage.setItem(PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function stableStringify(value: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = value[key];
    return out;
  }, {}));
}

export async function syncPublicProfileSnapshot(input: SnapshotInput): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || isJestRuntime()) return;
  const db = getFirestore();
  if (!db) return;

  const now = Date.now();
  const cache = await readSnapshotCache();
  const [nameRaw, xpRaw, langRaw, avatarRaw, frameRaw, auraRaw, streakRaw, leagueRaw, weekRaw] = await Promise.all([
    input.name !== undefined ? Promise.resolve(input.name) : readString('user_name'),
    input.totalXp !== undefined ? Promise.resolve(String(input.totalXp)) : readString('user_total_xp'),
    input.lang !== undefined ? Promise.resolve(input.lang) : readString('app_lang'),
    input.avatar !== undefined ? Promise.resolve(input.avatar ?? '') : readString('user_avatar'),
    input.frame !== undefined ? Promise.resolve(input.frame ?? '') : readString('user_frame'),
    input.aura !== undefined ? Promise.resolve(input.aura ?? '') : readString(USER_AVATAR_AURA_KEY),
    input.streak !== undefined ? Promise.resolve(String(input.streak ?? 0)) : readString('streak_count'),
    input.leagueId !== undefined ? Promise.resolve(JSON.stringify({ leagueId: input.leagueId ?? 0 })) : readString('league_state_v3'),
    input.weekPoints !== undefined ? Promise.resolve(String(input.weekPoints)) : readString('week_points_v2'),
  ]);

  const totalXp = Math.max(0, readNumber(xpRaw, 0));
  const level = getLevelFromXP(totalXp);
  const fallbackAvatar = String(getBestAvatarForLevel(level));
  const storedAvatar = String(avatarRaw || '').trim();
  const avatar = storedAvatar && !/^\d+$/.test(storedAvatar) ? storedAvatar : fallbackAvatar;
  const frame = String(frameRaw || '').trim() || null;
  const aura = normalizeAvatarAuraId(auraRaw) ?? null;
  const lang = String(langRaw || 'ru').trim() || 'ru';
  const name = String(nameRaw || '').trim();
  const streak = Math.max(0, readNumber(streakRaw, 0));
  let leagueId = 0;
  try {
    leagueId = Math.max(0, readNumber(JSON.parse(leagueRaw || '{}')?.leagueId, 0));
  } catch {
    leagueId = 0;
  }

  const profilePairs = await AsyncStorage.multiGet([
    PROFILE_CARD_LEVEL_KEY,
    PROFILE_CARD_THEME_KEY,
    PROFILE_CARD_MOTION_KEY,
    PROFILE_CARD_PUBLIC_FOCUS_KEY,
    PROFILE_CARD_LEGEND_NO_KEY,
  ]).catch(() => [
    [PROFILE_CARD_LEVEL_KEY, null],
    [PROFILE_CARD_THEME_KEY, null],
    [PROFILE_CARD_MOTION_KEY, null],
    [PROFILE_CARD_PUBLIC_FOCUS_KEY, null],
    [PROFILE_CARD_LEGEND_NO_KEY, null],
  ] as [string, string | null][]);
  const rawProfileLevel = profilePairs[0]?.[1] ?? null;
  const rawTheme = profilePairs[1]?.[1] ?? null;
  const rawMotion = profilePairs[2]?.[1] ?? null;
  const rawFocus = profilePairs[3]?.[1] ?? null;
  const rawLegendNo = profilePairs[4]?.[1] ?? null;

  const profileCardLevel = normalizeProfileCardLevel(rawProfileLevel);
  const profileCardTheme = normalizeProfileCardTheme(rawTheme);
  const profileCardMotion = normalizeProfileCardMotion(rawMotion);
  const profileCardPublicFocus = normalizeProfileCardPublicFocus(rawFocus);
  const legendNoParsed = Math.floor(Number(rawLegendNo));
  const profileCardLegendNo = Number.isFinite(legendNoParsed) && legendNoParsed > 0 ? legendNoParsed : null;

  // Блоки статистики уровней II+ («Выучено»/«Арена»/«Путь») — денормализуем в публичный
  // профиль из локального lifetime-кэша, чтобы ЧУЖИЕ карточки могли их показать.
  // Кэш освежается экраном статистики и модалом собственной карточки; если его ещё
  // нет — поля не пишем (карточка у других просто не покажет строку, без вранья).
  const lifetimeStats = profileCardLevel >= 2
    ? await readLifetimeProfileStatsCache().catch(() => null)
    : null;
  const cardStatsPayload = lifetimeStats
    ? {
        cardWordsLearned: Math.max(0, Math.floor(lifetimeStats.wordsLearned)),
        cardPhrasesLearned: Math.max(0, Math.floor(lifetimeStats.phrasesLearned)),
        cardArenaWins: Math.max(0, Math.floor(lifetimeStats.arenaWins)),
        cardArenaMatches: Math.max(0, Math.floor(lifetimeStats.arenaWins + lifetimeStats.arenaLosses)),
        cardAppDays: Math.max(0, Math.floor(lifetimeStats.appDaysUnion)),
        cardLongestStreak: Math.max(0, Math.floor(lifetimeStats.longestStreakDays)),
      }
    : null;
  const weekPoints = Math.max(0, Math.trunc(input.weekPoints ?? parseWeekPointsForWeek(weekRaw)));
  const isPremium = input.isPremium ?? cache.isPremium ?? false;
  const isVip = input.isVip ?? cache.isVip ?? false;
  // Pro-план (разовая «Навсегда») читаем прямо из локального премиум-плана, если
  // вызывающий не передал явно — так все точки вызова (покупка/VIP/деактивация)
  // автоматически денормализуют актуальный флаг без протаскивания его через каждый
  // вызов. Денормализуем только при активном премиум-доступе: истёкший lifetime не
  // должен оставлять «Pro»-плашку у чужих.
  const rawLifetime = input.isLifetime ?? (isPremium ? await isLifetimePlanLocal().catch(() => cache.isLifetime ?? false) : false);
  const isLifetime = isPremium && rawLifetime;

  const displayHash = stableStringify({
    name,
    lang,
    avatar,
    frame,
    aura,
    leagueId,
    isPremium,
    isVip,
    isLifetime,
    profileCardLevel,
    profileCardTheme,
    profileCardMotion,
    profileCardPublicFocus,
    profileCardLegendNo,
    ...(cardStatsPayload ?? {}),
  });

  const xpFresh = cache.xpSyncedAt !== undefined && now - cache.xpSyncedAt < PUBLIC_PROFILE_XP_TTL_MS;
  if (input.reason === 'daily_xp' && xpFresh && cache.displayHash === displayHash) return;
  if (input.reason !== 'daily_xp' && cache.displayHash === displayHash) return;

  const stableId = await ensureAnonUser();
  if (!stableId) return;
  await ensureStableAuthLinkForStableId(stableId).catch(() => false);

  try {
    const banDoc = await db.collection('banned_users').doc(stableId).get();
    if (banDoc.exists) return;
  } catch {}

  // nameLower ДОЛЖЕН обновляться вместе с name. Иначе при merge:true профиль
  // получает новое name, но старый nameLower (напр. name="Дладуд" +
  // nameLower="тлдь") — рассинхрон, из-за которого поиск/индекс не находят юзера.
  // Нормализуем так же, как серверный nameReserve → normalizeName: trim, ≤32, lower.
  const nameLower = name.slice(0, 32).toLowerCase();
  const publicPayload = {
    uid: stableId,
    name,
    nameLower,
    lang,
    totalXp,
    level,
    weekPoints,
    avatar,
    frame,
    aura,
    streak,
    leagueId,
    isPremium,
    isVip,
    isLifetime,
    profileCardLevel,
    profileCardTheme,
    profileCardMotion,
    profileCardPublicFocus,
    ...(profileCardLegendNo !== null ? { profileCardLegendNo } : {}),
    ...(cardStatsPayload ?? {}),
    displayHash,
    updatedAt: now,
    updatedReason: input.reason,
  };

  await db.collection('public_profiles').doc(stableId).set(publicPayload, { merge: true });

  try {
    const arenaAuth = await ensureArenaAuthUid();
    if (arenaAuth) {
      await db.collection('arena_profiles').doc(arenaAuth).set({
        courseTotalXp: totalXp,
        courseAvatar: avatar,
        courseFrame: frame,
        courseAura: aura,
        courseIsPremium: isPremium,
        courseIsVip: isVip,
        courseIsLifetime: isLifetime,
        courseProfileCardLevel: profileCardLevel,
        courseProfileCardTheme: profileCardTheme,
        courseProfileCardMotion: profileCardMotion,
        courseProfileCardPublicFocus: profileCardPublicFocus,
        courseDisplayAt: now,
        mirrorStableId: stableId,
      }, { merge: true });
    }
  } catch {}

  await writeSnapshotCache({
    displayHash,
    isPremium,
    isVip,
    isLifetime,
    xpSyncedAt: input.reason === 'daily_xp' ? now : cache.xpSyncedAt,
  });
}

export default function __RouteShim() { return null; }

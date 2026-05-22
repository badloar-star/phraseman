// ════════════════════════════════════════════════════════════════════════════
// firestore_leaderboard.ts — Глобальный рейтинг через Firestore
//
// Структура Firestore:
//   leaderboard/{uid}  → { name, points, lang, avatar, weekKey, weekPoints, updatedAt }
//
// Активно только при CLOUD_SYNC_ENABLED = true.
// При отключённом флаге все функции возвращают пустые данные.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { ensureArenaAuthUid, getCanonicalUserId } from './user_id_policy';
import { USER_AVATAR_AURA_KEY, normalizeAvatarAuraId } from '../constants/avatar_auras';
import {
  PROFILE_CARD_LEVEL_KEY,
  PROFILE_CARD_MOTION_KEY,
  PROFILE_CARD_PUBLIC_FOCUS_KEY,
  PROFILE_CARD_THEME_KEY,
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import type { LeagueCrown } from './services/league_chest_rewards';

// ── Дебаунс для pushMyScore — пишем в Firestore не чаще 1 раза в 30 сек ─────
// Экономит ~95% записей (урок = 20+ ответов, а пишем 1 раз в конце паузы)
let _pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPush: {
  name: string;
  totalPoints: number;
  weekPoints: number;
  lang: string;
  avatar?: string;
  frame?: string;
  aura?: string;
  streak?: number;
  leagueId?: number;
  isPremium?: boolean;
  isVip?: boolean;
} | null = null;

const PUSH_DEBOUNCE_MS = 30_000; // 30 секунд

// ── Кэш глобального рейтинга — читаем Firestore не чаще 1 раза в 10 минут ──
/** Экспорт для сброса при pull-to-refresh в Зале славы. */
export const GLOBAL_LB_ASYNC_CACHE_KEY = 'global_lb_cache_v4';
const LB_CACHE_KEY = GLOBAL_LB_ASYNC_CACHE_KEY;
const LB_CACHE_TTL = 3 * 60 * 1000; // 3 минуты

/** Прогрев кэша глобального топа при старте — экран «Зал славы» открывается без ожидания сети. */
export function prefetchGlobalLeaderboard(): void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  void fetchGlobalLeaderboard().catch(() => {});
}

/** Сколько строк набрать из Firestore до остановки (запас под дедуп на клиенте). */
const LEADERBOARD_FETCH_GOAL = 130;
const LEADERBOARD_PAGE = 60;
const LEADERBOARD_MAX_PAGES = 8;
const LEADERBOARD_MAX_RETURN = 220;

export interface RemoteLeaderEntry {
  uid: string;
  name: string;
  points: number;
  lang: string;
  avatar?: string;
  frame?: string;
  aura?: string;
  weekPoints?: number;
  weekKey?: string;
  streak?: number;
  leagueId?: number;
  isPremium?: boolean;
  isVip?: boolean;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  leagueCrown?: LeagueCrown;
  daily7xp?: number;
  daily7time_ms?: number;
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

const FUNCTIONS_REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

const COL = 'leaderboard';

// ── Обновить/создать запись текущего пользователя в глобальном рейтинге ──────
// Использует дебаунс 30с — при частых начислениях XP пишет только 1 раз
export function pushMyScore(
  name: string,
  totalPoints: number,
  weekPoints: number,
  lang: string,
  avatar?: string,
  streak?: number,
  leagueId?: number,
  frame?: string,
  isPremium?: boolean,
  aura?: string,
  isVip?: boolean,
): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || !name) return Promise.resolve();

  // Накапливаем последние значения
  _pendingPush = { name, totalPoints, weekPoints, lang, avatar, frame, aura, streak, leagueId, isPremium, isVip };

  // Сбрасываем предыдущий таймер и ставим новый
  if (_pushDebounceTimer) clearTimeout(_pushDebounceTimer);
  return new Promise(resolve => {
    _pushDebounceTimer = setTimeout(async () => {
      _pushDebounceTimer = null;
      const p = _pendingPush;
      _pendingPush = null;
      if (!p) { resolve(); return; }
      await _doPushMyScore(p.name, p.totalPoints, p.weekPoints, p.lang, p.avatar, p.streak, p.leagueId, p.frame, p.isPremium, p.aura, p.isVip);
      resolve();
    }, PUSH_DEBOUNCE_MS);
  });
}

export async function pushMyScoreImmediate(
  name: string,
  totalPoints: number,
  weekPoints: number,
  lang: string,
  avatar?: string,
  streak?: number,
  leagueId?: number,
  frame?: string,
  isPremium?: boolean,
  aura?: string,
  isVip?: boolean,
): Promise<void> {
  if (_pushDebounceTimer) {
    clearTimeout(_pushDebounceTimer);
    _pushDebounceTimer = null;
  }
  _pendingPush = null;
  await _doPushMyScore(name, totalPoints, weekPoints, lang, avatar, streak, leagueId, frame, isPremium, aura, isVip);
}

async function _doPushMyScore(
  name: string,
  totalPoints: number,
  weekPoints: number,
  lang: string,
  avatar?: string,
  streak?: number,
  leagueId?: number,
  frame?: string,
  isPremium?: boolean,
  aura?: string,
  isVip?: boolean,
): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  const stableId = await ensureAnonUser();
  if (!stableId) return;
  await ensureStableAuthLinkForStableId(stableId).catch(() => false);
  let resolvedAvatar = avatar?.trim() || undefined;
  try {
    const storedAvatar = (await AsyncStorage.getItem('user_avatar'))?.trim();
    if (storedAvatar && (!resolvedAvatar || /^\d+$/.test(resolvedAvatar))) {
      resolvedAvatar = storedAvatar;
    }
  } catch {}
  let resolvedAura = normalizeAvatarAuraId(aura);
  try {
    const storedAura = (await AsyncStorage.getItem(USER_AVATAR_AURA_KEY))?.trim();
    resolvedAura = resolvedAura ?? normalizeAvatarAuraId(storedAura);
  } catch {}
  let profileCardLevel = 0;
  let profileCardTheme = 'classic';
  let profileCardMotion = 'none';
  let profileCardPublicFocus = 'balanced';
  try {
    const [[, rawLevel], [, rawTheme], [, rawMotion], [, rawFocus]] = await AsyncStorage.multiGet([
      PROFILE_CARD_LEVEL_KEY,
      PROFILE_CARD_THEME_KEY,
      PROFILE_CARD_MOTION_KEY,
      PROFILE_CARD_PUBLIC_FOCUS_KEY,
    ]);
    profileCardLevel = normalizeProfileCardLevel(rawLevel);
    profileCardTheme = normalizeProfileCardTheme(rawTheme);
    profileCardMotion = normalizeProfileCardMotion(rawMotion);
    profileCardPublicFocus = normalizeProfileCardPublicFocus(rawFocus);
  } catch {}
  let arenaAuth: string | null = null;
  try {
    arenaAuth = await ensureArenaAuthUid();
  } catch {
    arenaAuth = null;
  }
  try {
    // Не пишем в лидерборд если пользователь забанен
    const banDoc = await db.collection('banned_users').doc(stableId).get();
    if (banDoc.exists) return;
  } catch {}
  try {
    const fn = callable<
      {
        name: string; points: number; weekPoints: number; lang: string; avatar?: string | null;
        frame?: string | null; aura?: string | null; streak?: number | null; leagueId?: number | null; isPremium?: boolean; isVip?: boolean;
        profileCardLevel?: number; profileCardTheme?: string; profileCardMotion?: string; profileCardPublicFocus?: string;
        stableId?: string;
      },
      { ok: boolean; points?: number; weekPoints?: number }
    >('leaderboardPushMyScore');
    await fn({
      stableId,
      name: name.trim(),
      points: totalPoints,
      weekPoints,
      lang,
      avatar: resolvedAvatar ?? null,
      frame: frame ?? null,
      aura: resolvedAura ?? null,
      streak: streak ?? null,
      leagueId: leagueId ?? null,
      isPremium: isPremium ?? false,
      isVip: isVip ?? false,
      profileCardLevel,
      profileCardTheme,
      profileCardMotion,
      profileCardPublicFocus,
    });
  } catch {}
  // Копия для топа арены: id arena_profiles = Auth uid, leaderboard = stableId.
  try {
    if (arenaAuth) {
      await db.collection('arena_profiles').doc(arenaAuth).set({
        courseTotalXp: totalPoints,
        courseAvatar: resolvedAvatar ?? null,
        courseFrame: frame?.trim() ? frame.trim() : null,
        courseAura: resolvedAura ?? null,
        courseIsPremium: isPremium ?? false,
        courseIsVip: isVip ?? false,
        courseProfileCardLevel: profileCardLevel,
        courseProfileCardTheme: profileCardTheme,
        courseProfileCardMotion: profileCardMotion,
        courseProfileCardPublicFocus: profileCardPublicFocus,
        courseDisplayAt: Date.now(),
        mirrorStableId: stableId,
      }, { merge: true });
    }
  } catch {}
}

/** Обновляет только isPremium в leaderboard — вызывается при старте приложения. */
export async function updateMyPremiumInLeaderboard(isPremium: boolean): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return;
    await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    const fn = callable<{ stableId?: string; isPremium: boolean }, { ok: boolean }>('leaderboardUpdatePremium');
    await fn({ stableId, isPremium });
  } catch {}
}

/** Обновляет только isVip в public profile surfaces. */
export async function updateMyVipInLeaderboard(isVip: boolean): Promise<void> {
  const db = getFirestore();
  if (!db) return;
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return;
    await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    const fn = callable<{ stableId?: string; isVip: boolean }, { ok: boolean }>('leaderboardUpdatePremium');
    await fn({ stableId, isVip });
  } catch {}
}

// ── Атомарно зарезервировать ник через транзакцию ───────────────────────────
// Возвращает 'ok' | 'taken' | 'error'
// oldName — прежний ник пользователя (для освобождения старого слота)
export async function reserveName(
  name: string,
  oldName: string,
): Promise<'ok' | 'taken' | 'error'> {
  if (!CLOUD_SYNC_ENABLED) return 'ok';
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return 'error';
    await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    const fn = callable<{ stableId?: string; name: string; oldName: string }, { ok: boolean; status: 'ok' | 'taken' }>('nameReserve');
    const { data } = await fn({ stableId, name: name.trim(), oldName: oldName.trim() });
    return data.status === 'taken' ? 'taken' : 'ok';
  } catch (e: any) {
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) return 'taken';
    return 'error';
  }
}

// ── Проверить уникальность ника (без резервации, только read-only) ───────────
// Используется для валидации перед показом ошибки. Основная блокировка — reserveName.
export async function isNameAvailable(name: string): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return true;
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return true;
    await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    const fn = callable<{ stableId?: string; name: string }, { ok: boolean; available: boolean }>('nameCheckAvailability');
    const { data } = await fn({ stableId, name: name.trim() });
    return data.available !== false;
  } catch {
    return true; // при ошибке не блокируем
  }
}

// ── Загрузить топ-100 глобального рейтинга (кэш 15 минут) ───────────────────
export async function fetchGlobalLeaderboard(): Promise<RemoteLeaderEntry[]> {
  if (!CLOUD_SYNC_ENABLED) return [];

  // Проверяем кэш — экономит 200 чтений при каждом открытии вкладки
  try {
    const raw = await AsyncStorage.getItem(LB_CACHE_KEY);
    if (raw) {
      const { ts, data }: { ts: number; data: RemoteLeaderEntry[] } = JSON.parse(raw);
      if (Date.now() - ts < LB_CACHE_TTL) return data;
    }
  } catch {}

  const db = getFirestore();
  if (!db) return [];
  try {
    const mapDoc = (doc: any): RemoteLeaderEntry => ({
      uid: doc.id,
      name: doc.data().name ?? '',
      points: doc.data().points ?? 0,
      lang: doc.data().lang ?? 'ru',
      avatar: doc.data().avatar ?? undefined,
      frame: doc.data().frame ?? undefined,
      aura: normalizeAvatarAuraId(doc.data().aura) ?? undefined,
      weekPoints: doc.data().weekPoints ?? 0,
      weekKey: doc.data().weekKey ?? '',
      streak: doc.data().streak ?? undefined,
      leagueId: doc.data().leagueId ?? undefined,
      isPremium: doc.data().isPremium ?? false,
      isVip: doc.data().isVip ?? false,
      profileCardLevel: normalizeProfileCardLevel(doc.data().profileCardLevel),
      profileCardTheme: normalizeProfileCardTheme(doc.data().profileCardTheme),
      profileCardMotion: normalizeProfileCardMotion(doc.data().profileCardMotion),
      profileCardPublicFocus: normalizeProfileCardPublicFocus(doc.data().profileCardPublicFocus),
      leagueCrown: Number(doc.data().leagueCrownExpiresAt) > Date.now()
        ? {
            uid: doc.id,
            name: doc.data().name ?? '',
            weekId: String(doc.data().leagueCrownWeekId ?? ''),
            groupId: String(doc.data().leagueCrownGroupId ?? ''),
            leagueId: Math.max(0, Math.floor(Number(doc.data().leagueId) || 0)),
            expiresAt: Number(doc.data().leagueCrownExpiresAt),
            aura: 'league_chest_crown',
          }
        : undefined,
      daily7xp: typeof doc.data().daily7xp === 'number' ? doc.data().daily7xp : undefined,
      daily7time_ms: typeof doc.data().daily7time_ms === 'number' ? doc.data().daily7time_ms : undefined,
    });

    const passesFilter = (doc: any, e: RemoteLeaderEntry) =>
      doc.data()?.identityHidden !== true &&
      e.points >= 50 &&
      e.name.trim() !== '' &&
      !(e as any).banned;

    const collected: RemoteLeaderEntry[] = [];
    let lastDoc: any = null;

    for (let page = 0; page < LEADERBOARD_MAX_PAGES; page++) {
      let q = db.collection(COL).orderBy('points', 'desc').limit(LEADERBOARD_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const e = mapDoc(doc);
        if (passesFilter(doc, e)) collected.push(e);
      }

      lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      if (collected.length >= LEADERBOARD_FETCH_GOAL) break;
      if (snap.size < LEADERBOARD_PAGE) break;
    }

    const result = collected.slice(0, LEADERBOARD_MAX_RETURN);
    await AsyncStorage.setItem(LB_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
    return result;
  } catch {
    return [];
  }
}

// ── Получить глобальный ранг пользователя (сколько людей с XP > моего) ───────
export async function fetchMyGlobalRank(myPoints: number): Promise<number | null> {
  if (!CLOUD_SYNC_ENABLED || myPoints <= 0) return null;
  const db = getFirestore();
  if (!db) return null;
  try {
    // Считаем количество документов с points > myPoints
    const snap = await db
      .collection(COL)
      .where('points', '>', myPoints)
      .count()
      .get();
    return (snap.data().count ?? 0) + 1; // ранг = кол-во лучших + 1
  } catch {
    // Фолбэк: если count() не поддерживается — запрашиваем без лимита (дорого, только если нет другого пути)
    try {
      const snap2 = await db.collection(COL).where('points', '>', myPoints).get();
      return snap2.size + 1;
    } catch {
      return null;
    }
  }
}

// ── Удалить запись пользователя из рейтинга (вызывается при удалении аккаунта)
export async function deleteMyLeaderboardEntry(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  try {
    const canonicalUid = await getCanonicalUserId();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    const authUid = auth.currentUser?.uid ?? null;
    const docIds = Array.from(new Set([canonicalUid, authUid].filter(Boolean) as string[]));
    await Promise.all(docIds.map((id) => db.collection(COL).doc(id).delete().catch(() => {})));
  } catch {}
}

// ── Освободить ник в name_index (вызывается при удалении аккаунта) ───────────
// Без этого следующий онбординг с тем же ником получит 'taken', т.к. документ
// name_index/{nameLower} остаётся с привязкой к старому uid даже после удаления
// users/{uid} и leaderboard/{uid}.
//
// Источники имени (в порядке приоритета):
//   1. leaderboard/{uid}.nameLower — самый достоверный, всегда нормализован.
//   2. AsyncStorage.user_name — если юзер прошёл онбординг, но ещё не получил XP.
//
// ВАЖНО: вызывать ДО deleteMyLeaderboardEntry/deleteCloudData — иначе оба
// источника будут уже стёрты.
export async function deleteMyNameReservation(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  try {
    const canonicalUid = await getCanonicalUserId();
    if (!canonicalUid) return;

    // Собираем nameLower из всех возможных источников.
    const candidates = new Set<string>();
    try {
      const localName = await AsyncStorage.getItem('user_name');
      if (localName && localName.trim()) candidates.add(localName.trim().toLowerCase());
    } catch {}

    await ensureStableAuthLinkForStableId(canonicalUid).catch(() => false);
    const fn = callable<{ stableId?: string; names: string[] }, { ok: boolean; deleted: number }>('nameReleaseMine');
    await fn({ stableId: canonicalUid, names: Array.from(candidates) });
  } catch {}
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

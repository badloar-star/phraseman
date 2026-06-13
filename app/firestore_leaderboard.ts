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
import { getCanonicalUserId } from './user_id_policy';
import { normalizeAvatarAuraId } from '../constants/avatar_auras';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';
import type { LeagueCrown } from './services/league_chest_rewards';

function isJestRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
}

// ── Кэш глобального рейтинга — читаем Firestore не чаще 1 раза в 10 минут ──
/** Экспорт для сброса при pull-to-refresh в Зале славы. */
export const GLOBAL_LB_ASYNC_CACHE_KEY = 'global_lb_cache_v4';
const LB_CACHE_KEY = GLOBAL_LB_ASYNC_CACHE_KEY;
const LB_CACHE_TTL = 3 * 60 * 1000; // 3 минуты

/** Прогрев кэша глобального топа при старте — экран «Зал славы» открывается без ожидания сети. */
export function prefetchGlobalLeaderboard(): void {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || isJestRuntime()) return;
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

export type ReserveNameStatus = 'ok' | 'taken' | 'cooldown' | 'error';
export type ReserveNameResult = {
  status: ReserveNameStatus;
  nextChangeAt?: number;
};

// ── Атомарно зарезервировать ник через транзакцию ───────────────────────────
// Возвращает 'ok' | 'taken' | 'error'
// oldName — прежний ник пользователя (для освобождения старого слота)
export async function reserveNameDetailed(
  name: string,
  oldName: string,
): Promise<ReserveNameResult> {
  if (!CLOUD_SYNC_ENABLED) return { status: 'ok' };
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) return { status: 'error' };
    await ensureStableAuthLinkForStableId(stableId).catch(() => false);
    const fn = callable<{ stableId?: string; name: string; oldName: string }, { ok: boolean; status: ReserveNameStatus; nextChangeAt?: number }>('nameReserve');
    const { data } = await fn({ stableId, name: name.trim(), oldName: oldName.trim() });
    if (data.status === 'taken') return { status: 'taken' };
    if (data.status === 'cooldown') return { status: 'cooldown', nextChangeAt: data.nextChangeAt };
    return { status: 'ok', nextChangeAt: data.nextChangeAt };
  } catch (e: any) {
    if (String(e?.message ?? '').includes('name_taken') || String(e?.code ?? '').includes('already-exists')) return { status: 'taken' };
    return { status: 'error' };
  }
}

export async function reserveName(
  name: string,
  oldName: string,
): Promise<ReserveNameStatus> {
  return (await reserveNameDetailed(name, oldName)).status;
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
    const mapDoc = (doc: any): RemoteLeaderEntry => {
      const data = doc.data();
      const leagueCrownCount = Math.max(0, Math.floor(Number(data.leagueCrownCount) || 0));
      const hasLeagueCrown = leagueCrownCount > 0 || data.leagueCrownActive === true || Number(data.leagueCrownExpiresAt) > Date.now();
      return {
        uid: doc.id,
        name: data.name ?? '',
        points: data.points ?? 0,
        lang: data.lang ?? 'ru',
        avatar: data.avatar ?? undefined,
        frame: data.frame ?? undefined,
        aura: normalizeAvatarAuraId(data.aura) ?? undefined,
        weekPoints: data.weekPoints ?? 0,
        weekKey: data.weekKey ?? '',
        streak: data.streak ?? undefined,
        leagueId: data.leagueId ?? undefined,
        isPremium: data.isPremium ?? false,
        isVip: data.isVip ?? false,
        profileCardLevel: normalizeProfileCardLevel(data.profileCardLevel),
        profileCardTheme: normalizeProfileCardTheme(data.profileCardTheme),
        profileCardMotion: normalizeProfileCardMotion(data.profileCardMotion),
        profileCardPublicFocus: normalizeProfileCardPublicFocus(data.profileCardPublicFocus),
        leagueCrown: hasLeagueCrown
          ? {
              uid: doc.id,
              name: data.name ?? '',
              weekId: String(data.leagueCrownWeekId ?? ''),
              groupId: String(data.leagueCrownGroupId ?? ''),
              leagueId: Math.max(0, Math.floor(Number(data.leagueId) || 0)),
              expiresAt: Number(data.leagueCrownExpiresAt),
              crownCount: Math.max(1, leagueCrownCount),
              aura: 'league_chest_crown',
            }
          : undefined,
        daily7xp: typeof data.daily7xp === 'number' ? data.daily7xp : undefined,
        daily7time_ms: typeof data.daily7time_ms === 'number' ? data.daily7time_ms : undefined,
      };
    };

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

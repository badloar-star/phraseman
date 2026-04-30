// ════════════════════════════════════════════════════════════════════════════
// Топ arena_profiles по полю xp (аренный рейтинг), с обогащением из leaderboard.
// Правила как в Зале славы: снимок на диске, удалённое обновление не чаще чем раз в 6 ч
// при заходе; ручное обновление — отдельный cooldown 6 ч (экран arena_leaderboard).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser } from './cloud_sync';
import type { RankLevel, RankTier } from './types/arena';

export interface ArenaLbRow {
  uid: string;
  place: number;
  displayName: string;
  arenaXp: number;
  tier: RankTier;
  levelRoman: RankLevel;
  totalXp: number;
  isPremium: boolean;
  frame?: string;
}

/** Снимок списка (как leaderboard_cache в Зале славы).
 *  v3: bump после ужесточения PLACEHOLDER_NAMES filter — старый v2 кеш мог
 *  содержать "Игрок"/"—"/тестовые записи, теперь они отфильтровываются. */
export const ARENA_TOP100_CACHE_KEY = 'arena_top100_snapshot_v3';
/** Время последнего успешного запроса к Firestore (для правила 6 ч при заходе). */
export const ARENA_REMOTE_REFRESH_AT_KEY = 'arena_top100_remote_at_v1';
export const ARENA_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;

/** Кэш моего места в общем рейтинге арены (для нижней плашки). */
export const ARENA_MY_RANK_CACHE_KEY = 'arena_my_rank_snapshot_v1';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

async function fetchLeaderboardExtras(
  uids: string[],
): Promise<Map<string, { points: number; frame?: string; isPremium: boolean }>> {
  const map = new Map<string, { points: number; frame?: string; isPremium: boolean }>();
  if (uids.length === 0) return map;
  const FieldPath = firestore.FieldPath;
  const db = firestore();
  for (const part of chunk(uids, 30)) {
    try {
      const snap = await db.collection('leaderboard').where(FieldPath.documentId(), 'in', part).get();
      snap.docs.forEach((doc) => {
        const d = doc.data() as { points?: number; frame?: string | null; isPremium?: boolean };
        map.set(doc.id, {
          points: typeof d.points === 'number' ? d.points : 0,
          frame: d.frame ?? undefined,
          isPremium: !!d.isPremium,
        });
      });
    } catch {
      /* ignore chunk */
    }
  }
  return map;
}

const TIER_ORDER: RankTier[] = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
];

function parseRank(raw: { tier?: string; level?: string } | undefined): { tier: RankTier; levelRoman: RankLevel } {
  const tier = raw?.tier && TIER_ORDER.includes(raw.tier as RankTier) ? (raw.tier as RankTier) : 'bronze';
  const lv = raw?.level === 'I' || raw?.level === 'II' || raw?.level === 'III' ? raw.level : 'I';
  return { tier, levelRoman: lv };
}

/** Имена-плейсхолдеры от старых билдов / из CF fallback'ов — НЕ показываем в лидерборде.
 *  Используется для фильтра как при свежем fetch из Firestore, так и при чтении кеша. */
const PLACEHOLDER_NAMES = new Set([
  'Игрок', 'Гравець', 'Player', 'Гость', 'Guest',
  '—', '-', '–', '',
]);

/** True если строку точно нельзя показывать как имя в лидерборде. */
function isPlaceholderName(name: string): boolean {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_NAMES.has(trimmed)) return true;
  // Защита от вариаций типа "Игрок 1", "Игрок-2" — это тоже наследие тестов.
  if (/^(Игрок|Гравець|Player|Guest)[\s\-_]*\d*$/i.test(trimmed)) return true;
  return false;
}

/** Постфильтр кеша/удалённых данных — на случай если в кеше осталось наследие
 *  до ввода фильтра, или Firestore вернул новые placeholder-варианты. */
function stripPlaceholdersAndReplace(rows: ArenaLbRow[]): ArenaLbRow[] {
  const cleaned = rows.filter((r) => !isPlaceholderName(r.displayName));
  // После фильтрации перенумеруем места, чтобы не было дыр (1, 2, 4, 5...).
  return cleaned.map((r, i) => ({ ...r, place: i + 1 }));
}

async function queryArenaProfilesTop100(): Promise<ArenaLbRow[]> {
  const db = firestore();
  // Берём с запасом (×3), потом фильтруем плейсхолдеры и без матчей и режем до 100.
  const snap = await db.collection('arena_profiles').orderBy('xp', 'desc').limit(300).get();
  if (snap.empty) return [];

  const uids: string[] = [];
  const baseRows: Omit<ArenaLbRow, 'totalXp' | 'isPremium' | 'frame'>[] = [];

  let place = 0;
  for (const doc of snap.docs) {
    const d = doc.data() as {
      displayName?: string;
      rank?: { tier?: string; level?: string };
      xp?: number;
      stats?: { matchesPlayed?: number };
    };
    const dnRaw = String(d.displayName ?? '').trim();
    const matchesPlayed = Number(d.stats?.matchesPlayed ?? 0);
    // Скрываем «Игрок»/«Гравець»/пустое/тестовые + профайлы без сыгранных матчей
    // (часто это просто запись с multipliers, созданная xp_manager.ts при первом
    // начислении XP в обычной игре, без участия в дуэлях).
    if (isPlaceholderName(dnRaw) || matchesPlayed <= 0) continue;
    place += 1;
    if (place > 100) break;
    const { tier, levelRoman } = parseRank(d.rank);
    uids.push(doc.id);
    baseRows.push({
      uid: doc.id,
      place,
      displayName: dnRaw,
      arenaXp: typeof d.xp === 'number' ? d.xp : 0,
      tier,
      levelRoman,
    });
  }

  const extras = await fetchLeaderboardExtras(uids);

  return baseRows.map((row) => {
    const x = extras.get(row.uid);
    const points = x?.points ?? 0;
    return {
      ...row,
      totalXp: points,
      isPremium: x?.isPremium ?? false,
      frame: x?.frame,
    };
  });
}

/**
 * Загрузка топ-100: как Зал славы — показываем последний снимок, удалённое обновление
 * только если прошло ≥6 ч с последнего успешного запроса или передан forceRemote (ручная кнопка).
 */
export async function loadArenaTop100(opts?: { forceRemote?: boolean }): Promise<ArenaLbRow[]> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return [];

  let cachedRows: ArenaLbRow[] = [];
  try {
    const raw = await AsyncStorage.getItem(ARENA_TOP100_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { data?: ArenaLbRow[]; timestamp?: number };
      if (Array.isArray(parsed.data)) {
        // Defensive: даже если кеш был сохранён до фильтра — отрезаем плейсхолдеры
        // на чтении, чтобы юзер не видел "Игрок"/"—" пока не подоспеет remote refresh.
        cachedRows = stripPlaceholdersAndReplace(parsed.data);
      }
    }
  } catch {
    /* ignore */
  }

  const lastRemoteAtRaw = await AsyncStorage.getItem(ARENA_REMOTE_REFRESH_AT_KEY);
  const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
  const shouldFetchRemote =
    !!opts?.forceRemote || Date.now() - lastRemoteAt >= ARENA_REMOTE_REFRESH_MS;

  if (!shouldFetchRemote) {
    return cachedRows;
  }

  if (!getFirestore()) {
    return cachedRows;
  }

  await ensureAnonUser().catch(() => null);

  try {
    const fetched = await queryArenaProfilesTop100();
    // Двойная защита — теоретически queryArenaProfilesTop100 уже отфильтровал,
    // но если в будущем добавится новая placeholder-вариация — здесь подстрахуем.
    const result = stripPlaceholdersAndReplace(fetched);
    if (result.length > 0) {
      try {
        await AsyncStorage.multiSet([
          [ARENA_TOP100_CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() })],
          [ARENA_REMOTE_REFRESH_AT_KEY, String(Date.now())],
        ]);
      } catch {
        /* ignore */
      }
      return result;
    }
    return cachedRows;
  } catch {
    return cachedRows;
  }
}

/**
 * Аналог fetchMyGlobalRank: считает место текущего пользователя в общем рейтинге арены
 * (по полю xp в коллекции arena_profiles). Возвращает null, если профиля ещё нет.
 *
 * Подход:
 *   1. Берём всех с xp > myXp (limit 1000 — достаточно даже для очень больших баз).
 *   2. Фильтруем placeholder-имена и профили без сыгранных матчей в коде —
 *      это документы которые НЕ показываются в Top-100 (см. queryArenaProfilesTop100),
 *      и не должны учитываться в моём ранге, иначе юзер видит «6 место» когда
 *      Top-100 пустой (как в скриншоте 2026-04-29).
 *   3. Место = filtered.length + 1.
 *
 * Раньше использовался Firestore count() — он быстрее, но не позволяет применить
 * client-side фильтр. После cleanup placeholders разница в стоимости минимальна.
 */
export async function fetchMyArenaRank(): Promise<number | null> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return null;
  const db = getFirestore();
  if (!db) return null;
  try {
    const uid = await ensureAnonUser();
    if (!uid) return null;

    const myDoc = await db.collection('arena_profiles').doc(uid).get();
    if (!myDoc.exists) return null;
    const data = myDoc.data() as { xp?: number; stats?: { matchesPlayed?: number } } | undefined;
    const myXp = typeof data?.xp === 'number' ? data.xp : 0;
    const matchesPlayed = data?.stats?.matchesPlayed ?? 0;
    if (matchesPlayed < 1 && myXp <= 0) return null;

    try {
      const snap = await db
        .collection('arena_profiles')
        .where('xp', '>', myXp)
        .limit(1000)
        .get();
      // Считаем только тех кто реально показывается в Top-100:
      // имя — не placeholder И есть сыгранные матчи.
      let above = 0;
      snap.docs.forEach((doc: any) => {
        const d = doc.data() as { displayName?: string; stats?: { matchesPlayed?: number } };
        const dn = String(d.displayName ?? '').trim();
        const mp = Number(d.stats?.matchesPlayed ?? 0);
        if (isPlaceholderName(dn)) return;
        if (mp <= 0) return;
        above += 1;
      });
      const place = above + 1;
      try {
        await AsyncStorage.setItem(
          ARENA_MY_RANK_CACHE_KEY,
          JSON.stringify({ place, ts: Date.now() }),
        );
      } catch { /* ignore */ }
      return place;
    } catch {
      // Если query упал — отдаём кеш, не ломаем UI.
      const raw = await AsyncStorage.getItem(ARENA_MY_RANK_CACHE_KEY).catch(() => null);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { place?: number };
          if (typeof parsed?.place === 'number') return parsed.place;
        } catch { /* ignore */ }
      }
      return null;
    }
  } catch {
    try {
      const raw = await AsyncStorage.getItem(ARENA_MY_RANK_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { place?: number };
        if (typeof parsed?.place === 'number') return parsed.place;
      }
    } catch { /* ignore */ }
    return null;
  }
}

/** Last-known место «меня» в топе арены — без запроса в Firestore. */
export async function getCachedMyArenaRank(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(ARENA_MY_RANK_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { place?: number };
    return typeof parsed?.place === 'number' ? parsed.place : null;
  } catch {
    return null;
  }
}

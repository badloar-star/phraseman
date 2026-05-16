// ════════════════════════════════════════════════════════════════════════════
// Топ арены + обогащение: запрос к leaderboard/users И снимок course* на arena_profiles
// (если в users нет firebaseAuthUid — без снимка уровень был бы 1).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureArenaAuthUid } from './user_id_policy';
import type { RankLevel, RankTier } from './types/arena';
import { normalizeAvatarAuraId } from '../constants/avatar_auras';
import { fetchActiveLeagueCrowns, type LeagueCrown } from './services/league_chest_rewards';
import {
  normalizeProfileCardLevel,
  normalizeProfileCardMotion,
  normalizeProfileCardPublicFocus,
  normalizeProfileCardTheme,
} from './profile_card_system';

export interface ArenaLbRow {
  uid: string;
  friendUid?: string;
  place: number;
  displayName: string;
  arenaXp: number;
  tier: RankTier;
  levelRoman: RankLevel;
  totalXp: number;
  isPremium: boolean;
  frame?: string;
  aura?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  leagueCrown?: LeagueCrown;
  /** Кастомный эмодзи-аватар из глобального рейтинга (если есть). */
  avatarEmoji?: string;
}

/** Снимок списка (как leaderboard_cache в Зале славы).
 *  v7: fallback-дедуп старых arena_profiles по уникальному displayName.
 *  v6: строки несут friendUid = stable users id для заявок в друзья из карточки.
 *  v5: чтение leaderboard по полю firebaseAuthUid (ключ документа = stableId).
 *  v4: дедуп по stable users id.
 *  v3: bump после ужесточения PLACEHOLDER_NAMES filter — старый v2 кеш мог
 *  содержать "Игрок"/"—"/тестовые записи, теперь они отфильтровываются. */
export const ARENA_TOP100_CACHE_KEY = 'arena_top100_snapshot_v8';
const ARENA_TOP100_LEGACY_CACHE_KEYS = [
  'arena_top100_snapshot_v7',
  'arena_top100_snapshot_v6',
  'arena_top100_snapshot_v5',
  'arena_top100_snapshot_v4',
  'arena_top100_snapshot_v3',
  'arena_top100_snapshot_v2',
  'arena_top100_snapshot_v1',
];
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

/** Данные для уровня/аватара: глобальный leaderboard/{stableId}. */
interface LbExtras {
  points: number;
  frame?: string;
  aura?: string;
  leagueCrown?: LeagueCrown;
  isPremium: boolean;
  avatarEmoji?: string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
}

function mergeLbExtras(prev: LbExtras | undefined, next: LbExtras): LbExtras {
  if (!prev) return next;
  if (next.points > prev.points) {
    return {
      points: next.points,
      frame: next.frame ?? prev.frame,
      aura: next.aura ?? prev.aura,
      leagueCrown: next.leagueCrown ?? prev.leagueCrown,
      isPremium: prev.isPremium || next.isPremium,
      avatarEmoji: next.avatarEmoji ?? prev.avatarEmoji,
      profileCardLevel: next.profileCardLevel ?? prev.profileCardLevel,
      profileCardTheme: next.profileCardTheme ?? prev.profileCardTheme,
      profileCardMotion: next.profileCardMotion ?? prev.profileCardMotion,
      profileCardPublicFocus: next.profileCardPublicFocus ?? prev.profileCardPublicFocus,
    };
  }
  if (prev.points > next.points) {
    return {
      points: prev.points,
      frame: prev.frame ?? next.frame,
      aura: prev.aura ?? next.aura,
      leagueCrown: prev.leagueCrown ?? next.leagueCrown,
      isPremium: prev.isPremium || next.isPremium,
      avatarEmoji: prev.avatarEmoji ?? next.avatarEmoji,
      profileCardLevel: prev.profileCardLevel ?? next.profileCardLevel,
      profileCardTheme: prev.profileCardTheme ?? next.profileCardTheme,
      profileCardMotion: prev.profileCardMotion ?? next.profileCardMotion,
      profileCardPublicFocus: prev.profileCardPublicFocus ?? next.profileCardPublicFocus,
    };
  }
  return {
    points: prev.points,
    frame: prev.frame ?? next.frame,
    aura: prev.aura ?? next.aura,
    leagueCrown: prev.leagueCrown ?? next.leagueCrown,
    isPremium: prev.isPremium || next.isPremium,
    avatarEmoji: prev.avatarEmoji ?? next.avatarEmoji,
    profileCardLevel: prev.profileCardLevel ?? next.profileCardLevel,
    profileCardTheme: prev.profileCardTheme ?? next.profileCardTheme,
    profileCardMotion: prev.profileCardMotion ?? next.profileCardMotion,
    profileCardPublicFocus: prev.profileCardPublicFocus ?? next.profileCardPublicFocus,
  };
}

function parseLeaderboardDoc(data: Record<string, unknown> | undefined): LbExtras | null {
  if (!data) return null;
  const d = data as {
    points?: number;
    frame?: string | null;
    aura?: string | null;
    isPremium?: boolean;
    avatar?: string | null;
    profileCardLevel?: unknown;
    profileCardTheme?: unknown;
    profileCardMotion?: unknown;
    profileCardPublicFocus?: unknown;
    leagueCrownExpiresAt?: number | null;
  };
  return {
    points: typeof d.points === 'number' ? d.points : 0,
    frame: typeof d.frame === 'string' && d.frame.trim() ? d.frame : undefined,
    aura: normalizeAvatarAuraId(d.aura) ?? undefined,
    isPremium: !!d.isPremium,
    avatarEmoji: typeof d.avatar === 'string' && d.avatar.trim() ? d.avatar.trim() : undefined,
    profileCardLevel: normalizeProfileCardLevel(d.profileCardLevel),
    profileCardTheme: normalizeProfileCardTheme(d.profileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(d.profileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(d.profileCardPublicFocus),
    leagueCrown: Number(d.leagueCrownExpiresAt) > Date.now()
      ? {
          uid: '',
          name: '',
          weekId: '',
          groupId: '',
          leagueId: 0,
          expiresAt: Number(d.leagueCrownExpiresAt),
          aura: 'league_chest_crown',
        }
      : undefined,
  };
}

/** Документ leaderboard почти всегда с id = stable; ищем копию по Firebase Auth uid. */
async function fetchLbExtrasByFirebaseAuthUid(db: ReturnType<typeof firestore>, authUid: string): Promise<LbExtras | null> {
  try {
    const snap = await db.collection('leaderboard').where('firebaseAuthUid', '==', authUid).limit(4).get();
    if (snap.empty) return null;
    let acc: LbExtras | undefined;
    snap.docs.forEach((docSnap) => {
      const p = parseLeaderboardDoc(docSnap.data() as Record<string, unknown>);
      if (p) acc = acc ? mergeLbExtras(acc, p) : p;
    });
    return acc ?? null;
  } catch {
    return null;
  }
}

function progressTotalXp(progress: Record<string, unknown> | undefined): number {
  const raw = progress?.user_total_xp;
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) || 0 : 0;
  return n > 0 ? n : 0;
}

function progressAvatar(progress: Record<string, unknown> | undefined): string | undefined {
  const raw = progress?.user_avatar;
  const avatar = typeof raw === 'string' ? raw.trim() : '';
  return avatar || undefined;
}

function progressAura(progress: Record<string, unknown> | undefined): string | undefined {
  const raw = progress?.user_avatar_aura;
  return normalizeAvatarAuraId(typeof raw === 'string' ? raw.trim() : '');
}

/** Снимок с doc arena_profiles (пишут клиент при синке/push и CF после матча). */
function courseExtrasFromProfileData(d: Record<string, unknown>): LbExtras | undefined {
  const xp = typeof d.courseTotalXp === 'number' ? d.courseTotalXp : 0;
  const av = typeof d.courseAvatar === 'string' ? d.courseAvatar.trim() : '';
  const fr = typeof d.courseFrame === 'string' ? d.courseFrame.trim() : '';
  const aura = normalizeAvatarAuraId(typeof d.courseAura === 'string' ? d.courseAura.trim() : '');
  const isP = !!d.courseIsPremium;
  const profileCardLevel = normalizeProfileCardLevel(d.courseProfileCardLevel);
  if (xp <= 0 && !av && !fr && !aura && !isP && profileCardLevel <= 0) return undefined;
  return {
    points: xp > 0 ? xp : 0,
    avatarEmoji: av || undefined,
    frame: fr || undefined,
    aura,
    isPremium: isP,
    profileCardLevel,
    profileCardTheme: normalizeProfileCardTheme(d.courseProfileCardTheme),
    profileCardMotion: normalizeProfileCardMotion(d.courseProfileCardMotion),
    profileCardPublicFocus: normalizeProfileCardPublicFocus(d.courseProfileCardPublicFocus),
  };
}

/** Удалённые данные (leaderboard/users) или снимок с arena_profiles — берём max по очкам. */
function mergeRemoteAndProfileExtras(
  remote: LbExtras | undefined,
  profile: LbExtras | undefined,
): LbExtras {
  const rPts = remote?.points ?? 0;
  const pPts = profile?.points ?? 0;
  const points = Math.max(rPts, pPts);
  const useRemote = rPts >= pPts;
  const pri = useRemote ? remote : profile;
  const sec = useRemote ? profile : remote;
  return {
    points,
    frame: pri?.frame ?? sec?.frame,
    aura: pri?.aura ?? sec?.aura,
    leagueCrown: pri?.leagueCrown ?? sec?.leagueCrown,
    avatarEmoji: pri?.avatarEmoji ?? sec?.avatarEmoji,
    isPremium: (remote?.isPremium ?? false) || (profile?.isPremium ?? false),
    profileCardLevel: pri?.profileCardLevel ?? sec?.profileCardLevel,
    profileCardTheme: pri?.profileCardTheme ?? sec?.profileCardTheme,
    profileCardMotion: pri?.profileCardMotion ?? sec?.profileCardMotion,
    profileCardPublicFocus: pri?.profileCardPublicFocus ?? sec?.profileCardPublicFocus,
  };
}

/** Один «логический» аккаунт в облаке: users/{id} или связка firebaseAuthUid → этот id. */
async function resolveStableGroupKey(authUid: string): Promise<string> {
  // users/* is intentionally private in Firestore rules. Public leaderboards
  // must not fan out into private user docs; use arena mirrorStableId/name
  // grouping and public leaderboard docs instead.
  return `a:${authUid}`;
}

async function resolveStableGroupKeys(uids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const part of chunk(uids, 15)) {
    await Promise.all(
      part.map(async (uid) => {
        map.set(uid, await resolveStableGroupKey(uid));
      }),
    );
  }
  return map;
}

function foldMergedExtrasForUids(
  uids: string[],
  extras: Map<string, LbExtras>,
  profileCourse: Map<string, LbExtras>,
): LbExtras {
  let acc: LbExtras | undefined;
  for (const uid of uids) {
    const row = mergeRemoteAndProfileExtras(extras.get(uid), profileCourse.get(uid));
    acc = acc ? mergeLbExtras(acc, row) : row;
  }
  return acc ?? { points: 0, isPremium: false };
}

type ArenaCandidate = {
  uid: string;
  displayName: string;
  arenaXp: number;
  tier: RankTier;
  levelRoman: RankLevel;
  mirrorStableId?: string;
};

function stableBucketKey(c: ArenaCandidate, stableKeyByUid: Map<string, string>): string {
  if (c.mirrorStableId) return `s:${c.mirrorStableId}`;
  return stableKeyByUid.get(c.uid) ?? `a:${c.uid}`;
}

function stableUidFromBucketKey(key: string): string | undefined {
  return key.startsWith('s:') ? key.slice(2) : undefined;
}

function normalizedArenaNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Обогащение строк топа арены: очки уроков / премиум / рамка / аватар.
 *
 * arena_profiles/{id} всегда keyed по Firebase Auth uid; глобальный рейтинг и users/*
 * — по стабильному id устройства (см. cloud_sync.ensureAnonUser). Раньше читали только
 * leaderboard/{authUid} → почти всегда пусто → уровень 1 и дефолтный аватар.
 */
async function fetchLeaderboardExtras(uids: string[]): Promise<Map<string, LbExtras>> {
  const map = new Map<string, LbExtras>();
  if (uids.length === 0) return map;
  const FieldPath = firestore.FieldPath;
  const db = firestore();

  // 0) Документ leaderboard почти всегда id = stableId; привязка к аренному Auth uid в поле firebaseAuthUid.
  for (const part of chunk(uids, 12)) {
    await Promise.all(
      part.map(async (authUid) => {
        try {
          const found = await fetchLbExtrasByFirebaseAuthUid(db, authUid);
          if (found) map.set(authUid, mergeLbExtras(map.get(authUid), found));
        } catch {
          /* ignore */
        }
      }),
    );
  }

  // 1) Редкий legacy: leaderboard/{authUid}
  for (const part of chunk(uids, 30)) {
    try {
      const snap = await db.collection('leaderboard').where(FieldPath.documentId(), 'in', part).get();
      snap.docs.forEach((doc) => {
        const parsed = parseLeaderboardDoc(doc.data() as Record<string, unknown>);
        if (parsed) map.set(doc.id, mergeLbExtras(map.get(doc.id), parsed));
      });
    } catch {
      /* ignore chunk */
    }
  }

  const needFallback = uids.filter((uid) => (map.get(uid)?.points ?? 0) <= 0);
  needFallback.forEach((uid) => {
    if (!map.has(uid)) map.set(uid, { points: 0, isPremium: false });
  });

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

/** Имена-плейсхолдеры от старых билдов / из CF fallback\'ов — НЕ показываем в лидерборде.
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
  const snap = await firestore().collection('arena_profiles').orderBy('xp', 'desc').limit(450).get();
  if (snap.empty) return [];

  const candidates: ArenaCandidate[] = [];
  const profileCourseByUid = new Map<string, LbExtras>();

  for (const doc of snap.docs) {
    const d = doc.data() as {
      displayName?: string;
      rank?: { tier?: string; level?: string };
      xp?: number;
      stats?: { matchesPlayed?: number };
      mirrorStableId?: string | null;
    };
    const pex = courseExtrasFromProfileData(doc.data() as Record<string, unknown>);
    if (pex) profileCourseByUid.set(doc.id, pex);

    const dnRaw = String(d.displayName ?? '').trim();
    const matchesPlayed = Number(d.stats?.matchesPlayed ?? 0);
    if (isPlaceholderName(dnRaw) || matchesPlayed <= 0) continue;

    const { tier, levelRoman } = parseRank(d.rank);
    const msRaw = d.mirrorStableId;
    const mirrorStableId = typeof msRaw === 'string' && msRaw.trim() ? msRaw.trim() : undefined;
    candidates.push({
      uid: doc.id,
      displayName: dnRaw,
      arenaXp: typeof d.xp === 'number' ? d.xp : 0,
      tier,
      levelRoman,
      ...(mirrorStableId ? { mirrorStableId } : {}),
    });
  }

  if (candidates.length === 0) return [];

  const uids = candidates.map((c) => c.uid);
  const [stableKeyByUid, extras] = await Promise.all([
    resolveStableGroupKeys(uids),
    fetchLeaderboardExtras(uids),
  ]);

  const stableKeyByName = new Map<string, string>();
  for (const c of candidates) {
    const stableKey = stableBucketKey(c, stableKeyByUid);
    if (stableKey.startsWith('s:')) {
      const nameKey = normalizedArenaNameKey(c.displayName);
      if (nameKey && !stableKeyByName.has(nameKey)) {
        stableKeyByName.set(nameKey, stableKey);
      }
    }
  }

  const groups = new Map<string, ArenaCandidate[]>();
  for (const c of candidates) {
    const directKey = stableBucketKey(c, stableKeyByUid);
    const nameKey = normalizedArenaNameKey(c.displayName);
    const sk = directKey.startsWith('s:')
      ? directKey
      : stableKeyByName.get(nameKey) ?? (nameKey ? `n:${nameKey}` : directKey);
    const arr = groups.get(sk) ?? [];
    arr.push(c);
    groups.set(sk, arr);
  }

  const mergedRows: ArenaLbRow[] = [];
  for (const [stableKey, group] of groups.entries()) {
    group.sort((x, y) => y.arenaXp - x.arenaXp || x.uid.localeCompare(y.uid));
    const win = group[0];
    const uidsInGroup = group.map((g) => g.uid);
    const ex = foldMergedExtrasForUids(uidsInGroup, extras, profileCourseByUid);
    const friendUid = stableUidFromBucketKey(stableKey);
    mergedRows.push({
      uid: win.uid,
      ...(friendUid ? { friendUid } : {}),
      place: 0,
      displayName: win.displayName,
      arenaXp: win.arenaXp,
      tier: win.tier,
      levelRoman: win.levelRoman,
      totalXp: ex.points,
      isPremium: ex.isPremium,
      frame: ex.frame,
      aura: ex.aura,
      avatarEmoji: ex.avatarEmoji,
      profileCardLevel: ex.profileCardLevel,
      profileCardTheme: ex.profileCardTheme,
      profileCardMotion: ex.profileCardMotion,
      profileCardPublicFocus: ex.profileCardPublicFocus,
    });
  }

  const crowns = await fetchActiveLeagueCrowns(
    mergedRows.map((r) => r.friendUid).filter((uid): uid is string => !!uid),
  );
  mergedRows.forEach((row) => {
    if (row.friendUid && crowns[row.friendUid]) {
      row.leagueCrown = crowns[row.friendUid];
    }
  });

  mergedRows.sort((x, y) => y.arenaXp - x.arenaXp || x.uid.localeCompare(y.uid));
  return mergedRows.slice(0, 100).map((r, i) => ({ ...r, place: i + 1 }));
}

export async function loadCachedArenaTop100(): Promise<ArenaLbRow[]> {
  const keys = [ARENA_TOP100_CACHE_KEY, ...ARENA_TOP100_LEGACY_CACHE_KEYS];
  for (const key of keys) {
    let cachedRows: ArenaLbRow[] = [];
    try {
      const raw = await AsyncStorage.getItem(key);
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
    if (cachedRows.length > 0) {
      if (key !== ARENA_TOP100_CACHE_KEY) {
        await AsyncStorage.setItem(
          ARENA_TOP100_CACHE_KEY,
          JSON.stringify({ data: cachedRows, timestamp: Date.now() }),
        ).catch(() => {});
      }
      return cachedRows;
    }
  }
  return [];
}

async function fetchAndCacheArenaTop100(): Promise<ArenaLbRow[]> {
  if (!getFirestore()) {
    return [];
  }

  await ensureArenaAuthUid().catch(() => null);

  try {
    const fetched = await queryArenaProfilesTop100();
    // Двойная защита — теоретически queryArenaProfilesTop100 уже отфильтровал,
    // но если в будущем добавится новая placeholder-вариация — здесь подстрахуем.
    const result = stripPlaceholdersAndReplace(fetched);
    if (result.length > 0) {
      await AsyncStorage.multiSet([
        [ARENA_TOP100_CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() })],
        [ARENA_REMOTE_REFRESH_AT_KEY, String(Date.now())],
      ]).catch(() => {});
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Загрузка топ-100: cache-first. Если кеш есть, он возвращается сразу, а устаревшее
 * remote-обновление идёт фоном через onBackgroundRefresh без пустого экрана.
 */
export async function loadArenaTop100(opts?: {
  forceRemote?: boolean;
  onBackgroundRefresh?: (rows: ArenaLbRow[]) => void;
}): Promise<ArenaLbRow[]> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return [];

  const cachedRows = await loadCachedArenaTop100();

  const lastRemoteAtRaw = await AsyncStorage.getItem(ARENA_REMOTE_REFRESH_AT_KEY);
  const lastRemoteAt = parseInt(lastRemoteAtRaw || '0', 10) || 0;
  const shouldFetchRemote =
    !!opts?.forceRemote || cachedRows.length === 0 || Date.now() - lastRemoteAt >= ARENA_REMOTE_REFRESH_MS;

  if (!shouldFetchRemote) {
    return cachedRows;
  }

  if (cachedRows.length > 0 && !opts?.forceRemote) {
    void fetchAndCacheArenaTop100()
      .then((freshRows) => {
        if (freshRows.length > 0) opts?.onBackgroundRefresh?.(freshRows);
      })
      .catch(() => {});
    return cachedRows;
  }

  const fetchedRows = await fetchAndCacheArenaTop100();
  return fetchedRows.length > 0 ? fetchedRows : cachedRows;
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
    const uid = await ensureArenaAuthUid();
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

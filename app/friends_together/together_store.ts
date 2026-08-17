/**
 * «Вместе» — стор пар друзей. Считает per-friend состояние (дни/уровень/сегодня
 * общий день/забранный уровень) из батча профилей друзей + своих активных дней +
 * серверных `friend_pairs`, кэширует снапшот в AsyncStorage для мгновенного первого
 * кадра, обновляет только по явному вызову (открытие вкладки Друзья / после клейма) —
 * НИКАКИХ листенеров и таймеров (Firebase-экономия, см. правило владельца о лигах).
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §4, §6.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getLocalDayKey } from '../local_date';
import { getWeekKey } from '../hall_of_fame_utils';
import { getCanonicalUserId } from '../user_id_policy';
import type { FriendProfileBatchRecord } from '../friends_profiles_batch';
import {
  bonusPercentForLevel,
  daysTogether,
  decodeActiveDays,
  hasCommonDay,
  levelForDays,
  type ActiveDays,
} from './together_days';

const SNAPSHOT_KEY = 'friends_together_snapshot_v1';
const BONUS_KEY = 'friends_together_bonus_v1';
const PAIRS_CACHE_KEY = 'friends_together_pairs_cache_v1';
const PAIRS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // владелец: чужие цифры не чаще раза в 6ч

export type FriendPairServerState = Readonly<{
  friendUid: string;
  /** Реферальный бонус дней, начисленный сервером (friend_pairs.bonusDays). */
  bonusDays: number;
  /** Уровень, который МЫ уже забрали звёздами за эту пару (friend_pairs.claimedLevel[me]). */
  claimedLevel: number;
  /** Буст сундука недели активен (friend_pairs.boostUntilWeekKey покрывает текущую неделю). */
  boostActive: boolean;
}>;

export type FriendTogetherPairState = Readonly<{
  friendUid: string;
  days: number;
  level: number;
  todayCommon: boolean;
  claimedLevel: number;
  bonusPercent: number;
  weeklyXp: number;
  /** Реферальный буст сундука (×2 вклада) действует на текущей неделе. */
  boostActive: boolean;
}>;

export type FriendsTogetherSnapshot = Readonly<{
  updatedAtMs: number;
  myDayKey: string;
  pairs: Record<string, FriendTogetherPairState>;
}>;

type PairsCachePayload = Readonly<{
  fetchedAtMs: number;
  pairs: Record<string, { bonusDays: number; claimedLevel: number; boostActive: boolean }>;
}>;

// ── Firestore access (lazy require — тот же паттерн, что firestore_friend_requests.ts) ──
const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parsePairsCache(raw: string | null): PairsCachePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || typeof parsed.fetchedAtMs !== 'number' || !isRecord(parsed.pairs)) return null;
    const pairs: PairsCachePayload['pairs'] = {};
    for (const [uid, v] of Object.entries(parsed.pairs)) {
      if (!isRecord(v)) continue;
      pairs[uid] = {
        bonusDays: Number.isFinite(v.bonusDays) ? Math.max(0, Math.floor(Number(v.bonusDays))) : 0,
        claimedLevel: Number.isFinite(v.claimedLevel) ? Math.max(0, Math.floor(Number(v.claimedLevel))) : 0,
        boostActive: v.boostActive === true,
      };
    }
    return { fetchedAtMs: parsed.fetchedAtMs, pairs };
  } catch {
    return null;
  }
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/**
 * Читает `friend_pairs` для текущего пользователя. Кэш 6ч в AsyncStorage —
 * освежается только когда вызывающий явно попросит (force) либо кэш протух.
 * НИКОГДА не бросает: сеть недоступна → отдаёт то, что есть в кэше (пусто, если кэша нет).
 */
export async function loadFriendPairsServerState(
  friendUids: readonly string[],
  options: { force?: boolean } = {},
): Promise<Record<string, FriendPairServerState>> {
  const uniqueUids = [...new Set(friendUids.filter(Boolean))];
  const out: Record<string, FriendPairServerState> = {};
  for (const uid of uniqueUids) {
    out[uid] = { friendUid: uid, bonusDays: 0, claimedLevel: 0, boostActive: false };
  }
  if (uniqueUids.length === 0) return out;

  const now = Date.now();
  const cachedRaw = await AsyncStorage.getItem(PAIRS_CACHE_KEY).catch(() => null);
  const cached = parsePairsCache(cachedRaw);
  const cacheIsFresh = !!cached && now - cached.fetchedAtMs < PAIRS_CACHE_TTL_MS;

  if (cached) {
    for (const uid of uniqueUids) {
      const hit = cached.pairs[uid];
      if (hit) out[uid] = { friendUid: uid, ...hit };
    }
  }
  if (!options.force && cacheIsFresh) return out;

  const db = getFirestore();
  const myUid = await getCanonicalUserId();
  if (!db || !myUid) return out; // офлайн/Expo Go: отдаём кэш как есть

  try {
    // Firebase-экономия: жёсткий потолок на случай аномального числа пар —
    // friendsGetProfiles сам батчит по 100 uid за вызов (см. friends_profiles_batch.ts),
    // 200 даёт запас без риска вытянуть неограниченную коллекцию.
    const snap = await db
      .collection('friend_pairs')
      .where('uids', 'array-contains', myUid)
      .limit(200)
      .get();
    const fetchedPairs: PairsCachePayload['pairs'] = { ...(cached?.pairs ?? {}) };
    snap.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      const data = doc.data() || {};
      const uids = Array.isArray(data.uids) ? (data.uids as unknown[]).map(String) : [];
      const otherUid = uids.find((u) => u !== myUid);
      if (!otherUid) return;
      const claimedLevelMap = isRecord(data.claimedLevel) ? data.claimedLevel : {};
      const bonusDays = Number.isFinite(data.bonusDays) ? Math.max(0, Math.floor(Number(data.bonusDays))) : 0;
      const claimedLevel = Number.isFinite(claimedLevelMap[myUid])
        ? Math.max(0, Math.floor(Number(claimedLevelMap[myUid])))
        : 0;
      const boostUntilWeekKey = typeof data.boostUntilWeekKey === 'string' ? data.boostUntilWeekKey : null;
      // зачем: сервер считает буст ×2 только пока boostUntilWeekKey ≥ текущей недели —
      // клиентская полоса сундука должна совпадать, иначе после первой недели она врёт вверх.
      const boostActive = !!boostUntilWeekKey && boostUntilWeekKey >= getWeekKey(new Date());
      fetchedPairs[otherUid] = { bonusDays, claimedLevel, boostActive };
      if (uniqueUids.includes(otherUid)) {
        out[otherUid] = { friendUid: otherUid, bonusDays, claimedLevel, boostActive };
      }
    });
    await AsyncStorage.setItem(PAIRS_CACHE_KEY, JSON.stringify({ fetchedAtMs: now, pairs: fetchedPairs })).catch(() => {});
  } catch {
    // сеть недоступна — кэш уже применён выше, молча остаёмся на нём
  }

  return out;
}

/** Синхронное чтение снапшота из памяти после prime/refresh — для мгновенного первого кадра. */
let _memorySnapshot: FriendsTogetherSnapshot | null = null;

export function getFriendsTogetherSnapshot(): FriendsTogetherSnapshot | null {
  return _memorySnapshot;
}

/** Прогреть снапшот из AsyncStorage (вызывать рядом со стартовым прогревом друзей). */
export async function primeFriendsTogetherSnapshot(): Promise<FriendsTogetherSnapshot | null> {
  if (_memorySnapshot) return _memorySnapshot;
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.pairs) || typeof parsed.updatedAtMs !== 'number') return null;
    _memorySnapshot = parsed as unknown as FriendsTogetherSnapshot;
    return _memorySnapshot;
  } catch {
    return null;
  }
}

async function readMyActiveDays(): Promise<ActiveDays | null> {
  try {
    const raw = await AsyncStorage.getItem('active_days_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || typeof parsed.anchor !== 'string' || typeof parsed.bits !== 'string') return null;
    return { anchor: parsed.anchor, bits: parsed.bits };
  } catch {
    return null;
  }
}

/**
 * Пересчитать состояние пар из батча профилей друзей (см. friends_profiles_batch.ts)
 * + серверных friend_pairs. Пишет снапшот в AsyncStorage и friends_together_bonus_v1
 * (максимальный XP-бонус среди друзей уровня ≥2 с общим днём сегодня — для xp_manager).
 * НЕ вызывает сеть сама по себе кроме loadFriendPairsServerState (кэш 6ч).
 */
export async function refreshFriendsTogether(
  profiles: readonly FriendProfileBatchRecord[],
  options: { forcePairsRefresh?: boolean } = {},
): Promise<FriendsTogetherSnapshot> {
  const myActiveDays = await readMyActiveDays();
  const myDayKey = getLocalDayKey();
  const friendUids = profiles.map((p) => p.uid).filter(Boolean);
  const pairsServerState = await loadFriendPairsServerState(friendUids, { force: options.forcePairsRefresh });

  const pairs: Record<string, FriendTogetherPairState> = {};
  let bestBonusPercent = 0;

  for (const profile of profiles) {
    if (!profile.uid) continue;
    const friendActiveDays = profile.activeDays ?? null;
    const server = pairsServerState[profile.uid] ?? { friendUid: profile.uid, bonusDays: 0, claimedLevel: 0, boostActive: false };
    const days = daysTogether(myActiveDays, friendActiveDays, server.bonusDays);
    const level = levelForDays(days);
    const todayCommon = hasCommonDay(myActiveDays, friendActiveDays, myDayKey);
    const bonusPercent = bonusPercentForLevel(level);

    pairs[profile.uid] = {
      friendUid: profile.uid,
      days,
      level,
      todayCommon,
      claimedLevel: server.claimedLevel,
      bonusPercent,
      weeklyXp: Math.max(0, Math.floor(profile.weeklyXp ?? 0)),
      boostActive: server.boostActive === true,
    };

    if (todayCommon && level >= 2 && bonusPercent > bestBonusPercent) {
      bestBonusPercent = bonusPercent;
    }
  }

  const snapshot: FriendsTogetherSnapshot = { updatedAtMs: Date.now(), myDayKey, pairs };
  _memorySnapshot = snapshot;

  await Promise.all([
    AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)).catch(() => {}),
    AsyncStorage.setItem(BONUS_KEY, JSON.stringify({ dayKey: myDayKey, percent: bestBonusPercent })).catch(() => {}),
  ]);

  return snapshot;
}

/** Экспорт для tests/UI: раскодировать чьи-то active_days в набор дат (реэкспорт удобства). */
export { decodeActiveDays };

/* expo-router route shim */
export default function __RouteShim() { return null; }

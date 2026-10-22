/**
 * «Вместе» — стор пар друзей. Считает per-friend состояние (дни/уровень/сегодня
 * общий день) из батча профилей друзей + своих активных дней +
 * серверных `friend_pairs`, кэширует снапшот в AsyncStorage для мгновенного первого
 * кадра, обновляет только по явному вызову (открытие вкладки Друзья) —
 * НИКАКИХ листенеров и таймеров (Firebase-экономия и локальный-first контракт).
 *
 * Источник: docs/plans/2026-08-16-friends-together-implementation.ru.md §4, §6.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getLocalDayKey } from '../local_date';
import { getCanonicalUserId } from '../user_id_policy';
import type { FriendProfileBatchRecord } from '../friends_profiles_batch';
import { getFriendsTogetherConfig } from './together_config';
import {
  daysTogether,
  decodeActiveDays,
  hasCommonDay,
  levelForDays,
  type ActiveDays,
} from './together_days';
import { computePairStreak, type PairStreakView } from './pair_streak';
import { isPlusProfile } from '../../components/plus/plus_ring_spec';
import { DebugLogger } from '../debug-logger';
import { noteSwallowedHandler, noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const SNAPSHOT_KEY = 'friends_together_snapshot_v1';
const PAIRS_CACHE_KEY = 'friends_together_pairs_cache_v1';
const PAIRS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // владелец: чужие цифры не чаще раза в 6ч
const PAIRS_CACHE_SCHEMA_VERSION = 2;

function scopedKey(base: string, uid: string): string {
  return `${base}::${uid}`;
}

export type FriendPairServerState = Readonly<{
  friendUid: string;
  /** Реферальный бонус дней, начисленный сервером (friend_pairs.bonusDays). */
  bonusDays: number;
}>;

export type FriendTogetherPairState = Readonly<{
  friendUid: string;
  days: number;
  level: number;
  todayCommon: boolean;
  /** Серия вдвоём (идея 1, владелец 21.10). Нет в старых снапшотах — до первого обновления вкладки. */
  pair?: PairStreakView;
  /**
   * Дни друга из последнего friendsGetProfiles — чтобы Главная и финал занятия пересчитали огонь после МОЕГО занятия
   * без нового запроса (recomputePairWithMyDays). Только { anchor, bits } — те же данные, что уже пришли в профиле.
   */
  friendActiveDays?: ActiveDays | null;
  /**
   * Имя, ранг монеты и Plus друга из того же профиля — Главная («Серия вдвоём · Лидия») и финал занятия рисуют строку
   * без сети и без кэша профилей (тот живёт только в памяти вкладки). Те же данные, что вкладка «Друзья» уже показывает.
   */
  name?: string;
  coinRank?: number | null;
  isPlus?: boolean;
}>;

export type FriendsTogetherSnapshot = Readonly<{
  updatedAtMs: number;
  myDayKey: string;
  pairs: Record<string, FriendTogetherPairState>;
}>;

type PairsCachePayload = Readonly<{
  schemaVersion: typeof PAIRS_CACHE_SCHEMA_VERSION;
  fetchedAtMs: number;
  pairs: Record<string, { bonusDays: number }>;
}>;

// зачем (PM-170, D78/D148): награды за уровни дружбы (звёзды, «забранный уровень», процентный бонус) удалены
// целиком — остались только дни вместе, уровень и «сегодня общий день». Старые кэши с лишними полями читаются без ошибок.

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
    if (
      !isRecord(parsed)
      || parsed.schemaVersion !== PAIRS_CACHE_SCHEMA_VERSION
      || typeof parsed.fetchedAtMs !== 'number'
      || !isRecord(parsed.pairs)
    ) return null;
    const pairs: PairsCachePayload['pairs'] = {};
    for (const [uid, v] of Object.entries(parsed.pairs)) {
      if (!isRecord(v)) continue;
      pairs[uid] = {
        bonusDays: Number.isFinite(v.bonusDays) ? Math.max(0, Math.floor(Number(v.bonusDays))) : 0,
      };
    }
    return { schemaVersion: PAIRS_CACHE_SCHEMA_VERSION, fetchedAtMs: parsed.fetchedAtMs, pairs };
  } catch {
    return null;
  }
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
    out[uid] = { friendUid: uid, bonusDays: 0 };
  }
  if (uniqueUids.length === 0) return out;

  const myUid = await getCanonicalUserId();
  if (!myUid) return out;
  const pairsCacheKey = scopedKey(PAIRS_CACHE_KEY, myUid);
  const now = Date.now();
  const cachedRaw = await AsyncStorage.getItem(pairsCacheKey).catch(noteSwallowedAs('together_store:promise_1', null));
  const cached = parsePairsCache(cachedRaw);
  const cacheIsFresh = !!cached && now - cached.fetchedAtMs < PAIRS_CACHE_TTL_MS;

  if (cached) {
    for (const uid of uniqueUids) {
      const hit = cached.pairs[uid];
      if (hit) {
        out[uid] = {
          friendUid: uid,
          bonusDays: hit.bonusDays,
        };
      }
    }
  }
  if (!options.force && cacheIsFresh) return out;

  const db = getFirestore();
  if (!db) return out; // офлайн/Expo Go: отдаём кэш как есть

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
      const bonusDays = Number.isFinite(data.bonusDays) ? Math.max(0, Math.floor(Number(data.bonusDays))) : 0;
      fetchedPairs[otherUid] = { bonusDays };
      if (uniqueUids.includes(otherUid)) {
        out[otherUid] = { friendUid: otherUid, bonusDays };
      }
    });
    await AsyncStorage.setItem(pairsCacheKey, JSON.stringify({
      schemaVersion: PAIRS_CACHE_SCHEMA_VERSION,
      fetchedAtMs: now,
      pairs: fetchedPairs,
    })).catch(noteSwallowedHandler('together_store:promise_2'));
  } catch (e) {
      // сеть недоступна — кэш уже применён выше, молча остаёмся на нём
      DebugLogger.error('together_store:load_pairs', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  return out;
}

/** Синхронное чтение снапшота из памяти после prime/refresh — для мгновенного первого кадра. */
let _memorySnapshot: FriendsTogetherSnapshot | null = null;
let _memorySnapshotUid: string | null = null;

export function getFriendsTogetherSnapshot(): FriendsTogetherSnapshot | null {
  return _memorySnapshot;
}

/** Прогреть снапшот из AsyncStorage (вызывать рядом со стартовым прогревом друзей). */
export async function primeFriendsTogetherSnapshot(): Promise<FriendsTogetherSnapshot | null> {
  const myUid = await getCanonicalUserId();
  if (!myUid) return null;
  if (_memorySnapshot && _memorySnapshotUid === myUid) return _memorySnapshot;
  _memorySnapshot = null;
  _memorySnapshotUid = myUid;
  try {
    const raw = await AsyncStorage.getItem(scopedKey(SNAPSHOT_KEY, myUid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.pairs) || typeof parsed.updatedAtMs !== 'number') return null;
    _memorySnapshot = parsed as unknown as FriendsTogetherSnapshot;
    return _memorySnapshot;
  } catch {
    return null;
  }
}

/** Свои дни активности (active_days_v1 на телефоне). Экспорт — для Главной и финала занятия (серия вдвоём). */
export async function readMyActiveDays(): Promise<ActiveDays | null> {
  try {
    const raw = await AsyncStorage.getItem('active_days_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || typeof parsed.anchor !== 'string' || typeof parsed.bits !== 'string') return null;
    return { anchor: parsed.anchor, bits: parsed.bits };
  } catch (e) {
    console.warn(`[FRIENDS-1] свои дни активности не прочитаны → без огня пары: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    return null;
  }
}

/**
 * Огонь пары заново — по свежим СВОИМ дням и сохранённым дням друга из снапшота (без сети).
 * зачем: после занятия Главная и финал показывают «Серия вдвоём · 13», хотя профиль друга обновлялся раньше.
 */
export function recomputePairWithMyDays(
  pair: FriendTogetherPairState,
  myActiveDays: ActiveDays | null,
  todayKey: string = getLocalDayKey(),
): PairStreakView | null {
  if (pair.friendActiveDays === undefined) return pair.pair ?? null;
  return computePairStreak(myActiveDays, pair.friendActiveDays, todayKey);
}

/**
 * Пересчитать состояние пар из батча профилей друзей (см. friends_profiles_batch.ts)
 * + серверных friend_pairs. Пишет снапшот в AsyncStorage.
 * НЕ вызывает сеть сама по себе кроме loadFriendPairsServerState (кэш 6ч).
 */
export async function refreshFriendsTogether(
  profiles: readonly FriendProfileBatchRecord[],
  options: { forcePairsRefresh?: boolean } = {},
): Promise<FriendsTogetherSnapshot> {
  const myUid = await getCanonicalUserId();
  const myActiveDays = await readMyActiveDays();
  const myDayKey = getLocalDayKey();
  const friendUids = profiles.map((p) => p.uid).filter(Boolean);
  const pairsServerState = await loadFriendPairsServerState(friendUids, { force: options.forcePairsRefresh });

  const pairs: Record<string, FriendTogetherPairState> = {};

  for (const profile of profiles) {
    if (!profile.uid) continue;
    const friendActiveDays = profile.activeDays ?? null;
    const server = pairsServerState[profile.uid] ?? { friendUid: profile.uid, bonusDays: 0 };
    const days = daysTogether(myActiveDays, friendActiveDays, server.bonusDays);
    const level = levelForDays(days, getFriendsTogetherConfig().levelThresholds);
    const todayCommon = hasCommonDay(myActiveDays, friendActiveDays, myDayKey);

    pairs[profile.uid] = {
      friendUid: profile.uid,
      days,
      level,
      todayCommon,
      // зачем (идея 1 «Серия вдвоём»): огонь пары считается здесь же, из тех же данных, и уходит в снапшот — первый кадр без расчёта
      pair: computePairStreak(myActiveDays, friendActiveDays, myDayKey),
      friendActiveDays,
      name: profile.displayName,
      coinRank: profile.coinRank ?? null,
      // зачем (правило Ядра cbdecef56 / 49677b5c4): кольцо Plus — по isPlus + plusUntilMs, как во вкладке; вводный доступ не считается
      isPlus: isPlusProfile(profile),
    };
  }

  const snapshot: FriendsTogetherSnapshot = { updatedAtMs: Date.now(), myDayKey, pairs };
  _memorySnapshot = snapshot;
  _memorySnapshotUid = myUid;

  if (myUid) {
    await AsyncStorage.setItem(scopedKey(SNAPSHOT_KEY, myUid), JSON.stringify(snapshot)).catch(noteSwallowedHandler('together_store:promise_3'));
  }

  return snapshot;
}

/** Экспорт для tests/UI: раскодировать чьи-то active_days в набор дат (реэкспорт удобства). */
export { decodeActiveDays };

/* expo-router route shim */
export default function __RouteShim() { return null; }

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const COL = 'arena_hill_thrones';
const FUNCTIONS_REGION = 'us-central1';
const THRONE_POLL_MS = 15 * 60 * 1000;
const ARENA_HILL_TOP_CACHE_KEY = 'arena_hill_daily_top_cache_v1';
const ARENA_HILL_TOP_CACHE_TTL_MS = 30 * 60 * 1000;

export type ArenaHillThrone = {
  id: string;
  dayKey: string;
  championUid: string;
  championName: string;
  score: number;
  heldSince: number;
  updatedAt: number;
  attempts: number;
  previousChampionUid?: string;
  previousChampionName?: string;
  previousScore?: number;
};

export type ArenaHillAttemptResult = {
  dayKey: string;
  isNewChampion: boolean;
  myWins?: number;
  throne: ArenaHillThrone | null;
  previousChampionName?: string;
  previousScore?: number;
  duplicate?: boolean;
};

export type ArenaHillTopEntry = {
  place: number;
  uid: string;
  name: string;
  wins: number;
  totalXp: number;
  avatar?: string;
  frame?: string;
  aura?: string;
  isPremium?: boolean;
  isVip?: boolean;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
};

export type ArenaHillDailyTopResult = {
  dayKey: string;
  rewardShards: number;
  entries: ArenaHillTopEntry[];
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function arenaHillDayKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function cleanName(name: string | null | undefined): string {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim();
  return (s || 'Phraseman').slice(0, 80);
}

function getDb(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

export async function getTodayArenaHillThrone(): Promise<ArenaHillThrone | null> {
  const db = getDb();
  if (!db) return null;
  const dayKey = arenaHillDayKey();
  const snap = await db.collection(COL).doc(dayKey).get();
  if (!snap.exists) return null;
  return { ...(snap.data() as ArenaHillThrone), id: snap.id };
}

export function subscribeTodayArenaHillThrone(cb: (throne: ArenaHillThrone | null) => void): () => void {
  const db = getDb();
  if (!db) {
    cb(null);
    return () => {};
  }
  const dayKey = arenaHillDayKey();
  let active = true;
  const readThrone = async () => {
    try {
      const snap = await db.collection(COL).doc(dayKey).get();
      if (active) cb(snap.exists ? { ...(snap.data() as ArenaHillThrone), id: snap.id } : null);
    } catch {
      if (active) cb(null);
    }
  };
  void readThrone();
  const id = setInterval(readThrone, THRONE_POLL_MS);
  return () => {
    active = false;
    clearInterval(id);
  };
}

function callable<TReq, TRes>(name: string) {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('firebase_unavailable');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

export async function recordArenaHillAttempt(params: {
  sessionId?: string;
  userId: string;
  userName: string;
  isWin: boolean;
}): Promise<ArenaHillAttemptResult> {
  const fn = callable<{
    sessionId?: string;
    userName: string;
    isWin: boolean;
  }, ArenaHillAttemptResult>('arenaHillRecordAttempt');
  const { data } = await fn({
    sessionId: params.sessionId,
    userName: cleanName(params.userName),
    isWin: params.isWin,
  });
  return data;
}

// In-memory кэш последнего ответа «Трон дня», чтобы при повторном открытии
// показывать результат МГНОВЕННО (как peekLastKnownShardsBalance для осколков),
// а сеть лишь обновляет в фоне. Валиден только в пределах текущего dayKey.
let lastArenaHillTopCache: ArenaHillDailyTopResult | null = null;

function normalizeDailyTop(raw: Partial<ArenaHillDailyTopResult> | null | undefined): ArenaHillDailyTopResult {
  return {
    dayKey: String(raw?.dayKey ?? arenaHillDayKey()),
    rewardShards: Math.max(0, Math.trunc(Number(raw?.rewardShards) || 0)),
    entries: Array.isArray(raw?.entries) ? raw.entries.slice(0, 1) : [],
  };
}

async function readStoredArenaHillTopCache(now = Date.now()): Promise<ArenaHillDailyTopResult | null> {
  try {
    const raw = await AsyncStorage.getItem(ARENA_HILL_TOP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; data?: Partial<ArenaHillDailyTopResult> };
    if (!parsed?.data) return null;
    const result = normalizeDailyTop(parsed.data);
    if (result.dayKey !== arenaHillDayKey()) return null;
    if (now - Number(parsed.ts ?? 0) > ARENA_HILL_TOP_CACHE_TTL_MS) return null;
    lastArenaHillTopCache = result;
    return result;
  } catch {
    return null;
  }
}

async function writeStoredArenaHillTopCache(result: ArenaHillDailyTopResult): Promise<void> {
  try {
    await AsyncStorage.setItem(ARENA_HILL_TOP_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
  } catch {
    // Best-effort cache only.
  }
}

/** Мгновенно отдать закэшированный «Трон дня», если он за сегодняшний день. */
export function peekLastKnownArenaHillTop(): ArenaHillDailyTopResult | null {
  if (lastArenaHillTopCache && lastArenaHillTopCache.dayKey === arenaHillDayKey()) {
    return lastArenaHillTopCache;
  }
  return null;
}

export async function getTodayArenaHillTop(): Promise<ArenaHillDailyTopResult> {
  const cached = lastArenaHillTopCache?.dayKey === arenaHillDayKey()
    ? lastArenaHillTopCache
    : await readStoredArenaHillTopCache();
  if (cached) return cached;

  const fn = callable<Record<string, never>, ArenaHillDailyTopResult>('arenaHillGetDailyTop');
  const { data } = await fn({});
  const result = normalizeDailyTop(data);
  lastArenaHillTopCache = result;
  void writeStoredArenaHillTopCache(result);
  return result;
}

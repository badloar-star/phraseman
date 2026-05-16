import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const COL = 'arena_hill_thrones';
const FUNCTIONS_REGION = 'us-central1';

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
  return db.collection(COL).doc(dayKey).onSnapshot(
    (snap: any) => cb(snap.exists ? { ...(snap.data() as ArenaHillThrone), id: snap.id } : null),
    () => cb(null),
  );
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

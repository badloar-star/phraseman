import { ensureAnonUser } from '../cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getWeekId } from '../league_engine';

export type ArenaClubWarContributionResult = {
  ok: boolean;
  duplicate?: boolean;
  weekId?: string;
  groupId?: string;
  leagueId?: number;
  addedPoints?: number;
  totalPoints?: number;
};

function safeDocId(s: string): string {
  return String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120) || 'x';
}

const FUNCTIONS_REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('firebase_unavailable');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
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

export async function recordArenaClubWarContribution(params: {
  sessionId: string;
  arenaUid: string;
  userName: string;
  score: number;
  won: boolean;
  correctAnswers?: number;
  totalQuestions?: number;
}): Promise<ArenaClubWarContributionResult> {
  const stableUid = await ensureAnonUser().catch(() => '');
  if (!stableUid || !params.arenaUid || !params.sessionId) return { ok: false };
  try {
    const fn = callable<{ sessionId: string }, ArenaClubWarContributionResult>('arenaClubWarContribute');
    const { data } = await fn({ sessionId: params.sessionId });
    return data;
  } catch {
    return { ok: false };
  }
}

export function subscribeMyArenaClubWarEvent(
  stableUid: string,
  cb: (event: any | null) => void,
): () => void {
  const db = getDb();
  const weekId = getWeekId();
  if (!db || !stableUid) {
    cb(null);
    return () => {};
  }
  let innerUnsub: (() => void) | null = null;
  const outerUnsub = db.collection('leaderboard').doc(stableUid).onSnapshot(
    (lbSnap: any) => {
      innerUnsub?.();
      innerUnsub = null;
      const lb = lbSnap.data() ?? {};
      const groupId = String(lb.groupId ?? '').trim();
      const groupWeekId = String(lb.groupWeekId ?? lb.weekId ?? '').trim();
      if (!groupId || groupWeekId !== weekId) {
        cb(null);
        return;
      }
      const eventId = `${weekId}_${safeDocId(groupId)}`;
      innerUnsub = db.collection('arena_club_events').doc(eventId).onSnapshot(
        (snap: any) => cb(snap.exists ? { id: snap.id, ...snap.data() } : null),
        () => cb(null),
      );
    },
    () => cb(null),
  );
  return () => {
    innerUnsub?.();
    outerUnsub();
  };
}

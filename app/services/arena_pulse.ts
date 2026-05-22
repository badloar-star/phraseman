import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';

const COL = 'arena_pulse_events';
const FUNCTIONS_REGION = 'us-central1';

export type ArenaPulseKind = 'ghost' | 'hill' | 'league' | 'club' | 'room';

export type ArenaPulseEvent = {
  id: string;
  kind: ArenaPulseKind;
  title: string;
  subtitle?: string;
  actorName?: string;
  score?: number;
  points?: number;
  code?: string;
  createdAt: number;
};

function cleanText(s: string | null | undefined, defaultValue = ''): string {
  return String(s ?? defaultValue).replace(/\s+/g, ' ').trim().slice(0, 120);
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

function callable<TReq, TRes>(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
}

export async function publishArenaPulseEvent(params: {
  kind: ArenaPulseKind;
  title: string;
  subtitle?: string;
  actorName?: string;
  score?: number;
  points?: number;
  code?: string;
}): Promise<void> {
  const db = getDb();
  if (!db) return;
  const fn = callable<Omit<ArenaPulseEvent, 'id' | 'createdAt'>, { ok: boolean; id?: string }>('arenaPulsePublish');
  await fn({
    kind: params.kind,
    title: cleanText(params.title, params.kind),
    ...(params.subtitle ? { subtitle: cleanText(params.subtitle) } : {}),
    ...(params.actorName ? { actorName: cleanText(params.actorName) } : {}),
    ...(typeof params.score === 'number' ? { score: Math.max(0, Math.floor(params.score)) } : {}),
    ...(typeof params.points === 'number' ? { points: Math.max(0, Math.floor(params.points)) } : {}),
    ...(params.code ? { code: cleanText(params.code).toUpperCase() } : {}),
  });
}

const VISIBLE_PULSE_KINDS: ArenaPulseKind[] = ['ghost', 'hill', 'league', 'club'];

export function subscribeArenaPulseEvents(cb: (events: ArenaPulseEvent[]) => void): () => void {
  const db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  return db.collection(COL)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(
      (snap: any) => cb(
        snap.docs
          .map((d: any) => ({ id: d.id, ...(d.data() as Omit<ArenaPulseEvent, 'id'>) }))
          .filter((e: ArenaPulseEvent) => VISIBLE_PULSE_KINDS.includes(e.kind))
          .slice(0, 8),
      ),
      () => cb([]),
    );
}

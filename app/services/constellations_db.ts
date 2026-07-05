// ════════════════════════════════════════════════════════════════════════════
// services/constellations_db.ts — клиентский доступ «Созвездий» (спек F/H3).
//
// Коллекции (пишет только сервер, см. functions/src/constellations/):
//   constellation_queue/{userId}        — очередь (свою запись клиент пишет сам)
//   constellation_matches/{matchId}     — матч, onSnapshot
//   constellation_players/{matchId_uid} — приватный док игрока, onSnapshot
//   app_meta/constellation_searching    — live-счётчик «в поиске»
//
// ХОДЫ — ТОЛЬКО через callable constellationSubmitAction (никаких прямых
// записей в матч/плеер-доки). actionId делает ретраи идемпотентными.
// Паттерны файла — как services/arena_db.ts (lazy firestore, col-аксессоры).
// ════════════════════════════════════════════════════════════════════════════

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type {
  ConstellationAnswerResult,
  ConstellationMatch,
  ConstellationPlayerPrivate,
  ConstellationQueueEntry,
  ConstellationResult,
} from '../types/constellations';

const FUNCTIONS_REGION = 'us-central1';

function getFirestoreModule(): any | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default;
  } catch {
    return null;
  }
}

function getDb(): any | null {
  const firestore = getFirestoreModule();
  if (!firestore) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
}

function requireDb(): any {
  const db = getDb();
  if (!db) throw new Error('firebase_unavailable');
  return db;
}

const col = {
  queue: () => requireDb().collection('constellation_queue'),
  matches: () => requireDb().collection('constellation_matches'),
  players: () => requireDb().collection('constellation_players'),
  searchingMeta: () => requireDb().doc('app_meta/constellation_searching'),
};

// ── Очередь ─────────────────────────────────────────────────────────────────

export async function joinConstellationQueue(entry: ConstellationQueueEntry): Promise<void> {
  const uid = entry.userId?.trim();
  if (!uid) throw new Error('joinConstellationQueue: empty userId');
  const doc: ConstellationQueueEntry = {
    ...entry,
    userId: uid,
    joinedAt: Date.now(),
    matchId: null,
  };
  await col.queue().doc(uid).set(doc);
}

export async function leaveConstellationQueue(userId: string): Promise<void> {
  const uid = userId?.trim();
  if (!uid) return;
  try {
    await col.queue().doc(uid).delete();
  } catch {
    // выход из очереди не критичен — cron подчистит протухшую запись
  }
}

/** Подписка на свою запись очереди: появление matchId = «матч найден». */
export function subscribeConstellationQueueEntry(
  userId: string,
  onChange: (entry: ConstellationQueueEntry | null) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  return db.collection('constellation_queue').doc(userId).onSnapshot(
    (snap: any) => onChange(snap?.exists ? (snap.data() as ConstellationQueueEntry) : null),
    () => onChange(null),
  );
}

/** Live «в поиске сейчас N» на экране поиска (пишет cron, F2). */
export function subscribeConstellationSearchingCount(
  onChange: (count: number) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  return db.doc('app_meta/constellation_searching').onSnapshot(
    (snap: any) => {
      const n = snap?.data()?.searchingCount;
      onChange(typeof n === 'number' && Number.isFinite(n) ? n : 0);
    },
    () => onChange(0),
  );
}

// ── Матч ────────────────────────────────────────────────────────────────────

export function subscribeConstellationMatch(
  matchId: string,
  onChange: (match: ConstellationMatch | null) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  return db.collection('constellation_matches').doc(matchId).onSnapshot(
    (snap: any) => onChange(snap?.exists ? ({ ...(snap.data() as ConstellationMatch), id: snap.id }) : null),
    () => onChange(null),
  );
}

export function subscribeMyConstellationPlayer(
  matchId: string,
  userId: string,
  onChange: (doc: ConstellationPlayerPrivate | null) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  return db.collection('constellation_players').doc(`${matchId}_${userId}`).onSnapshot(
    (snap: any) => onChange(snap?.exists ? (snap.data() as ConstellationPlayerPrivate) : null),
    () => onChange(null),
  );
}

/** Результат матча с начисленными наградами (constellation_results, E1–E4/F5). */
export function subscribeConstellationResult(
  matchId: string,
  onChange: (result: ConstellationResult | null) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  return db.collection('constellation_results').doc(matchId).onSnapshot(
    (snap: any) => onChange(snap?.exists ? (snap.data() as ConstellationResult) : null),
    () => onChange(null),
  );
}

/** Активный матч игрока (возврат после убийства приложения, F7/A10). */
export async function findMyActiveConstellationMatch(
  userId: string,
): Promise<ConstellationMatch | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await db.collection('constellation_matches')
      .where('playerIds', 'array-contains', userId)
      .where('stage', '==', 'active')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...(doc.data() as ConstellationMatch), id: doc.id };
  } catch {
    return null;
  }
}

// ── Ходы: callable constellationSubmitAction ────────────────────────────────

type SubmitType = 'choose_target' | 'use_shield' | 'answer' | 'emote' | 'tick';

interface SubmitPayload {
  matchId: string;
  stableId: string;
  type: SubmitType;
  target?: string | null;
  starKey?: string;
  qIndex?: number;
  answerIndex?: number;
  emoteId?: string;
}

let actionCounter = 0;

/** Уникальный id действия: ретрай того же действия НЕ применится дважды (D6). */
function nextActionId(type: SubmitType): string {
  actionCounter += 1;
  return `${type}_${Date.now()}_${actionCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCallable(): ((data: Record<string, unknown>) => Promise<{ data: unknown }>) | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'constellationSubmitAction');
  } catch {
    return null;
  }
}

async function submit(payload: SubmitPayload, actionId?: string): Promise<ConstellationAnswerResult> {
  const callable = getCallable();
  if (!callable) throw new Error('firebase_unavailable');
  const res = await callable({ ...payload, actionId: actionId ?? nextActionId(payload.type) });
  return (res?.data ?? { ok: false }) as ConstellationAnswerResult;
}

export async function submitChooseTarget(
  matchId: string,
  stableId: string,
  target: string | null,
): Promise<ConstellationAnswerResult> {
  return submit({ matchId, stableId, type: 'choose_target', target });
}

export async function submitUseShield(
  matchId: string,
  stableId: string,
  starKey: string,
): Promise<ConstellationAnswerResult> {
  return submit({ matchId, stableId, type: 'use_shield', starKey });
}

/**
 * Ответ на вопрос. actionId стабилен между ретраями ОДНОГО ответа: оффлайн-тост
 * с ретраем (edge «оффлайн в момент сабмита») не задвоит сабмит.
 */
export async function submitAnswer(
  matchId: string,
  stableId: string,
  qIndex: number,
  answerIndex: number,
  retryActionId?: string,
): Promise<ConstellationAnswerResult & { actionId: string }> {
  const actionId = retryActionId ?? nextActionId('answer');
  const res = await submit({ matchId, stableId, type: 'answer', qIndex, answerIndex }, actionId);
  return { ...res, actionId };
}

export async function submitEmote(
  matchId: string,
  stableId: string,
  emoteId: string,
): Promise<ConstellationAnswerResult> {
  return submit({ matchId, stableId, type: 'emote', emoteId });
}

/**
 * Клиент увидел, что дедлайн фазы истёк → просит сервер форсировать переход
 * (резолв раунда / переход к ответам). Так игрок не ждёт минутный watchdog-cron
 * при «зависшей» фазе (одинокий игрок против ботов). Сервер проверяет дедлайн
 * сам — читер не ускорит раунд. actionId по раунду+фазе делает вызов идемпотентным.
 */
export async function submitPhaseTick(
  matchId: string,
  stableId: string,
  round: number,
  phase: string,
): Promise<ConstellationAnswerResult> {
  return submit(
    { matchId, stableId, type: 'tick' },
    `tick_${round}_${phase}`,
  );
}

import * as admin from 'firebase-admin';
import type { DuelSession } from './types';

const db = admin.firestore();

/** Нормальный матч короче; после этого порога считаем сессию брошенной. */
const STALE_ACTIVE_SESSION_MS = 2 * 60 * 60 * 1000;
/**
 * Запас на acceptance, если expireStaleAcceptanceSessions не отработал (битый дедлайн и т.п.).
 */
const STALE_ACCEPTANCE_FALLBACK_MS = 30 * 60 * 1000;

const ACTIVE_IN_PROGRESS_STATES = ['get_ready', 'countdown', 'question', 'reveal'] as const;

function toMillis(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as FirebaseFirestore.Timestamp).toMillis();
  }
  return 0;
}

/**
 * Завершает «вечные» arena_sessions без начисления наград (state → aborted, не finished).
 * onArenaSessionFinished не срабатывает.
 */
export async function cleanupStaleArenaSessions(): Promise<number> {
  const now = Date.now();
  let nAborted = 0;

  try {
    const snap = await db
      .collection('arena_sessions')
      .where('state', 'in', [...ACTIVE_IN_PROGRESS_STATES])
      .limit(150)
      .get();

    for (const doc of snap.docs) {
      const s = doc.data() as DuelSession;
      const created = toMillis(s.createdAt);
      if (!created || now - created <= STALE_ACTIVE_SESSION_MS) continue;
      try {
        await doc.ref.update({
          state: 'aborted',
          abortReason: 'stale_cleanup',
          abortedAt: now,
        });
        nAborted += 1;
      } catch (e) {
        console.error('cleanupStaleArenaSessions: update failed', doc.id, e);
      }
    }
  } catch (e) {
    console.error('cleanupStaleArenaSessions: in-query failed', e);
  }

  try {
    const accSnap = await db
      .collection('arena_sessions')
      .where('state', '==', 'acceptance')
      .limit(80)
      .get();

    for (const doc of accSnap.docs) {
      const s = doc.data() as DuelSession;
      const created = toMillis(s.createdAt);
      if (!created || now - created <= STALE_ACCEPTANCE_FALLBACK_MS) continue;
      try {
        await doc.ref.update({
          state: 'aborted',
          abortReason: 'stale_cleanup',
          abortedAt: now,
        });
        nAborted += 1;
      } catch (e) {
        console.error('cleanupStaleArenaSessions: acceptance update failed', doc.id, e);
      }
    }
  } catch (e) {
    console.error('cleanupStaleArenaSessions: acceptance query failed', e);
  }

  return nAborted;
}

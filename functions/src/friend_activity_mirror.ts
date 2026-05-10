/**
 * Дублирует «ленту для друзей» при любых правках users/{uid}.progress в Firestore:
 * админка, синк приложения, скрипты — всё даёт те же события, что клиент пишет в my_events.
 *
 * Формула уровня должна совпадать с constants/theme.ts (getLevelFromXP).
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

const REGION = 'us-central1';
const MAX_EVENTS_PER_FRIEND = 15;

const XP_BASE = 250;
const XP_EXP_INV = 1 / 1.82;
const MAX_LEVEL = 50;

function getLevelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  return Math.min(MAX_LEVEL, Math.floor(Math.pow(totalXP / XP_BASE, XP_EXP_INV)) + 1);
}

function parseProgressInt(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  const n = parseInt(String(v ?? '0'), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function pruneOldEvents(db: FirebaseFirestore.Firestore, userId: string): Promise<void> {
  const col = db.collection('users').doc(userId).collection('my_events');
  const snap = await col.orderBy('ts', 'desc').get();
  const docs = snap.docs;
  if (docs.length <= MAX_EVENTS_PER_FRIEND) return;
  const tail = docs.slice(MAX_EVENTS_PER_FRIEND);
  await Promise.all(tail.map((d) => d.ref.delete()));
}

function friendActivityDocId(type: string, payload: Record<string, string | number>): string {
  if (type === 'level_up') {
    const lv = Number(payload.level);
    if (Number.isFinite(lv)) return `level_up_${Math.trunc(lv)}`;
  }
  if (type === 'streak_milestone') {
    const d = Number(payload.days);
    if (Number.isFinite(d)) return `streak_milestone_${Math.trunc(d)}`;
  }
  const ts = Date.now();
  return `${type}_${ts}_${Math.random().toString(36).slice(2, 8)}`;
}

async function appendFriendEvent(
  db: FirebaseFirestore.Firestore,
  userId: string,
  type: string,
  payload: Record<string, string | number>,
): Promise<void> {
  const ts = Date.now();
  const eventId = friendActivityDocId(type, payload);
  await db
    .collection('users')
    .doc(userId)
    .collection('my_events')
    .doc(eventId)
    .set({ type, payload, ts, uid: userId });
  await pruneOldEvents(db, userId);
}

/** Порог для streak_milestone — как «заметная серия», без спама на 1–2 дня. */
const STREAK_FEED_MIN_DAYS = 7;

export const mirrorFriendActivityOnUserWrite = functions.firestore.onDocumentWritten(
  { document: 'users/{userId}', region: REGION },
  async (event) => {
    const userId = event.params.userId as string;
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;

    const beforeProg = event.data?.before.exists
      ? (event.data.before.data()?.progress as Record<string, unknown> | undefined)
      : undefined;
    const afterProg = afterSnap.data()?.progress as Record<string, unknown> | undefined;

    const oldXp = parseProgressInt(beforeProg?.user_total_xp);
    const newXp = parseProgressInt(afterProg?.user_total_xp);
    const oldStreak = parseProgressInt(beforeProg?.streak_count);
    const newStreak = parseProgressInt(afterProg?.streak_count);

    if (oldXp === newXp && oldStreak === newStreak) return;

    const db = admin.firestore();

    if (newXp !== oldXp) {
      const oldLvl = getLevelFromXP(oldXp);
      const newLvl = getLevelFromXP(newXp);
      if (newLvl > oldLvl) {
        await appendFriendEvent(db, userId, 'level_up', { level: newLvl });
      }
    }

    if (newStreak > oldStreak && newStreak >= STREAK_FEED_MIN_DAYS) {
      await appendFriendEvent(db, userId, 'streak_milestone', { days: newStreak });
    }
  },
);

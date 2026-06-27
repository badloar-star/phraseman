/**
 * Дублирует «ленту для друзей» при любых правках users/{uid}.progress в Firestore:
 * админка, синк приложения, скрипты — всё даёт те же события, что клиент пишет в my_events.
 *
 * Формула уровня должна совпадать с constants/theme.ts (getLevelFromXP).
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { getLevelFromXP } from './xp_levels';

const REGION = 'us-central1';
const MAX_EVENTS_PER_FRIEND = 15;
const USERS_PAGE_SIZE = 500;
const MIRROR_FIELD = 'friendActivityMirror';

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

function readMirrorState(data: Record<string, unknown>): { xp: number; streak: number } | null {
  const raw = data[MIRROR_FIELD];
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  return {
    xp: parseProgressInt(rec.xp),
    streak: parseProgressInt(rec.streak),
  };
}

function queueMirrorStateUpdate(
  batch: FirebaseFirestore.WriteBatch,
  ref: FirebaseFirestore.DocumentReference,
  xp: number,
  streak: number,
  now: number,
): void {
  batch.set(ref, {
    [MIRROR_FIELD]: {
      xp,
      streak,
      checkedAt: now,
    },
  }, { merge: true });
}

export async function syncFriendActivityMirrorBatch(): Promise<{ scanned: number; updated: number; events: number }> {
  const db = admin.firestore();
  const now = Date.now();
  let scanned = 0;
  let updated = 0;
  let events = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let batch = db.batch();
  let pendingWrites = 0;

  while (true) {
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('__name__').limit(USERS_PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      scanned += 1;
      const data = doc.data() || {};
      const progress = data.progress as Record<string, unknown> | undefined;
      const newXp = parseProgressInt(progress?.user_total_xp);
      const newStreak = parseProgressInt(progress?.streak_count);
      const state = readMirrorState(data);

      if (!state) {
        queueMirrorStateUpdate(batch, doc.ref, newXp, newStreak, now);
        pendingWrites += 1;
      } else if (state.xp !== newXp || state.streak !== newStreak) {
        if (newXp !== state.xp) {
          const oldLvl = getLevelFromXP(state.xp);
          const newLvl = getLevelFromXP(newXp);
          if (newLvl > oldLvl) {
            await appendFriendEvent(db, doc.id, 'level_up', { level: newLvl });
            events += 1;
          }
        }

        if (newStreak > state.streak && newStreak >= STREAK_FEED_MIN_DAYS) {
          await appendFriendEvent(db, doc.id, 'streak_milestone', { days: newStreak });
          events += 1;
        }

        queueMirrorStateUpdate(batch, doc.ref, newXp, newStreak, now);
        pendingWrites += 1;
        updated += 1;
      }

      if (pendingWrites >= 400) {
        await batch.commit();
        batch = db.batch();
        pendingWrites = 0;
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < USERS_PAGE_SIZE) break;
  }

  if (pendingWrites > 0) await batch.commit();

  console.log(JSON.stringify({ event: 'friend_activity_mirror_sync_done', scanned, updated, events }));
  return { scanned, updated, events };
}

// memory: 1GiB + timeout 540s — полный постраничный скан users/ каждые 12ч с появлением
// событий ленты друзей. На дефолтных 256MiB падал OOM (лента активности переставала
// обновляться). На росте базы дополнительно нужен стриминг, но память — первый барьер.
export const syncFriendActivityMirrorCron = functions.scheduler.onSchedule(
  { schedule: 'every 12 hours', timeZone: 'UTC', region: REGION, memory: '1GiB', timeoutSeconds: 540 },
  async () => {
    await syncFriendActivityMirrorBatch();
  },
);

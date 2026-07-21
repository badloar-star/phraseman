/**
 * Разовый backfill ленты активности друзей (дополняет feed_fanout.ts, который
 * покрывает только НОВЫЕ события).
 *
 * Что делает: постранично обходит users/ (500/стр, startAfter по doc id), для каждого
 * юзера берёт последние EVENTS_PER_USER=50 записей my_events и копирует их в
 * users/{friendUid}/feed/{eventId} для всех друзей (users/{uid}/friends, до 500).
 * expiresAt = now + 30д (как в feed_fanout.ts). Идемпотентно: docId в feed = eventId,
 * set(merge) безопасен при повторном прогоне.
 *
 * Запуск (из корня реального проекта functions/ после `npm run build` или через tsx):
 *   # Application Default Credentials: export GOOGLE_APPLICATION_CREDENTIALS=...
 *   node feed_backfill.js            # боевой прогон
 *   node feed_backfill.js --dry      # только подсчёт объёмов, без записей
 *   node feed_backfill.js --resume   # продолжить с feed_backfill.state.json
 *
 * Resume: после каждой страницы пишет feed_backfill.state.json {lastUserId} —
 * при падении прогон продолжается с последней страницы (--resume; без флага
 * state-файл игнорируется и перезаписывается).
 *
 * Оценка нагрузки (см. PATCHES.md): чтения ≈ users + friends + my_events на юзера;
 * записи ≈ Σ events × friends. На 10k юзеров × 3 друга × 20 событий ≈ 600k записей —
 * гонять в непиковые часы, при желании притормозить SLEEP_BETWEEN_PAGES_MS.
 */
import * as admin from 'firebase-admin';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Параметры ─────────────────────────────────────────────────────────────────
const USERS_PAGE_SIZE = 500;
const EVENTS_PER_USER = 50;
const MAX_FRIENDS = 500; // как MAX_FANOUT_FRIENDS в feed_fanout.ts
const BATCH_LIMIT = 450;
const FEED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PROGRESS_EVERY_USERS = 100;
const SLEEP_BETWEEN_PAGES_MS = 0; // throttle при необходимости
const STATE_FILE = path.resolve(process.cwd(), 'feed_backfill.state.json');

const DRY_RUN = process.argv.includes('--dry');
const RESUME = process.argv.includes('--resume');

interface BackfillState {
  lastUserId: string | null;
}

interface MyEventDoc {
  type?: unknown;
  ts?: unknown;
  payload?: unknown;
  activityLikeCount?: unknown;
}

function readState(): BackfillState {
  if (!RESUME) return { lastUserId: null };
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as BackfillState;
    return { lastUserId: parsed.lastUserId ?? null };
  } catch {
    return { lastUserId: null };
  }
}

function writeState(state: BackfillState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn('state write failed (не критично):', e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Counters {
  users: number;
  events: number;
  fanoutWrites: number;
  skippedNoFriends: number;
  batches: number;
}

async function backfillUser(
  db: admin.firestore.Firestore,
  uid: string,
  counters: Counters,
): Promise<void> {
  const eventsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('my_events')
    .orderBy('ts', 'desc')
    .limit(EVENTS_PER_USER)
    .get();
  if (eventsSnap.empty) return;

  const friendsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('friends')
    .limit(MAX_FRIENDS)
    .get();
  if (friendsSnap.empty) {
    counters.skippedNoFriends += 1;
    return;
  }

  const expiresAt = Date.now() + FEED_TTL_MS;
  let batch = db.batch();
  let pending = 0;

  for (const eventDoc of eventsSnap.docs) {
    const d = eventDoc.data() as MyEventDoc;
    if (!d.type || !d.ts) continue;
    counters.events += 1;
    const feedDoc = {
      uid,
      type: d.type,
      ts: Number(d.ts),
      payload: (d.payload as Record<string, string | number> | undefined) ?? {},
      activityLikeCount: Math.max(0, Math.floor(Number(d.activityLikeCount ?? 0) || 0)),
      expiresAt,
    };
    for (const friendDoc of friendsSnap.docs) {
      counters.fanoutWrites += 1;
      if (DRY_RUN) continue;
      const ref = db.collection('users').doc(friendDoc.id).collection('feed').doc(eventDoc.id);
      batch.set(ref, feedDoc, { merge: true });
      pending += 1;
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        counters.batches += 1;
        batch = db.batch();
        pending = 0;
      }
    }
  }
  if (!DRY_RUN && pending > 0) {
    await batch.commit();
    counters.batches += 1;
  }
}

async function main(): Promise<void> {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const state = readState();
  const counters: Counters = { users: 0, events: 0, fanoutWrites: 0, skippedNoFriends: 0, batches: 0 };
  const startedAt = Date.now();

  console.log(
    JSON.stringify({
      event: 'feed_backfill_start',
      dryRun: DRY_RUN,
      resumeFrom: state.lastUserId,
      eventsPerUser: EVENTS_PER_USER,
    }),
  );

  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  // При resume startAfter по сохранённому doc id — дочитываем страницу-якорь.
  if (state.lastUserId) {
    const anchor = await db.collection('users').doc(state.lastUserId).get();
    if (anchor.exists) lastDoc = anchor;
  }

  while (true) {
    let query: admin.firestore.Query = db.collection('users').orderBy('__name__').limit(USERS_PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      await backfillUser(db, doc.id, counters);
      counters.users += 1;
      if (counters.users % PROGRESS_EVERY_USERS === 0) {
        console.log(
          JSON.stringify({
            event: 'feed_backfill_progress',
            ...counters,
            elapsedMs: Date.now() - startedAt,
          }),
        );
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    writeState({ lastUserId: lastDoc ? lastDoc.id : null });
    if (snap.size < USERS_PAGE_SIZE) break;
    if (SLEEP_BETWEEN_PAGES_MS > 0) await sleep(SLEEP_BETWEEN_PAGES_MS);
  }

  console.log(
    JSON.stringify({
      event: 'feed_backfill_done',
      dryRun: DRY_RUN,
      ...counters,
      elapsedMs: Date.now() - startedAt,
    }),
  );
}

main().catch((e) => {
  console.error('feed_backfill_failed', e);
  process.exit(1);
});

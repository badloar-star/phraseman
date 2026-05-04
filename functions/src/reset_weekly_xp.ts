import * as admin from 'firebase-admin';

/**
 * Returns ISO date (YYYY-MM-DD) of the most recent Monday 00:00 UTC.
 * Mirrors app/weekly_xp.ts:getCurrentWeekStartIso so client and server agree
 * on the boundary. (Cron fires Monday 00:00 UTC → Monday is 'now'.)
 */
function getCurrentWeekStartIso(now: Date = new Date()): string {
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  ));
  const yyyy = monday.getUTCFullYear();
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Resets progress.weekly_xp to 0 for ALL users. Does NOT touch
 * progress.user_total_xp — XP-04 invariant: total xp survives the reset.
 *
 * Pagination: orderBy('__name__'), limit(200), batches of 400 (mirrors
 * functions/src/sync_leaderboard.ts pattern — proven for ~50k users).
 *
 * Side effect: also sets progress.weekly_xp_period_start to the current
 * Monday ISO date so clients see a fresh period without local recompute.
 */
export async function resetWeeklyXp(): Promise<{ updated: number; skipped: number }> {
  const db = admin.firestore();
  const period = getCurrentWeekStartIso();
  const BATCH_SIZE = 400;
  const PAGE_SIZE = 200;
  let batch = db.batch();
  let updated = 0;
  let skipped = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('__name__').limit(PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data || typeof data !== 'object') { skipped++; continue; }
      batch.set(doc.ref, {
        progress: {
          weekly_xp: '0',
          weekly_xp_period_start: period,
        },
      }, { merge: true });
      updated++;
      if (updated % BATCH_SIZE === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  if (updated % BATCH_SIZE !== 0) {
    await batch.commit();
  }

  console.log(`resetWeeklyXp: updated=${updated}, skipped=${skipped}, period=${period}`);
  return { updated, skipped };
}

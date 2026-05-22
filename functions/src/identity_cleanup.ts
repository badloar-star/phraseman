import * as admin from 'firebase-admin';
import { cleanupLegacyAuthIdentityDuplicates } from './auth_identity';

const USERS = 'users';
const CURSOR_DOC = 'app_meta/identity_cleanup_cursor';
const PAGE_SIZE = 300;

type CleanupPageResult = {
  scanned: number;
  processed: number;
  skipped: number;
  leaderboardHidden: number;
  leagueGroupsTouched: number;
  candidatesRecorded: number;
  done: boolean;
};

export async function cleanupLegacyIdentityDuplicatesPage(): Promise<CleanupPageResult> {
  const db = admin.firestore();
  const cursorRef = db.doc(CURSOR_DOC);
  const cursorSnap = await cursorRef.get().catch(() => null);
  const lastUserId = String(cursorSnap?.data()?.lastUserId ?? '').trim();

  let query: FirebaseFirestore.Query = db.collection(USERS).orderBy('__name__').limit(PAGE_SIZE);
  if (lastUserId) {
    const lastSnap = await db.collection(USERS).doc(lastUserId).get().catch(() => null);
    if (lastSnap?.exists) query = query.startAfter(lastSnap);
  }

  const snap = await query.get();
  const result: CleanupPageResult = {
    scanned: snap.size,
    processed: 0,
    skipped: 0,
    leaderboardHidden: 0,
    leagueGroupsTouched: 0,
    candidatesRecorded: 0,
    done: snap.empty,
  };

  for (const doc of snap.docs) {
    const stableId = doc.id;
    const authUid = String(doc.data()?.firebaseAuthUid ?? '').trim();
    if (!authUid || authUid === stableId) {
      result.skipped += 1;
      continue;
    }
    const stats = await cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid, {
      reason: 'identity_cleanup_cron',
      throttleMs: 0,
    });
    if (stats.skipped) {
      result.skipped += 1;
      continue;
    }
    result.processed += 1;
    result.leaderboardHidden += stats.leaderboardHidden;
    result.leagueGroupsTouched += stats.leagueGroupsTouched;
    result.candidatesRecorded += stats.candidatesRecorded;
  }

  const nextLast = snap.docs[snap.docs.length - 1]?.id ?? '';
  if (snap.empty || snap.size < PAGE_SIZE) {
    result.done = true;
    await cursorRef.set({
      lastUserId: admin.firestore.FieldValue.delete(),
      fullPassCompletedAt: Date.now(),
      lastResult: result,
      updatedAt: Date.now(),
    }, { merge: true });
  } else {
    await cursorRef.set({
      lastUserId: nextLast,
      lastResult: result,
      updatedAt: Date.now(),
    }, { merge: true });
  }

  console.log(JSON.stringify({ event: 'identity_cleanup_page_done', ...result }));
  return result;
}

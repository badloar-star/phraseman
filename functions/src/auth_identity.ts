import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';

const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';

function normalizeStableId(value: unknown): string {
  return String(value ?? '').trim();
}

async function assertStableOwner(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
): Promise<void> {
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  if (stableId === authUid) return;

  const [userSnap, linkSnap] = await Promise.all([
    db.collection(USERS).doc(stableId).get().catch(() => null),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
  ]);
  const userAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
  if (!userAuthUid || userAuthUid === authUid) return;

  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId === stableId) return;

  throw new HttpsError('permission-denied', 'stable_id_mismatch');
}

export async function linkStableAuthUid(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<void> {
  const now = Date.now();
  await db.collection(USERS).doc(stableId).set({
    firebaseAuthUid: authUid,
    updatedAt: now,
  }, { merge: true });

  const lbRef = db.collection(LEADERBOARD).doc(stableId);
  const lbSnap = await lbRef.get().catch(() => null);
  if (lbSnap?.exists) {
    await lbRef.set({ firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
  }
}

export async function resolveStableUidForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId?: unknown,
): Promise<string> {
  const stableId = normalizeStableId(requestedStableId);
  if (stableId) {
    await assertStableOwner(db, authUid, stableId);
    await linkStableAuthUid(db, stableId, authUid);
    return stableId;
  }

  const direct = await db.collection(USERS).doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

export const authEnsureStableLink = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableId = normalizeStableId(request.data?.stableId);
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId);
  return { ok: true, stableUid, authUid };
});

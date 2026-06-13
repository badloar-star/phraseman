import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';

const NAME_INDEX = 'name_index';

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeNameQuery(value: unknown): { name: string; nameLower: string } {
  const name = sanitizeString(String(value ?? '').replace(/^@+/, ''), 32);
  return { name, nameLower: name.toLowerCase() };
}

function nameIndexDocIsHidden(data: FirebaseFirestore.DocumentData | undefined): boolean {
  return data?.identityHidden === true;
}

async function targetIsVisible(
  db: FirebaseFirestore.Firestore,
  uid: string,
): Promise<boolean> {
  const cleanUid = sanitizeString(uid, 180);
  if (!cleanUid) return false;
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(cleanUid).get().catch(() => null),
    db.collection('banned_users').doc(cleanUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || !userSnap?.exists) return false;
  const data = userSnap.data() ?? {};
  if (data.identityHidden === true || data.banned === true) return false;
  return true;
}

export const friendLookupUser = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId, { requireKnownIdentity: true });

  const { name, nameLower } = normalizeNameQuery(request.data?.query);
  if (name.length < 2 || name.length > 32) {
    throw new HttpsError('invalid-argument', 'query_length');
  }

  const idxSnap = await db.collection(NAME_INDEX).doc(nameLower).get();
  const idx = idxSnap.data();
  const uid = sanitizeString(idx?.uid, 180);
  if (!idxSnap.exists || nameIndexDocIsHidden(idx) || !uid) {
    return { ok: true, user: null };
  }
  if (!(await targetIsVisible(db, uid))) {
    return { ok: true, user: null };
  }
  return {
    ok: true,
    user: {
      uid,
      source: 'name_index',
      name: sanitizeString(idx?.name || name, 32),
    },
  };
});


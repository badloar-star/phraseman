import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
const REGION = 'us-central1';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const FRIEND_CODE_INDEX = 'friend_code_index';
const CODE_LEN = 6;
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_ATTEMPTS = 12;

function normalizeStableId(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function isValidCode(code: string): boolean {
  if (code.length !== CODE_LEN) return false;
  for (const ch of code) {
    if (!CHARSET.includes(ch)) return false;
  }
  return true;
}

function randomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    out += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return out;
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
    db.collection(USERS).doc(stableId).get().catch(swallowed('friend_codes:get', null)),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(swallowed('friend_codes:get', null)),
  ]);
  const userAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
  if (userAuthUid && userAuthUid === authUid) return;
  if (!userSnap?.exists || !userAuthUid) return;

  const linkedAuth = userSnap.data()?.linkedAuth;
  const linkedAuthUid =
    linkedAuth != null &&
    typeof linkedAuth === 'object' &&
    typeof (linkedAuth as { providerUid?: unknown }).providerUid === 'string'
      ? String((linkedAuth as { providerUid?: unknown }).providerUid ?? '').trim()
      : '';
  if (linkedAuthUid === authUid) return;

  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId && linkedStableId === stableId) return;

  throw new HttpsError('permission-denied', 'stable_id_mismatch');
}

async function assertNotBanned(db: admin.firestore.Firestore, stableId: string): Promise<void> {
  // зачем (PM-252 п.4, координатор 04.10): прежний .catch(() => null) при сбое чтения ПРОПУСКАЛ забаненного.
  // Это запись (выдача/резерв) — при сбое закрываем, причину пишем в лог.
  const failures: string[] = [];
  const read = (label: string, ref: FirebaseFirestore.DocumentReference) => ref.get().catch((error: unknown) => {
    failures.push(`${label}:${String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 80)}`);
    return null;
  });
  const [userSnap, bannedSnap] = await Promise.all([
    read('users', db.collection(USERS).doc(stableId)),
    read('banned_users', db.collection('banned_users').doc(stableId)),
  ]);
  if (failures.length > 0) {
    console.warn('[BAN-CHECK] read_failed — fail-closed', JSON.stringify({ site: 'friend_codes', failures }));
    throw new HttpsError('unavailable', 'ban_check_unavailable');
  }
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    console.info('[BAN-CHECK] denied', JSON.stringify({ site: 'friend_codes', source: bannedSnap?.exists ? 'banned_users' : 'users.banned' }));
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

export const friendEnsureMyCode = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableId = normalizeStableId(request.data?.stableId);
  await assertStableOwner(db, authUid, stableId);
  await assertNotBanned(db, stableId);

  const userRef = db.collection(USERS).doc(stableId);
  const now = Date.now();

  const userSnap = await userRef.get();
  const existing = normalizeCode(userSnap.data()?.progress?.friend_code);
  if (isValidCode(existing)) {
    const indexRef = db.collection(FRIEND_CODE_INDEX).doc(existing);
    const result = await db.runTransaction(async (tx) => {
      const indexSnap = await tx.get(indexRef);
      const owner = String(indexSnap.data()?.uid ?? '').trim();
      if (indexSnap.exists && owner && owner !== stableId) {
        return null;
      }
      tx.set(indexRef, {
        uid: stableId,
        authUid,
        createdAt: indexSnap.exists ? (indexSnap.data()?.createdAt ?? now) : now,
        updatedAt: now,
      }, { merge: true });
      tx.set(userRef, {
        firebaseAuthUid: authUid,
        progress: { friend_code: existing },
        updatedAt: now,
      }, { merge: true });
      return { code: existing };
    });
    if (result) return result;
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = randomCode();
    const indexRef = db.collection(FRIEND_CODE_INDEX).doc(code);
    // eslint-disable-next-line no-await-in-loop
    const result = await db.runTransaction(async (tx) => {
      const [freshUserSnap, indexSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(indexRef),
      ]);
      const freshExisting = normalizeCode(freshUserSnap.data()?.progress?.friend_code);
      if (isValidCode(freshExisting)) return { code: freshExisting };
      if (indexSnap.exists) return null;
      tx.set(indexRef, { uid: stableId, authUid, createdAt: now, updatedAt: now });
      tx.set(userRef, {
        firebaseAuthUid: authUid,
        progress: { friend_code: code },
        updatedAt: now,
      }, { merge: true });
      return { code };
    });
    if (result) return result;
  }

  throw new HttpsError('resource-exhausted', 'code_generation_failed');
});

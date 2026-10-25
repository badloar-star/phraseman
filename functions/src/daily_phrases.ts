import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertAuthAccountUsableForCallable } from './account_gate';
import { ENFORCE_APP_CHECK } from './callable_options';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
const REGION = 'us-central1';
const DAILY_PHRASES = 'daily_phrases';
const DAILY_PHRASE_SAVES = 'daily_phrase_saves';
const DAILY_PHRASE_SAVE_COUNTS = 'daily_phrase_save_counts';

function cleanPhraseId(raw: unknown): string {
  const id = String(raw ?? '').trim();
  if (!id || id.length > 120 || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new HttpsError('invalid-argument', 'Bad phraseId');
  }
  return id;
}

async function resolveStableUid(authUid: string): Promise<string> {
  const db = admin.firestore();
  const direct = await db.collection('users').doc(authUid).get().catch(swallowed('daily_phrases:get', null));
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get().catch(swallowed('daily_phrases:get', null));
  if (byAuth && !byAuth.empty) return byAuth.docs[0]!.id;
  return authUid;
}

export const dailyPhraseSetSaved = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'Auth required');

  const phraseId = cleanPhraseId(request.data?.phraseId);
  const saved = request.data?.saved === true;
  const db = admin.firestore();
  // зачем (сверка Ревизора 25.10): в 14-дневной отсрочке удаления вход жив (вариант Б) — сохранения и публичные счётчики не двигаем.
  await assertAuthAccountUsableForCallable(db, authUid, 'dailyPhraseSetSaved');
  const stableUid = await resolveStableUid(authUid);

  const phraseRef = db.collection(DAILY_PHRASES).doc(phraseId);
  const saveRef = db.collection(DAILY_PHRASE_SAVES).doc(`${phraseId}_${stableUid}`);
  const countRef = db.collection(DAILY_PHRASE_SAVE_COUNTS).doc(phraseId);

  const savedCount = await db.runTransaction(async (tx) => {
    const [phraseSnap, saveSnap, countSnap] = await Promise.all([
      tx.get(phraseRef),
      tx.get(saveRef),
      tx.get(countRef),
    ]);
    if (!phraseSnap.exists) {
      throw new HttpsError('not-found', 'Phrase not found');
    }

    const current = Math.max(0, Number(countSnap.data()?.savedCount ?? phraseSnap.data()?.savedCount ?? 0) || 0);
    let delta = 0;
    if (saved && !saveSnap.exists) {
      delta = 1;
      tx.set(saveRef, {
        phraseId,
        uid: stableUid,
        authUid,
        savedAt: Date.now(),
      });
    } else if (!saved && saveSnap.exists) {
      delta = -1;
      tx.delete(saveRef);
    }

    const next = Math.max(0, current + delta);
    if (delta !== 0) {
      tx.set(countRef, {
        phraseId,
        savedCount: next,
        updatedAt: Date.now(),
      }, { merge: true });
      tx.set(phraseRef, {
        savedCount: next,
        updatedAt: Date.now(),
      }, { merge: true });
    }
    return next;
  });

  return { ok: true, savedCount };
});


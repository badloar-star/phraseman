// ═══ profileCardBioSetMine — запись своего текста визитки «Про» ═══════════════
// зачем (владелец 2026-09-30): текст живёт в public_profiles/{stableUid} рядом с
// profileCardTheme/profileCardStyle; клиент напрямую public_profiles не пишет
// (firestore.rules: update/create/delete = false), поэтому запись только здесь.
// Правила — в profile_card_bio_core.ts (только «Про», ≤ 80, без переносов и
// невидимых символов, фильтр мата, не чаще раза в минуту).
//
// Стоимость: 1 транзакция = 4 чтения (users, 2 маркера удаления, public_profiles)
// + 1 запись, только по явному нажатию «Сохранить». Одинаковый текст не пишется.
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { accountStateFromSnapshots, assertAccountUsable } from './account_gate';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { decideProfileCardBioWrite } from './profile_card_bio_core';

const LOG = '[PROFILE-CARD]';

export type ProfileCardBioSetResult = Readonly<{
  ok: true;
  status: 'written' | 'unchanged';
  text: string;
  updatedAtMs: number | null;
}>;

export const profileCardBioSetMine = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<ProfileCardBioSetResult> => {
  if (!request.auth?.uid) {
    logger.info(`${LOG} bio: отказ — нет авторизации`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const authUid = request.auth.uid;
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const rawText: unknown = request.data?.text;
  logger.info(`${LOG} bio: вход`, {
    stableUid,
    textType: typeof rawText,
    textLength: typeof rawText === 'string' ? rawText.length : null,
  });

  const banned = await db.collection('banned_users').doc(stableUid).get();
  if (banned.exists) {
    logger.info(`${LOG} bio: отказ — аккаунт заблокирован`, { stableUid });
    throw new HttpsError('permission-denied', 'banned');
  }

  return db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(stableUid);
    const profileRef = db.collection('public_profiles').doc(stableUid);
    const [userSnapshot, authDeletionMarker, stableDeletionTombstone, profileSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(db.collection('account_deletion_auth_markers').doc(authUid)),
      transaction.get(db.collection('account_deletion_tombstones').doc(stableUid)),
      transaction.get(profileRef),
    ]);
    assertAccountUsable(accountStateFromSnapshots({
      markers: [authDeletionMarker, stableDeletionTombstone], subject: 'stable',
    }));
    if (!userSnapshot.exists) {
      logger.info(`${LOG} bio: отказ — нет пользователя`, { stableUid });
      throw new HttpsError('failed-precondition', 'canonical_user_missing');
    }
    if (userSnapshot.data()?.identityHidden === true) {
      logger.info(`${LOG} bio: отказ — личность скрыта`, { stableUid });
      throw new HttpsError('failed-precondition', 'identity_hidden');
    }
    const profile = profileSnapshot.exists ? profileSnapshot.data() ?? null : null;
    const nowMs = Date.now();
    const decision = decideProfileCardBioWrite(profile, rawText, nowMs);
    logger.info(`${LOG} bio: решение`, {
      stableUid,
      profileExists: profileSnapshot.exists,
      profileCardPro: profile?.profileCardPro ?? null,
      lastUpdatedAtMs: profile?.profileCardBioUpdatedAtMs ?? null,
      decision: decision.kind,
      reason: decision.kind === 'reject' ? decision.reason : null,
    });
    if (decision.kind === 'reject') {
      const code = decision.reason === 'pro_required'
        ? 'permission-denied'
        : decision.reason === 'rate_limited'
          ? 'resource-exhausted'
          : 'invalid-argument';
      throw new HttpsError(code, decision.reason, {
        reason: decision.reason,
        retryAfterMs: decision.retryAfterMs ?? null,
      });
    }
    if (decision.kind === 'unchanged') {
      const previous = Number(profile?.profileCardBioUpdatedAtMs);
      return {
        ok: true as const,
        status: 'unchanged' as const,
        text: decision.text,
        updatedAtMs: Number.isFinite(previous) && previous > 0 ? previous : null,
      };
    }
    transaction.set(profileRef, {
      profileCardBio: decision.text ? decision.text : admin.firestore.FieldValue.delete(),
      profileCardBioUpdatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true as const, status: 'written' as const, text: decision.text, updatedAtMs: nowMs };
  });
});

/**
 * aiDialogBuyExtraReplies — докупка +10 реплик ИИ-диалога за 300 рун, когда
 * бесплатный дневной лимит исчерпан.
 *
 * зачем (владелец, 2026-09-17, дословно): «можно докупить 10 реплик, но это
 * будет стоить 300 рун, прямо внутри диалога, когда 10 реплик кончились сразу
 * появляется кнопочка и она доступна если руны есть и если нажать они сразу
 * спишутся и следующая реплика будет». Ограничения на число покупок в день
 * НЕТ (решение владельца 17.09, «сколько угодно») — предел расхода OpenAI
 * задаёт только баланс рун игрока, не фиксированное число.
 *
 * «Телефон авторитетен, сервер только синхронизация» (владелец, дословно):
 * клиент одной неизменяемой операцией фиксирует и -300 рун, и +10 реплик,
 * после чего поле ввода открывается МГНОВЕННО. Сервер не пересчитывает баланс
 * и не принимает повторное решение о списании: он проверяет точные байты
 * операции, идемпотентно сохраняет квитанцию и материализует уже принадлежащий
 * игроку grant в дневную квоту.
 *
 * Идемпотентность привязана к клиентскому operationId
 * `dialog_extra_replies:{requestId}` и SHA-256 fingerprint. requestId
 * генерируется один раз на тап и переживает ретраи/перезапуски; повтор с тем
 * же fingerprint возвращает ту же квитанцию, а конфликт отклоняется.
 *
 * Прибавка живёт в поле extraCapToday документа premium_dialog_quotas —
 * ровно там же, где enforceDailyQuota хранит dailyCount/resetAtMs. Один
 * документ, одна точка сброса на новый день (см. premium_dialog.ts).
 *
 * App Check не включаем — запломбирован владельцем (callable_options.ts,
 * APP_CHECK_SEALED_BY_OWNER_2026_08_17).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { QUOTA_COLLECTION, docId, startOfNextUtcDay } from './premium_dialog';
import {
  currentDialogQuotaObservation,
  hasValidDialogExtraRepliesOperationFingerprint,
  nextDialogQuotaAfterPurchase,
  parseDialogExtraRepliesOperation,
} from './dialog_extra_replies_contract';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Цена и выдача. Клиентские константы обязаны совпадать —
 * сторожит tests/ai_dialog_extra_replies_contract.test.ts. */
export const DIALOG_EXTRA_REPLIES_PRICE_RUNES = 300;
export const DIALOG_EXTRA_REPLIES_COUNT = 10;

/** Зеркало welcome_gift.ts/friends_together.ts: stableId обязан принадлежать вызывающему. */
function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

export async function materializeDialogExtraRepliesPurchase(input: Readonly<{
  db: FirebaseFirestore.Firestore;
  authUid: string;
  data: unknown;
  nowMs?: number;
}>) {
  const data = input.data && typeof input.data === 'object' && !Array.isArray(input.data)
    ? input.data as Readonly<Record<string, unknown>>
    : {};
  const stableUid = typeof data.stableId === 'string' ? data.stableId.trim() : '';
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  const operation = parseDialogExtraRepliesOperation(data.operation);
  if (!operation || !hasValidDialogExtraRepliesOperationFingerprint(operation)
    || operation.ownerStableId !== stableUid) {
    throw new HttpsError('invalid-argument', 'dialog_extra_replies_operation_invalid');
  }
  const requestId = operation.requestId;

  const db = input.db;
  const userRef = db.collection('users').doc(stableUid);
  const purchaseRef = userRef.collection('reward_claims').doc(`dialog_extra_replies_${requestId}`);
  const quotaRef = db.collection(QUOTA_COLLECTION).doc(docId('quota', input.authUid, stableUid));
  const now = input.nowMs ?? Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, purchaseSnap, quotaSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(purchaseRef),
      tx.get(quotaRef),
    ]);

    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), input.authUid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    if (purchaseSnap.exists) {
      const storedOperation = parseDialogExtraRepliesOperation(purchaseSnap.data()?.operation);
      if (!storedOperation || !hasValidDialogExtraRepliesOperationFingerprint(storedOperation)
        || storedOperation.requestFingerprint !== operation.requestFingerprint) {
        throw new HttpsError('already-exists', 'dialog_extra_replies_request_conflict');
      }
      const currentQuota = currentDialogQuotaObservation(quotaSnap.data() ?? {}, now, startOfNextUtcDay);
      if (currentQuota.normalizedFreshDay) {
        tx.set(quotaRef, {
          authUid: input.authUid,
          stableUid,
          dailyCap: currentQuota.dailyCap,
          dailyCount: currentQuota.dailyCount,
          extraCapToday: currentQuota.extraCapToday,
          resetAtMs: currentQuota.resetAtMs,
          quotaVersion: currentQuota.quotaVersion,
          updatedAtMs: now,
        }, { merge: true });
      }
      return {
        ok: true,
        alreadyPurchased: true,
        operationId: operation.operationId,
        requestFingerprint: operation.requestFingerprint,
        repliesGranted: operation.repliesGranted,
        priceRunes: operation.price,
        quota: currentQuota.observation,
      };
    }

    const quotaData = quotaSnap.data() ?? {};
    const nextQuota = nextDialogQuotaAfterPurchase(quotaData, now, startOfNextUtcDay);

    tx.set(quotaRef, {
      authUid: input.authUid,
      stableUid,
      dailyCap: nextQuota.dailyCap,
      dailyCount: nextQuota.dailyCount,
      extraCapToday: nextQuota.extraCapToday,
      resetAtMs: nextQuota.resetAtMs,
      quotaVersion: nextQuota.quotaVersion,
      updatedAtMs: now,
    }, { merge: true });

    tx.create(purchaseRef, {
      schemaVersion: 'dialog-extra-replies-server-receipt.v1',
      requestId,
      operation,
      createdAtMs: now,
    });

    return {
      ok: true,
      alreadyPurchased: false,
      operationId: operation.operationId,
      requestFingerprint: operation.requestFingerprint,
      repliesGranted: operation.repliesGranted,
      priceRunes: operation.price,
      quota: nextQuota.observation,
    };
  });
}

export const aiDialogBuyExtraReplies = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  return materializeDialogExtraRepliesPurchase({
    db: admin.firestore(),
    authUid: request.auth.uid,
    data: request.data,
  });
});

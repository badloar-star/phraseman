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
 * «Телефон авторитетен, сервер только синхронизация» (владелец, дословно)
 * относится к UX-слою: клиент списывает руны и открывает поле ввода
 * МГНОВЕННО, не дожидаясь ответа сервера (app/ai_dialog_session.tsx).
 * Но фактический расход платных вызовов OpenAI остаётся под серверной
 * транзакционной защитой — enforceDailyQuota в premium_dialog.ts читает
 * ИМЕННО тот дневной кап, который эта функция расширяет. Без этого слоя
 * модифицированный клиент открывал бы себе бесконечные реплики без списания
 * рун. Обе вещи не противоречат друг другу: покупка мгновенна для игрока,
 * а фактический вызов ИИ по-прежнему считает честный кассир на сервере.
 *
 * Идемпотентность — тот же паттерн, что welcome_gift.ts:
 *  - opId `dialog_extra_replies:{stableUid}:{requestId}` — леджер отвергает
 *    повторную вставку по этому же opId сам;
 *  - requestId генерируется на клиенте один раз на тап и переживает ретраи
 *    сети, поэтому дубль запроса при плохом канале не спишет руны дважды.
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
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

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

/** Тот же ISO-ключ недели, что в welcome_gift.ts (ленивый перенос недели в леджере). */
function isoWeekKey(nowMs: number): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const aiDialogBuyExtraReplies = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = String(request.data?.stableId ?? '').trim();
  const requestId = String(request.data?.requestId ?? '').trim();
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const purchaseRef = userRef.collection('reward_claims').doc(`dialog_extra_replies_${requestId}`);
  const quotaRef = db.collection(QUOTA_COLLECTION).doc(docId('quota', request.auth.uid, stableUid));
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, purchaseSnap, quotaSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(purchaseRef),
      tx.get(quotaRef),
    ]);

    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    if (purchaseSnap.exists) {
      // Реплей: покупка уже состоялась (в т.ч. когда первый ответ потерялся по сети).
      const current = normalizeStars(userSnap.data()?.stars);
      return {
        ok: true,
        alreadyPurchased: true,
        repliesGranted: DIALOG_EXTRA_REPLIES_COUNT,
        priceRunes: DIALOG_EXTRA_REPLIES_PRICE_RUNES,
        stars: current.balance,
        starsSeq: current.seq,
      };
    }

    const quotaData = quotaSnap.data() ?? {};
    const resetAtMs = Number(quotaData.resetAtMs ?? 0);
    // Новый день ещё не наступал в enforceDailyQuota — extraCapToday с прошлого дня
    // всё ещё не обнулён им, начинаем прибавку с нуля сами (та же граница fresh).
    const fresh = now >= resetAtMs;
    const extraCapToday = fresh ? 0 : Math.max(0, Number(quotaData.extraCapToday ?? 0));

    const starOps: StarOpRequest[] = [{
      opId: `dialog_extra_replies:${stableUid}:${requestId}`,
      delta: -DIALOG_EXTRA_REPLIES_PRICE_RUNES,
      reason: 'dialog_extra_replies',
      sourceKind: 'dialog_extra_replies',
      sourceId: stableUid,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { requestId, repliesGranted: DIALOG_EXTRA_REPLIES_COUNT },
    }];

    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid: request.auth!.uid,
    });
    const committed = commitStarOperations(tx, prepared);

    tx.set(quotaRef, {
      authUid: request.auth!.uid,
      stableUid,
      extraCapToday: extraCapToday + DIALOG_EXTRA_REPLIES_COUNT,
      // Новый день ещё не зафиксирован enforceDailyQuota — ставим resetAtMs сами,
      // чтобы прибавка не потерялась, если докупка произошла раньше первой реплики дня.
      resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
      updatedAtMs: now,
    }, { merge: true });

    tx.set(purchaseRef, {
      requestId,
      priceRunes: DIALOG_EXTRA_REPLIES_PRICE_RUNES,
      repliesGranted: DIALOG_EXTRA_REPLIES_COUNT,
      createdAt: now,
    });

    return {
      ok: true,
      alreadyPurchased: false,
      repliesGranted: DIALOG_EXTRA_REPLIES_COUNT,
      priceRunes: DIALOG_EXTRA_REPLIES_PRICE_RUNES,
      stars: committed.balance,
      starsSeq: committed.seq,
    };
  });
});

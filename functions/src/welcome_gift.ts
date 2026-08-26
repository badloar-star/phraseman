/**
 * welcomeGiftClaim — стартовый подарок новичку: +300 рун (поле `stars`).
 *
 * зачем (владелец, 2026-08-26): приветственная модалка после онбординга сразу
 * начисляет новичку 300 рун «просто так». Руны авторитетен сервер, поэтому
 * грант идёт ТОЛЬКО через stars_ledger (prepareStarOperations/
 * commitStarOperations) — как friends_together и arena. Класс операции —
 * 'grant': balance растёт, earnedTotal/weekEarned/seasonEarned не двигаются,
 * подарок не влияет на сезонный и недельный прогресс.
 *
 * Идемпотентность двухслойная:
 *  - claim-документ users/{uid}/reward_claims/welcome_gift — одна выдача на
 *    аккаунт навсегда; повторный вызов реплеит сохранённый ответ (паттерн
 *    receipt из friends_together/arena_expansion);
 *  - opId `welcome_gift:{uid}` — леджер сам отвергнет дубль, даже если claim-док
 *    потеряется.
 *
 * Жемчужины (+100) этой функции НЕ касаются: они клиентски-авторитетны и
 * начисляются мгновенно на устройстве (app/welcome_gift.ts), офлайн включительно.
 *
 * App Check не включаем — запломбирован владельцем (callable_options.ts,
 * APP_CHECK_SEALED_BY_OWNER_2026_08_17).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Сумма подарка. Клиентская константа обязана совпадать —
 * сторожит tests/welcome_gift_contract.test.ts. */
export const WELCOME_GIFT_RUNES = 300;

/** Зеркало friends_together.userMatchesAuth: stableId обязан принадлежать вызывающему. */
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

/** Тот же ISO-ключ недели, что в friends_together (ленивый перенос недели в леджере). */
function isoWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const welcomeGiftClaim = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = String(request.data?.stableId ?? '').trim();
  const requestId = String(request.data?.requestId ?? '').trim();
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');
  if (!/^[A-Za-z0-9_-]{12,96}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'invalid_request_id');
  }

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const claimRef = userRef.collection('reward_claims').doc('welcome_gift');
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);

    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    if (claimSnap.exists) {
      // Реплей: выдача уже состоялась (в т.ч. когда первый ответ потерялся).
      // Отдаём текущее состояние рун, чтобы клиент домерджил актуальный баланс.
      const current = normalizeStars(userSnap.data()?.stars);
      return {
        ok: true,
        alreadyClaimed: true,
        starsGranted: WELCOME_GIFT_RUNES,
        stars: current.balance,
        starsEarnedTotal: current.earnedTotal,
        starsSeq: current.seq,
      };
    }

    const starOps: StarOpRequest[] = [{
      // ⚠️ СТРОГО 1 РАЗ НА АККАУНТ (владелец, 2026-08-26, дословно: «зафиксируй
      // жёстко»): opId привязан ТОЛЬКО к stableUid, никогда к requestId/времени/
      // устройству — второй слой идемпотентности поверх claimRef выше. Даже
      // если claim-документ по какой-то причине потеряется, леджер сам
      // отвергнет повторную вставку по этому же opId (Firestore-транзакция).
      opId: `welcome_gift:${stableUid}`,
      delta: WELCOME_GIFT_RUNES,
      reason: 'welcome_gift',
      sourceKind: 'welcome_gift',
      sourceId: stableUid,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { requestId },
    }];

    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid: request.auth!.uid,
    });
    const committed = commitStarOperations(tx, prepared);

    tx.set(claimRef, {
      requestId,
      starsGranted: WELCOME_GIFT_RUNES,
      createdAt: now,
    });

    return {
      ok: true,
      alreadyClaimed: false,
      starsGranted: WELCOME_GIFT_RUNES,
      stars: committed.balance,
      starsEarnedTotal: committed.earnedTotal,
      starsSeq: committed.seq,
    };
  });
});

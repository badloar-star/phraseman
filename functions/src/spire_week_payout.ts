// ═══════════════════════════════════════════════════════════════════════════
// spire_week_payout.ts — выплата монет за место/повышение недели Шпиля (PM-280).
//
// зачем (владелец 2026-09-24, T35; закрывает О-276-1): крон PM-276 считал сумму
// в итог недели (rewardCoins, rewardStatus: 'pending_wallet'), но не клал её в
// кошелёк. До PM-069 монеты = руны, поэтому выплата идёт в единый журнал
// stars_ledger.ts — тем же путём, что и все остальные начисления.
//
// Защита от двойной выплаты — ДВА слоя, оба по одному ключу
// `spire_week:{lang}_{weekId}` (один на игрока, неделю и язык):
//   1. своя проверка расписки users/{uid}/star_operations/{opId} в начале
//      транзакции: расписка есть → итог помечается 'paid' суммой ИЗ РАСПИСКИ,
//      журнал не вызывается вовсе (так переживаем и смену сумм в админке
//      между прогонами крона — второй суммы не будет);
//   2. сам журнал: тот же opId на повторе → already_applied, баланс не трогается.
// Флаг rewardStatus защитой НЕ является (ретрай крона переписывает итог заново,
// об этом предупреждал PM-276) — это только отметка для экрана и админки.
//
// Сумма берётся из документа итога, записанного кроном, а не пересчитывается:
// что человек увидит в итоге, ровно то и придёт в кошелёк.
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { arenaSeasonWindow } from './arena_v2_core';
import { getWeekKey, isoDateUtc } from './progress_events';
import { spireWeekRewardOp, spireWeekRewardOpId } from './spire_coins';
import {
  STAR_OPERATIONS_COLLECTION,
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  prepareStarOperations,
} from './stars_ledger';

const LOG = '[SPIRE-PAYOUT]';

export type SpireWeekPayoutStatus =
  | 'paid'
  | 'already_paid'
  | 'nothing_to_pay'
  | 'skipped_user_missing'
  | 'skipped_identity_transition'
  | 'skipped_result_missing'
  | 'rejected';

export type SpireWeekPayoutOutcome = Readonly<{
  uid: string;
  status: SpireWeekPayoutStatus;
  opId: string;
  coins: number;
  errorCode?: string;
}>;

export type SpireWeekPayoutInput = Readonly<{
  uid: string;
  weekId: string;
  lang: string;
  resultRef: admin.firestore.DocumentReference;
  /** Понедельник 00:00 UTC следующей недели — фиксированный earnedAtMs операции. */
  weekEndMs: number;
}>;

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Снимок кошелька после выплаты — для итога недели.
 * зачем (координатор 15.10, аудит Optimistic UI): окно «+100 за повышение» говорило о монетах, которых шапка не видела до
 * следующего урока — клиент принимает серверный баланс только из квитанций. Теперь итог несёт баланс, итог заработанного
 * и номер операции журнала после выплаты; клиент вливает их через mergeLevelSpinServerStars (тот же guard по starsSeq —
 * старый снимок свежего не затрёт). Битые числа → поля не пишем (клиент без снимка просто ничего не вливает).
 */
export function spireWeekPaidWalletFields(source: Readonly<{ balance: unknown; earnedTotal: unknown; seq: unknown }>): Record<string, number> {
  const balance = Number(source.balance);
  const earnedTotal = Number(source.earnedTotal);
  const seq = Number(source.seq);
  if (![balance, earnedTotal, seq].every((v) => Number.isSafeInteger(v) && v >= 0) || seq === 0) return {};
  return { starsBalanceAfter: balance, starsEarnedTotalAfter: earnedTotal, starsSeq: seq };
}

/**
 * Одна транзакция на одного игрока. Чтения: users/{uid}, итог недели, расписка
 * (+ расписка внутри журнала). Записи: баланс + расписка + отметка в итоге.
 * Бросает только на сбое Firestore — вызывающий крон ловит и ретраит прогон.
 */
export async function payoutSpireWeekReward(
  db: admin.firestore.Firestore,
  input: SpireWeekPayoutInput,
): Promise<SpireWeekPayoutOutcome> {
  const opId = spireWeekRewardOpId(input.weekId, input.lang);
  // guard-ok: точечные документы по id, не листинг коллекции.
  const userRef = db.collection('users').doc(input.uid); // guard-ok: документ по id
  const receiptRef = userRef.collection(STAR_OPERATIONS_COLLECTION).doc(opId); // guard-ok: документ по id

  const outcome = await db.runTransaction(async (tx): Promise<SpireWeekPayoutOutcome> => {
    beginStarLedgerTransactionAttempt(tx);
    const [userSnap, resultSnap, receiptSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(input.resultRef),
      tx.get(receiptRef),
    ]);

    if (!userSnap.exists) {
      // Не создаём users/{uid} ради монет: журнал сделал бы set(merge) и родил
      // пустой профиль. Итог остаётся pending_wallet — виден в админке.
      return { uid: input.uid, status: 'skipped_user_missing', opId, coins: 0 };
    }
    const userData = userSnap.data();
    if (userData?.identityHidden === true || userData?.levelSpinMergePending === true) {
      // Аккаунт в переезде: баланс сейчас нельзя трогать. Ретрай крона догонит.
      return { uid: input.uid, status: 'skipped_identity_transition', opId, coins: 0 };
    }
    if (!resultSnap.exists) {
      return { uid: input.uid, status: 'skipped_result_missing', opId, coins: 0 };
    }

    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() ?? {};
      const paid = Math.max(0, Math.trunc(num(receipt.delta)));
      // guard-ok: запись внутри runTransaction.
      tx.set(input.resultRef, { // guard-ok: merge:true ниже, внутри runTransaction
        rewardStatus: 'paid',
        rewardOpId: opId,
        rewardPaidCoins: paid,
        // зачем: ретрай крона — снимок из расписки (баланс сразу после ЭТОЙ выплаты); клиент сам отбросит его, если уже видел новее.
        ...spireWeekPaidWalletFields({ balance: receipt.balanceAfter, earnedTotal: receipt.earnedTotalAfter, seq: receipt.seq }),
      }, { merge: true });
      return { uid: input.uid, status: 'already_paid', opId, coins: paid };
    }

    const result = resultSnap.data() ?? {};
    const reward = (result.rewardCoins && typeof result.rewardCoins === 'object')
      ? result.rewardCoins as Record<string, unknown>
      : {};
    const op = spireWeekRewardOp({
      weekId: input.weekId,
      lang: input.lang,
      place: num(reward.place),
      promotion: num(reward.promotion),
      liveRank: Math.trunc(num(result.liveRank)),
      weekEndMs: input.weekEndMs,
    });
    if (!op) {
      // guard-ok: запись внутри runTransaction.
      tx.set(input.resultRef, { rewardStatus: 'none' }, { merge: true });
      return { uid: input.uid, status: 'nothing_to_pay', opId, coins: 0 };
    }

    const nowMs = Date.now();
    const prepared = await prepareStarOperations(tx, db, input.uid, userSnap, [op], {
      nowMs,
      activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
      weekKeyNow: getWeekKey(isoDateUtc(new Date(nowMs))),
      // Серверная выплата крона: вызывающего человека нет, пишем имя крона.
      authUid: 'system:spireFinalizeCron',
    });
    const ledgerOutcome = prepared.outcomes[0];
    if (!ledgerOutcome || ledgerOutcome.status === 'rejected') {
      // Ничего не пишем: итог остаётся pending_wallet, причина — в лог наверху.
      return {
        uid: input.uid,
        status: 'rejected',
        opId,
        coins: 0,
        errorCode: ledgerOutcome?.errorCode ?? 'no_outcome',
      };
    }
    const ledger = commitStarOperations(tx, prepared);
    // guard-ok: запись внутри runTransaction.
    tx.set(input.resultRef, { // guard-ok: merge:true ниже, внутри runTransaction
      rewardStatus: 'paid',
      rewardOpId: opId,
      rewardPaidCoins: op.delta,
      rewardPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      ...spireWeekPaidWalletFields(ledger),
    }, { merge: true });
    return {
      uid: input.uid,
      status: ledgerOutcome.status === 'already_applied' ? 'already_paid' : 'paid',
      opId,
      coins: op.delta,
    };
  });

  const line = JSON.stringify({ event: 'payout', weekId: input.weekId, lang: input.lang, ...outcome });
  if (outcome.status === 'rejected' || outcome.status.startsWith('skipped_')) console.warn(LOG, line);
  else console.log(LOG, line);
  return outcome;
}

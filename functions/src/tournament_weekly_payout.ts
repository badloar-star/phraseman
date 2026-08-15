// ═══════════════════════════════════════════════════════════════════════════
// tournament_weekly_payout.ts — раздача недельного банка турниров.
//
// зачем: с каждого турнира 20% банка копится в недельном фонде (плюс доли
// неразыгранных мест). Владелец решил раздавать его в ночь воскресенья тройке
// лучших ПО СУММЕ ОЧКОВ за неделю — так награждается и сила, и регулярность:
// можно ни разу не выиграть, но стабильно быть в тройке и взять банк.
//
// Деньги игроков, поэтому три защиты:
//   1) идемпотентность — повторный запуск крона не выплатит дважды;
//   2) транзакция — банк помечается выплаченным ровно один раз;
//   3) детерминированный порядок при ничьей — тот же результат при пересчёте.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  TOURNAMENT_BANK_COLLECTION,
  TOURNAMENT_LOBBY_OPEN_MS,
  TOURNAMENT_SEASONS_COLLECTION,
  TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION,
  tournamentWeekId,
} from './tournament_core';
import { tournamentEntryWindowMsFromEconomy } from './tournament_all_day';
import {
  normalizeTournamentEconomy,
  weeklyBankPayouts,
  type WeeklyStanding,
} from './tournament_economy';
import { parseActiveTournamentTicket } from './tournaments';
import { assertTournamentsReleased, TOURNAMENTS_RELEASED } from './tournament_release_gate';
import { appendExternalEconomyEvent } from './external_economy_events';

const REGION = 'us-central1';
const TOURNAMENT_SCHEDULE_COLLECTION = 'tournamentSchedule';
/** Сколько участников недели читаем: тройка призёров + запас на ничьи. */
const STANDINGS_LIMIT = 50;

function readInt(value: unknown, fallback = 0): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** ISO-неделя, предшествующая указанному моменту. */
export function previousWeekId(nowMs: number): string {
  return tournamentWeekId(nowMs - 7 * 24 * 60 * 60 * 1000);
}

export type WeeklyPayoutResult = {
  readonly weekId: string;
  readonly bankGems: number;
  readonly paid: number;
  readonly winners: number;
  readonly carryOver: number;
  readonly alreadyPaid: boolean;
};

/**
 * Раздаёт банк указанной недели.
 *
 * Читает: 1 документ банка + до 50 записей сезона (агрегат по очкам уже
 * посчитан при финализации турниров, поэтому пересчитывать нечего).
 */
export async function payoutWeeklyBank(
  db: FirebaseFirestore.Firestore,
  weekId: string,
  nowMs: number,
): Promise<WeeklyPayoutResult> {
  const bankRef = db.collection(TOURNAMENT_BANK_COLLECTION).doc(weekId);
  const bankSnap = await bankRef.get();
  if (!bankSnap.exists) {
    return { weekId, bankGems: 0, paid: 0, winners: 0, carryOver: 0, alreadyPaid: false };
  }
  const bank = bankSnap.data() || {};
  if (bank.paidOutAtMs) {
    return {
      weekId,
      bankGems: readInt(bank.total, 0),
      paid: readInt(bank.paidGems, 0),
      winners: readInt(bank.winnersCount, 0),
      carryOver: readInt(bank.carryOver, 0),
      alreadyPaid: true,
    };
  }

  // Переносим остаток прошлых недель: если раздать было некому, банк не сгорел.
  const bankGems = Math.max(0, readInt(bank.total, 0));
  if (bankGems <= 0) {
    return { weekId, bankGems: 0, paid: 0, winners: 0, carryOver: 0, alreadyPaid: false };
  }

  // guard-ok: limit + orderBy — читаем только верх таблицы, не всю неделю.
  const standingsSnap = await db.collection(TOURNAMENT_SEASONS_COLLECTION).doc(weekId)
    .collection(TOURNAMENT_SEASON_ENTRIES_SUBCOLLECTION)
    .orderBy('points', 'desc')
    .limit(STANDINGS_LIMIT)
    .get();

  const standings: WeeklyStanding[] = standingsSnap.docs.map((doc) => ({
    uid: doc.id,
    points: Math.max(0, readInt(doc.data()?.points, 0)),
  }));

  const economySnap = await db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy').get();
  const economy = normalizeTournamentEconomy(economySnap.data());
  const { payouts, carryOver } = weeklyBankPayouts(bankGems, standings, economy);
  const nextWeek = tournamentWeekId(nowMs);
  const nextBankRef = nextWeek !== weekId
    ? db.collection(TOURNAMENT_BANK_COLLECTION).doc(nextWeek)
    : null;

  // Транзакция: банк помечается выплаченным ровно один раз. Если крон
  // сработает повторно (или параллельно), второй проход увидит paidOutAtMs.
  // guard-ok: ВСЁ ниже — внутри транзакции; immutable reward events и отметка
  // paidOutAtMs коммитятся атомарно, без server wallet projection.
  // Гонка двух запусков невозможна: второй увидит отметку и выйдет.
  const applied = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(bankRef);
    if (fresh.data()?.paidOutAtMs) return false;

    for (const payout of payouts) {
      if (payout.gems <= 0) continue;
      const userRef = db.collection('users').doc(payout.uid);
      appendExternalEconomyEvent(tx, userRef, {
        source: 'tournament_weekly_bank', eventId: weekId, ownerStableId: payout.uid,
        delta: payout.gems, reason: 'tournament_weekly_bank', kind: 'competition_weekly_bank_reward',
        subjectId: weekId, payload: { weekId, place: payout.place }, createdAtMs: nowMs,
      });
      // guard-ok: лог — НОВЫЙ документ с детерминированным id по неделе;
      // merge не нужен, повторная запись затрёт саму себя, а не создаст
      // вторую строку. Тот же приём, что у призов турнира.
      tx.set(userRef.collection('shard_log').doc(`tournament_weekly_${weekId}`), {
        ts: new Date(nowMs).toISOString(),
        type: 'earn',
        amount: payout.gems,
        reason: 'tournament_weekly_bank',
        weekId,
        place: payout.place,
      });

    }

    tx.set(bankRef, {
      paidOutAtMs: nowMs,
      paidGems: payouts.reduce((sum, payout) => sum + payout.gems, 0),
      winnersCount: payouts.length,
      carryOver,
      winners: payouts.map((payout) => ({ uid: payout.uid, place: payout.place, gems: payout.gems })),
      updatedAt: nowMs,
    }, { merge: true });
    if (carryOver > 0 && nextBankRef) {
      tx.set(nextBankRef, {
        weekId: nextWeek,
        total: admin.firestore.FieldValue.increment(carryOver),
        carriedFrom: weekId,
        updatedAt: nowMs,
      }, { merge: true });
    }
    return true;
  });

  if (!applied) {
    return { weekId, bankGems, paid: 0, winners: 0, carryOver: 0, alreadyPaid: true };
  }

  return {
    weekId,
    bankGems,
    paid: payouts.reduce((sum, payout) => sum + payout.gems, 0),
    winners: payouts.length,
    carryOver,
    alreadyPaid: false,
  };
}

/**
 * Крон: ночь воскресенья на понедельник (00:10 UTC понедельника).
 *
 * зачем именно понедельник: ISO-неделя заканчивается воскресеньем, поэтому
 * раздавать надо, когда она УЖЕ закрыта — иначе турниры воскресного вечера
 * не попали бы в зачёт.
 */
export const tournamentWeeklyBankCron = onSchedule(
  { schedule: '10 0 * * 1', timeZone: 'UTC', region: REGION },
  async () => {
    if (!TOURNAMENTS_RELEASED) return;
    const db = admin.firestore();
    const nowMs = Date.now();
    const weekId = previousWeekId(nowMs);
    const result = await payoutWeeklyBank(db, weekId, nowMs);
    console.info('[tournament_weekly_bank] payout', result);
  },
);

/** Ручной запуск из админки — на случай сбоя крона или ручной проверки. */
export const adminPayoutTournamentWeeklyBank = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    assertTournamentsReleased();
    const data = request.data && typeof request.data === 'object' ? request.data as Record<string, unknown> : {};
    const nowMs = Date.now();
    const weekId = typeof data.weekId === 'string' && /^\d{4}-W\d{2}$/.test(data.weekId)
      ? data.weekId
      : previousWeekId(nowMs);
    return payoutWeeklyBank(admin.firestore(), weekId, nowMs);
  },
);

// ── Настройки экономики из админки ──────────────────────────────────────────

/**
 * зачем: владелец просил крутить экономику без выкладки новой версии.
 * Цена входа дублируется в документ расписания (`config`), который клиент и так
 * читает при открытии экрана — иначе на каждое открытие уходило бы лишнее
 * чтение ради одного числа.
 */
export const adminSetTournamentEconomy = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    assertTournamentsReleased();
    const economy = normalizeTournamentEconomy(request.data);
    const db = admin.firestore();
    const nowMs = Date.now();

    const batch = db.batch();
    batch.set(db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy'), {
      ...economy,
      updatedAt: nowMs,
    }, { merge: true });
    // Дубль цены для клиента: экран читает config одним снимком.
    batch.set(db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('config'), {
      entryGems: economy.entryGems,
      updatedAt: nowMs,
    }, { merge: true });
    await batch.commit();

    return { ok: true, economy };
  },
);

/** Текущие настройки экономики — для формы в админке. */
export const adminGetTournamentEconomy = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    assertTournamentsReleased();
    const snap = await admin.firestore()
      .collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy').get();
    return { ok: true, economy: normalizeTournamentEconomy(snap.data()) };
  },
);

// ── Витрина недельного банка для клиента ────────────────────────────────────

/**
 * Текущий банк недели + результат последней раздачи для конкретного игрока.
 *
 * зачем: на экране турниров банк был захардкожен числом 240, а о выигрыше
 * недельного банка игрок не узнавал вовсе — начисление идёт кроном ночью.
 * Здесь одним вызовом отдаём и текущий банк, и «вы выиграли N» за прошлую
 * неделю, чтобы экран показал это при первом же заходе.
 *
 * Стоимость: 2 чтения документов на вызов, клиент кэширует.
 */
export const tournamentWeeklyBankInfo = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    assertTournamentsReleased();
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const nowMs = Date.now();
    const currentWeek = tournamentWeekId(nowMs);
    const lastWeek = previousWeekId(nowMs);

    // зачем 2026-07-27: доли банка и окно входа были ЗАХАРДКОЖЕНЫ на клиенте
    // (60/25/15 и 5 минут). Поменяй владелец экономику в админке — экран стал
    // бы врать про деньги. Отдаём настройки вместе с банком: источник истины
    // один, лишнего чтения нет (документ economy читается тем же getAll).
    // зачем 2026-08-03: билеты турниров — не отдельный баланс, а витрина
    // (жемчужины ÷ цена входа + бесплатный недельный вход). Дочитываем
    // профиль ТЕМ ЖЕ getAll — ноль дополнительных round-trip'ов, кэш на
    // клиенте (loadWeeklyBankInfo, TTL 30 мин) держит расход низким.
    const uid = String(request.auth.uid);
    const [currentSnap, lastSnap, economySnap, userSnap] = await db.getAll(
      db.collection(TOURNAMENT_BANK_COLLECTION).doc(currentWeek),
      db.collection(TOURNAMENT_BANK_COLLECTION).doc(lastWeek),
      db.collection(TOURNAMENT_SCHEDULE_COLLECTION).doc('economy'),
      db.collection('users').doc(uid),
    );
    const economy = normalizeTournamentEconomy(economySnap.data());
    const userData = userSnap.data() || {};
    const freeEntryAvailable = String(userData.tournament_free_entry_week_id ?? '') !== currentWeek;
    // зачем 2026-08-04 (владелец: Season Pass tournament_ticket — «появится
    // ассет в разделе турнир в правом углу»): та же userSnap, что и
    // freeEntryAvailable выше — ноль лишних чтений. Клиент рисует бейдж по
    // этому полю (app/(tabs)/tournaments.tsx).
    const seasonTicketAvailable = parseActiveTournamentTicket(userData) !== null;

    // Моя доля прошлой недели — если раздача уже прошла.
    const winners = Array.isArray(lastSnap.data()?.winners) ? lastSnap.data()!.winners : [];
    const mine = winners.find((entry: unknown) => {
      const row = entry as { uid?: unknown } | null;
      return row && String(row.uid ?? '') === uid;
    }) as { place?: unknown; gems?: unknown } | undefined;

    return {
      ok: true,
      weekId: currentWeek,
      bankGems: Math.max(0, readInt(currentSnap.data()?.total, 0)),
      // Клиент рисует доли и открывает кнопку входа ПО ЭТИМ числам, а не по
      // своим копиям — так экран не может разойтись с реальной экономикой.
      weeklyShares: economy.weeklyShares,
      lobbyOpenMs: TOURNAMENT_LOBBY_OPEN_MS,
      // зачем 2026-07-27 (владелец): слот — это ОКНО в полчаса, внутри которого
      // можно зайти, а не одна точка старта. Без этого числа экран показывал
      // мёртвый 00:00 всё окно вместо честного статуса «турниры идут».
      entryWindowMs: tournamentEntryWindowMsFromEconomy(economySnap.data()),
      /** Серверные часы: клиент сверяет свои и не врёт при сбитом времени. */
      serverNowMs: nowMs,
      /** Цена входа (владелец: «билет стоит 5 жемчужин») — экран билетов считает от неё. */
      entryGems: economy.entryGems,
      freeEntryAvailable,
      seasonTicketAvailable,
      lastWeek: {
        weekId: lastWeek,
        paidOut: Boolean(lastSnap.data()?.paidOutAtMs),
        myPlace: mine ? readInt(mine.place, 0) : 0,
        myGems: mine ? readInt(mine.gems, 0) : 0,
      },
    };
  },
);

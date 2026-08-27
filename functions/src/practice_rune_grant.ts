import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { arenaSeasonWindow } from './arena_v2_core';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { getWeekKey } from './progress_events';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpReceipt,
  type StarOpRequest,
} from './stars_ledger';

/**
 * practice_rune_grant.ts — зачёт рун, заработанных в учебной сессии.
 *
 * зачем (владелец, 2026-08-27): «надо сделать чтобы руны можно было
 * зарабатывать в уроках, в словаре, неправильные глаголы, блиц, тренировка,
 * отработка ошибок, отработка голосом». До этого руны приносили только Арена,
 * курс Learning V2, друзья, спин и биржа.
 *
 * Устройство — зеркало `level_spin_star_grant.ts`: клиент присылает закрытую
 * расписку с отпечатком, сервер проверяет её сам и кладёт ОДНУ операцию в
 * журнал рун. Повтор той же расписки не начисляет второй раз (идемпотентность
 * по operationId), расхождение расписки с уже применённой — конфликт, а не
 * тихое перезатирание.
 *
 * Firebase-экономия: одна транзакция на ВСЮ сессию, а не на каждый правильный
 * ответ. Сорок правильных ответов в словаре — это по-прежнему один вызов.
 */

const ACTIVITIES = Object.freeze([
  'lesson',
  'vocabulary',
  'irregular_verbs',
  'flashcards_blitz',
  'flashcards_training',
  'mistake_practice',
  'speaking_practice',
] as const);

type PracticeRuneActivity = (typeof ACTIVITIES)[number];

const SESSION_KEY = /^[A-Za-z0-9_-]{1,120}$/;
const FINGERPRINT = /^[a-f0-9]{64}$/;

/**
 * Потолок начисления за одну сессию.
 *
 * зачем: расписку формирует клиент, а клиент подделывается. Отпечаток защищает
 * от случайной порчи, но не от злонамеренного пересчёта — секрета у телефона
 * нет. Потолок превращает возможную накрутку из безграничной в незначительную:
 * 300 рун — это 100 правильных ответов по полной цене, больше любой честной
 * сессии словаря или блица. Всё сверху сервер отвергает.
 */
export const PRACTICE_RUNE_MAX_PER_SESSION = 300;

/**
 * Потолок начисления за сутки по всем учебным активностям вместе.
 *
 * зачем (аудит 2026-08-27): потолка на сессию НЕ ХВАТАЕТ. `completionOrdinal`
 * выбирает клиент, а не сервер, поэтому подделанный клиент шлёт ordinal 1, 2,
 * 3… — каждый раз получается НОВЫЙ operationId, и идемпотентность по расписке
 * его не останавливает. Без суточного потолка это неограниченная эмиссия
 * валюты, которую тратят в магазине.
 *
 * Почему ordinal вообще нужен клиентский: повторные прохождения законны
 * (владелец разрешил перепроходить и снова зарабатывать), а серверного
 * идентификатора прохождения у этих семи экранов нет — в отличие от курса V2,
 * где opId привязан к выданному сервером courseSessionId.
 *
 * 900 рун в сутки — заведомо выше честного дневного максимума (самая щедрая
 * сессия, 60 глаголов, даёт 180), но превращает возможную накрутку из
 * бесконечной в ограниченную и заметную в аудите.
 */
export const PRACTICE_RUNE_MAX_PER_DAY = 900;

/** Календарные сутки по UTC — ключ окна суточного потолка. */
export function practiceRuneDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

type PracticeRuneDailyState = Readonly<{ dayKey: string; earned: number }>;

/**
 * Разбор счётчика суток из документа игрока. Поле лежит рядом с `stars`, в том
 * же документе, который транзакция и так читает — дополнительных чтений ноль.
 * Клиент записать его не может: `practice_runes_daily` закрыт правилом
 * Firestore ровно как `stars`.
 */
export function readPracticeRuneDaily(
  raw: unknown,
  dayKeyNow: string,
): PracticeRuneDailyState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return Object.freeze({ dayKey: dayKeyNow, earned: 0 });
  }
  const value = raw as Record<string, unknown>;
  // Другой день — окно открывается заново, накопленное вчера не мешает.
  if (value.dayKey !== dayKeyNow) {
    return Object.freeze({ dayKey: dayKeyNow, earned: 0 });
  }
  const earned = value.earned;
  if (!Number.isSafeInteger(earned) || (earned as number) < 0) {
    return Object.freeze({ dayKey: dayKeyNow, earned: 0 });
  }
  return Object.freeze({ dayKey: dayKeyNow, earned: earned as number });
}

export type PracticeRuneComposite = Readonly<{
  schemaVersion: 'client-practice-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal: number;
  amount: number;
  reason: 'practice_session_reward';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type PracticeRuneMaterializationAck = Readonly<{
  materialized: true;
  operationId: string;
  requestFingerprint: string;
  replayed: boolean;
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function requestFingerprint(value: PracticeRuneComposite): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: value.ownerStableId,
    activity: value.activity,
    sessionKey: value.sessionKey,
    completionOrdinal: value.completionOrdinal,
    amount: value.amount,
    reason: 'practice_session_reward',
  })).digest('hex');
}

/** Идентификатор операции. Совпадает с клиентским practiceRuneSettlementOperationId. */
export function practiceRuneOperationId(input: Readonly<{
  activity: PracticeRuneActivity;
  sessionKey: string;
  completionOrdinal: number;
}>): string {
  return `practice_rune:${input.activity}:${input.sessionKey}:${input.completionOrdinal}`;
}

export function parsePracticeRuneComposite(input: unknown): PracticeRuneComposite {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'practice_rune_composite_invalid');
  }
  const value = input as Partial<PracticeRuneComposite>;
  const activity = String(value.activity ?? '') as PracticeRuneActivity;
  const sessionKey = String(value.sessionKey ?? '');
  const completionOrdinal = value.completionOrdinal;
  const amount = value.amount;
  const operationId = ACTIVITIES.includes(activity) && SESSION_KEY.test(sessionKey)
    && Number.isSafeInteger(completionOrdinal) && Number(completionOrdinal) >= 1
    ? practiceRuneOperationId({
      activity, sessionKey, completionOrdinal: Number(completionOrdinal),
    })
    : '';
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'activity', 'sessionKey',
    'completionOrdinal', 'amount', 'reason', 'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-practice-rune-operation.v1'
    || !operationId
    || value.operationId !== operationId
    || typeof value.ownerStableId !== 'string'
    || !value.ownerStableId.trim()
    || value.ownerStableId.includes('/')
    || value.ownerStableId.length > 160
    || !Number.isSafeInteger(amount)
    || Number(amount) < 1
    || Number(amount) > PRACTICE_RUNE_MAX_PER_SESSION
    || value.reason !== 'practice_session_reward'
    || !Number.isSafeInteger(value.createdAtMs)
    || Number(value.createdAtMs) < 0
    || !FINGERPRINT.test(String(value.requestFingerprint ?? ''))) {
    throw new HttpsError('invalid-argument', 'practice_rune_composite_invalid');
  }
  const parsed = value as PracticeRuneComposite;
  if (requestFingerprint(parsed) !== parsed.requestFingerprint) {
    throw new HttpsError('invalid-argument', 'practice_rune_fingerprint_invalid');
  }
  return parsed;
}

export function practiceRuneLedgerOperation(
  composite: PracticeRuneComposite,
): StarOpRequest {
  return Object.freeze({
    opId: composite.operationId,
    delta: composite.amount,
    reason: 'practice_session' as const,
    sourceKind: `practice_${composite.activity}`,
    sourceId: `${composite.sessionKey}.${composite.completionOrdinal}`,
    ruleVersion: 1,
    earnedAtMs: composite.createdAtMs,
    meta: Object.freeze({
      clientFingerprint: composite.requestFingerprint,
      activity: composite.activity,
      completionOrdinal: composite.completionOrdinal,
    }),
  });
}

export function assertPracticeRuneOwner(
  resolvedStableUid: string,
  composite: PracticeRuneComposite,
): void {
  if (resolvedStableUid !== composite.ownerStableId) {
    throw new HttpsError('permission-denied', 'practice_rune_owner_mismatch');
  }
}

export function practiceRuneReplayMatches(
  receipt: Partial<StarOpReceipt>,
  composite: PracticeRuneComposite,
): boolean {
  return receipt.opId === composite.operationId
    && receipt.delta === composite.amount
    && receipt.reason === 'practice_session'
    && receipt.sourceKind === `practice_${composite.activity}`
    && receipt.sourceId === `${composite.sessionKey}.${composite.completionOrdinal}`
    && receipt.meta?.clientFingerprint === composite.requestFingerprint;
}

export const practiceRuneGrant = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request): Promise<PracticeRuneMaterializationAck> => {
    const authUid = request.auth?.uid;
    if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
    const composite = parsePracticeRuneComposite(request.data?.operation);
    const db = admin.firestore();
    const stableUid = await resolveStableUidForAuth(db, authUid, composite.ownerStableId, {
      requireKnownIdentity: true,
      repairLinks: false,
    });
    assertPracticeRuneOwner(stableUid, composite);
    const userRef = db.collection('users').doc(stableUid);
    const receiptRef = userRef.collection('star_operations').doc(composite.operationId);
    const now = Date.now();
    return db.runTransaction(async (tx) => {
      // guard-ok: это чтения ДВУХ конкретных документов по id (users/{uid} и
      // его расписка), а не запросы коллекций — limit()/where() тут неприменимы.
      // Ровно два чтения на всю сессию, сколько бы ответов в ней ни было.
      const [userSnap, existingReceipt] = await Promise.all([
        tx.get(userRef), tx.get(receiptRef),
      ]);
      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'practice_rune_owner_missing');
      }
      if (existingReceipt.exists) {
        const receipt = existingReceipt.data() as Partial<StarOpReceipt>;
        if (!practiceRuneReplayMatches(receipt, composite)) {
          throw new HttpsError('already-exists', 'practice_rune_operation_conflict');
        }
        const current = normalizeStars(userSnap.data()?.stars);
        return Object.freeze({
          materialized: true as const,
          operationId: composite.operationId,
          requestFingerprint: composite.requestFingerprint,
          replayed: true,
          starsBalance: current.balance,
          starsEarnedTotal: current.earnedTotal,
          starsSeq: current.seq,
        });
      }
      // Суточный потолок. Читается из того же документа, что уже загружен —
      // ни одного дополнительного чтения Firestore.
      const dayKeyNow = practiceRuneDayKey(now);
      const daily = readPracticeRuneDaily(
        userSnap.data()?.practice_runes_daily,
        dayKeyNow,
      );
      if (daily.earned + composite.amount > PRACTICE_RUNE_MAX_PER_DAY) {
        throw new HttpsError('resource-exhausted', 'practice_rune_daily_cap_reached');
      }

      const prepared = await prepareStarOperations(
        tx,
        db,
        stableUid,
        userSnap,
        [practiceRuneLedgerOperation(composite)],
        {
          nowMs: now,
          activeSeasonId: arenaSeasonWindow(now).seasonId,
          weekKeyNow: getWeekKey(new Date(now).toISOString().slice(0, 10)),
          authUid,
          deviceId: null,
        },
      );
      const result = commitStarOperations(tx, prepared);
      if (result.outcomes[0]?.status !== 'applied') {
        throw new HttpsError('failed-precondition', 'practice_rune_materialization_failed');
      }
      // Счётчик суток двигаем В ТОЙ ЖЕ транзакции, что и баланс: иначе руны
      // начислились бы, а потолок остался бы нетронутым при сбое между записями.
      // guard-ok: tx.set внутри транзакции синхронно ставит запись в очередь —
      // await к нему неприменим, атомарность обеспечивает сама транзакция.
      tx.set(userRef, {
        practice_runes_daily: { dayKey: dayKeyNow, earned: daily.earned + composite.amount },
      }, { merge: true });
      return Object.freeze({
        materialized: true as const,
        operationId: composite.operationId,
        requestFingerprint: composite.requestFingerprint,
        replayed: false,
        starsBalance: result.balance,
        starsEarnedTotal: result.earnedTotal,
        starsSeq: result.seq,
      });
    });
  },
);

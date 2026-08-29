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
  STAR_OP_MAX_ABS_DELTA,
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
 * расписку с отпечатком, сервер проверяет её сам и кладёт один semantic
 * settlement в журнал рун (крупная сумма — детерминированными строками одной
 * транзакции). Повтор той же расписки не начисляет второй раз (идемпотентность
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

// Structural transaction/resource bound, not a gameplay earning ceiling.
// 128 receipt rows + one user projection remain below Firestore's transaction
// write limit while still allowing one exact 640,000-rune settlement.
const MAX_PRACTICE_RUNE_STAR_CHUNKS = 128;
const MAX_PRACTICE_RUNE_STRUCTURAL_AMOUNT = STAR_OP_MAX_ABS_DELTA * MAX_PRACTICE_RUNE_STAR_CHUNKS;

type PracticeRuneActivity = (typeof ACTIVITIES)[number];

/**
 * Лимит длины ключа сессии.
 *
 * зачем (аудит 2026-08-27): journal opId допускает хвост максимум 96 символов
 * (`OP_ID_RE` в stars_ledger.ts), а opId склеивается как
 * `{activity}_{sessionKey}_{ordinal}`. Самая длинная активность —
 * `flashcards_training` (19 символов), ordinal до 3 цифр, два разделителя —
 * это 24 символа служебной части. 72 символа на sessionKey оставляют запас и
 * гарантируют, что opId не превысит лимит журнала ни при какой активности.
 * Это должно совпадать с SESSION_KEY_MAX в app/practice_rune_earnings.ts.
 */
const SESSION_KEY = /^[A-Za-z0-9_-]{1,72}$/;
const FINGERPRINT = /^[a-f0-9]{64}$/;

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
    createdAtMs: value.createdAtMs,
  })).digest('hex');
}

function legacyRequestFingerprint(value: PracticeRuneComposite): string {
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
  // зачем (аудит 2026-08-27): журнал рун принимает РОВНО ОДНО двоеточие
  // (OP_ID_RE в stars_ledger.ts). Прежний формат с тремя двоеточиями
  // отвергался как invalid_op_id — ни одна руна не начислилась бы вообще.
  return `practice_rune:${input.activity}_${input.sessionKey}_${input.completionOrdinal}`;
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
    || value.reason !== 'practice_session_reward'
    || !Number.isSafeInteger(value.createdAtMs)
    || Number(value.createdAtMs) < 0
    || !FINGERPRINT.test(String(value.requestFingerprint ?? ''))) {
    throw new HttpsError('invalid-argument', 'practice_rune_composite_invalid');
  }
  if (Number(amount) > MAX_PRACTICE_RUNE_STRUCTURAL_AMOUNT) {
    throw new HttpsError('invalid-argument', 'practice_rune_structural_limit_exceeded');
  }
  const parsed = value as PracticeRuneComposite;
  if (requestFingerprint(parsed) !== parsed.requestFingerprint
    && legacyRequestFingerprint(parsed) !== parsed.requestFingerprint) {
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
    // Примечание (аудит 2026-08-27): docs/arena/STAGE1_SPEC.md:155 фиксирует
    // соглашение «sourceKind == префикс opId». Здесь оно НЕ соблюдено:
    // sourceKind = practice_{activity} (напр. practice_vocabulary), а префикс
    // opId = practice_rune (см. practiceRuneOperationId). Расхождение ничего
    // не ломает — оба поля валидны и однозначны сами по себе, — но делает
    // opId невыводимым из одного sourceKind при будущей ручной реконсиляции.
    // Если понадобится строгое соответствие, здесь и в practiceRuneOperationId
    // нужно унифицировать префикс одновременно.
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

export function splitPracticeRuneStarOperations(
  composite: PracticeRuneComposite,
): readonly StarOpRequest[] {
  if (composite.amount > MAX_PRACTICE_RUNE_STRUCTURAL_AMOUNT) {
    throw new HttpsError('invalid-argument', 'practice_rune_structural_limit_exceeded');
  }
  if (composite.amount <= STAR_OP_MAX_ABS_DELTA) {
    return Object.freeze([practiceRuneLedgerOperation(composite)]);
  }
  const chunkCount = Math.ceil(composite.amount / STAR_OP_MAX_ABS_DELTA);
  const chunks: StarOpRequest[] = [];
  let remaining = composite.amount;
  for (let index = 0; remaining > 0; index += 1) {
    const delta = Math.min(remaining, STAR_OP_MAX_ABS_DELTA);
    chunks.push(Object.freeze({
      // The first row remains the stable semantic settlement anchor. It makes
      // operation-id reuse with altered bytes observable before any write.
      opId: index === 0
        ? composite.operationId
        : `practice_rune:${composite.requestFingerprint.slice(0, 40)}_${index + 1}`,
      delta,
      reason: 'practice_session' as const,
      sourceKind: `practice_${composite.activity}`,
      sourceId: `${composite.sessionKey}.${composite.completionOrdinal}.${index + 1}`,
      ruleVersion: 1,
      earnedAtMs: composite.createdAtMs,
      meta: Object.freeze({
        clientFingerprint: composite.requestFingerprint,
        settlementOperationId: composite.operationId,
        activity: composite.activity,
        completionOrdinal: composite.completionOrdinal,
        chunkIndex: index + 1,
        chunkCount,
      }),
    }));
    remaining -= delta;
  }
  return Object.freeze(chunks);
}

function practiceRuneChunkReplayMatches(
  receipt: Partial<StarOpReceipt>,
  operation: StarOpRequest,
): boolean {
  return receipt.opId === operation.opId
    && receipt.delta === operation.delta
    && receipt.reason === operation.reason
    && receipt.sourceKind === operation.sourceKind
    && receipt.sourceId === operation.sourceId
    && receipt.meta?.clientFingerprint === operation.meta?.clientFingerprint
    && receipt.meta?.settlementOperationId === operation.meta?.settlementOperationId
    && receipt.meta?.chunkIndex === operation.meta?.chunkIndex
    && receipt.meta?.chunkCount === operation.meta?.chunkCount;
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
    const starOperations = splitPracticeRuneStarOperations(composite);
    const receiptRef = userRef.collection('star_operations').doc(starOperations[0]!.opId);
    const now = Date.now();
    return db.runTransaction(async (tx) => {
      // guard-ok: это чтения конкретных документов по id (users/{uid} и
      // детерминированные расписки чанков), а не запросы коллекций —
      // limit()/where() тут неприменимы. Все чтения выполняются до записей.
      const [userSnap, existingReceipt] = await Promise.all([
        tx.get(userRef), tx.get(receiptRef),
      ]);
      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'practice_rune_owner_missing');
      }
      if (existingReceipt.exists) {
        const receipt = existingReceipt.data() as Partial<StarOpReceipt>;
        const replayMatches = starOperations.length === 1
          ? practiceRuneReplayMatches(receipt, composite)
          : practiceRuneChunkReplayMatches(receipt, starOperations[0]!);
        if (!replayMatches) {
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
      const prepared = await prepareStarOperations(
        tx,
        db,
        stableUid,
        userSnap,
        starOperations,
        {
          nowMs: now,
          activeSeasonId: arenaSeasonWindow(now).seasonId,
          weekKeyNow: getWeekKey(new Date(now).toISOString().slice(0, 10)),
          authUid,
          deviceId: null,
        },
      );
      const result = commitStarOperations(tx, prepared);
      if (result.outcomes.length !== starOperations.length
        || result.outcomes.some((outcome) => outcome.status !== 'applied')
        || result.outcomes.reduce((total, outcome) => total + outcome.appliedDelta, 0) !== composite.amount) {
        throw new HttpsError('failed-precondition', 'practice_rune_materialization_failed');
      }
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

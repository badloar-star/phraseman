import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { arenaSeasonWindow } from './arena_v2_core';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  COIN_WALLET_LIMITS_FIELD,
  applyCoinWalletLimits,
  assertCoinWalletOperationShape,
  classifyCoinWalletSource,
  normalizeCoinWalletLimits,
  type CoinWalletClassification,
} from './coin_wallet_policy';
import { getWeekKey } from './progress_events';
import {
  STAR_OPERATIONS_COLLECTION,
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpReceipt,
  type StarOpRequest,
} from './stars_ledger';
import { applySuperSundayRuneMultiplier, legacySuperSundayAmount } from '../../modules/economy/super_sunday_runes';

/**
 * Серверный кошелёк монет (Q13).
 *
 * зачем: серверный кошелёк монет, спины удалены (владелец 01.10). Callable
 * возвращён из efe19ae9d^ под прежним именем `levelSpinStarGrant`, потому что
 * клиент (app/community_packs/functionsClient.ts → callLevelSpinStarComposite)
 * уже шлёт сюда ВСЕ начисления монет: награды за жалобы, «Дневной путь» и
 * компенсацию подарков. Контракт запроса/ответа — байт в байт прежний
 * (`{ operation }` → LevelSpinStarMaterializationAck), формат расписки в
 * stars_ledger тоже прежний, чтобы уже проведённые операции схлопывались
 * повтором, а не конфликтом. Новое — белый список источников и лимиты
 * (functions/src/coin_wallet_policy.ts); логи — префикс [COIN-WALLET].
 * App Check НЕ включаем: общие HOT_CALLABLE_OPTIONS (пломба 2026-08-17).
 */

const STAR_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
  // Зеркала на клиенте: modules/phone-state/domains/economy.ts и
  // app/level_spin_star_grants.ts. Крупнейший номинал компенсации Q12.
  stars_2000: 2_000,
} as const);
const REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;
const DELIVERY_TOKEN = /^[A-Za-z0-9_-]{16,96}$/;
const FINGERPRINT = /^[a-f0-9]{64}$/;
const LOG = '[COIN-WALLET]';

export type LevelSpinStarComposite = Readonly<{
  schemaVersion: 'client-level-spin-star-operation.v1';
  operationId: string;
  ownerStableId: string;
  requestId: string;
  lane: 'base' | 'premium';
  deliveryToken?: string;
  giftId: keyof typeof STAR_AMOUNTS;
  amount: number;
  promotionEligibility?: 'gameplay' | 'excluded_compensation';
  reason: 'level_spin_star_reward';
  grant: Readonly<{
    kind: 'star_credit';
    subjectId: string;
    payload: Readonly<{
      requestId: string;
      lane: 'base' | 'premium';
      giftId: keyof typeof STAR_AMOUNTS;
      amount: number;
    }>;
  }>;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type LevelSpinStarMaterializationAck = Readonly<{
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

function requestFingerprint(value: LevelSpinStarComposite): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: value.ownerStableId,
    requestId: value.requestId,
    lane: value.lane,
    deliveryToken: value.deliveryToken ?? null,
    giftId: value.giftId,
    amount: value.amount,
    ...(value.promotionEligibility === undefined
      ? {}
      : { promotionEligibility: value.promotionEligibility }),
    reason: 'level_spin_star_reward',
  })).digest('hex');
}

function invalidComposite(why: string): never {
  console.warn(`${LOG} reject reason=level_spin_star_composite_invalid why=${why}`);
  throw new HttpsError('invalid-argument', 'level_spin_star_composite_invalid');
}

/** Закрытая форма операции — та же, что парсит клиент (parseLevelSpinStarCreditExactResult). */
export function parseLevelSpinStarComposite(input: unknown): LevelSpinStarComposite {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalidComposite('not_object');
  const value = input as Partial<LevelSpinStarComposite>;
  const keys = [
    'schemaVersion', 'operationId', 'ownerStableId', 'requestId', 'lane', 'giftId',
    'amount', 'reason', 'grant', 'createdAtMs', 'requestFingerprint',
    ...(value.deliveryToken === undefined ? [] : ['deliveryToken']),
    ...(value.promotionEligibility === undefined ? [] : ['promotionEligibility']),
  ];
  const requestId = String(value.requestId ?? '');
  const lane = value.lane === 'base' || value.lane === 'premium' ? value.lane : null;
  const giftId = String(value.giftId ?? '') as keyof typeof STAR_AMOUNTS;
  const baseAmount = Object.prototype.hasOwnProperty.call(STAR_AMOUNTS, giftId) ? STAR_AMOUNTS[giftId] : NaN;
  const promotionEligibility = value.promotionEligibility;
  const amount = promotionEligibility === 'gameplay' && Number.isSafeInteger(value.createdAtMs)
    && Number.isSafeInteger(baseAmount)
    ? applySuperSundayRuneMultiplier(baseAmount, Number(value.createdAtMs))
    : baseAmount;
  const operationId = lane ? `level_spin:${requestId}.${lane}` : '';
  const grant = value.grant;
  const payload = grant?.payload;
  if (!exactKeys(value, keys)) invalidComposite('keys');
  if (value.schemaVersion !== 'client-level-spin-star-operation.v1') invalidComposite('schema');
  if (!REQUEST_ID.test(requestId) || !lane || value.operationId !== operationId) invalidComposite('request_or_lane');
  if (typeof value.ownerStableId !== 'string' || !value.ownerStableId.trim()
    || value.ownerStableId.includes('/') || value.ownerStableId.length > 160) invalidComposite('owner');
  if (value.deliveryToken !== undefined && !DELIVERY_TOKEN.test(value.deliveryToken)) invalidComposite('delivery_token');
  if (promotionEligibility !== undefined && promotionEligibility !== 'gameplay'
    && promotionEligibility !== 'excluded_compensation') invalidComposite('promotion_eligibility');
  // зачем (D147): «Супер-воскресенье» снято, но старые сборки ещё шлют ×2 в воскресенье.
  // Переходно принимаем и такую сумму (с логом), иначе человек остался бы без монет.
  const legacyAmount = promotionEligibility === 'gameplay' && Number.isSafeInteger(value.createdAtMs)
    && Number.isSafeInteger(baseAmount) ? legacySuperSundayAmount(baseAmount, Number(value.createdAtMs)) : amount;
  const acceptedLegacy = value.amount !== amount && legacyAmount !== amount && value.amount === legacyAmount;
  if (!Number.isSafeInteger(baseAmount) || (value.amount !== amount && !acceptedLegacy)) invalidComposite('amount');
  if (acceptedLegacy) console.warn(`[SUPER-SUNDAY-RETIRED] legacy x2 accepted request=${requestId.slice(0, 8)} base=${baseAmount} amount=${String(value.amount)}`);
  if (value.reason !== 'level_spin_star_reward') invalidComposite('reason');
  if (!Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0) invalidComposite('created_at');
  if (!FINGERPRINT.test(String(value.requestFingerprint ?? ''))) invalidComposite('fingerprint_shape');
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)
    || !exactKeys(grant, ['kind', 'subjectId', 'payload'])
    || grant.kind !== 'star_credit'
    || grant.subjectId !== operationId
    || !payload || typeof payload !== 'object' || Array.isArray(payload)
    || !exactKeys(payload, ['requestId', 'lane', 'giftId', 'amount'])
    || payload.requestId !== requestId
    || payload.lane !== lane
    || payload.giftId !== giftId
    || payload.amount !== amount) invalidComposite('grant');
  const parsed = value as LevelSpinStarComposite;
  if (requestFingerprint(parsed) !== parsed.requestFingerprint) {
    console.warn(`${LOG} reject reason=level_spin_star_fingerprint_invalid op=${parsed.operationId}`);
    throw new HttpsError('invalid-argument', 'level_spin_star_fingerprint_invalid');
  }
  return parsed;
}

/** Расписка stars_ledger — формат прежнего кода, чтобы старые расписки схлопывались повтором. */
export function levelSpinStarLedgerOperation(composite: LevelSpinStarComposite): StarOpRequest {
  return Object.freeze({
    opId: composite.operationId,
    delta: composite.amount,
    reason: 'level_spin_grant' as const,
    sourceKind: 'level_spin_client_composite',
    sourceId: `${composite.requestId}.${composite.lane}`,
    ruleVersion: 1,
    earnedAtMs: composite.createdAtMs,
    meta: Object.freeze({
      clientFingerprint: composite.requestFingerprint,
      giftId: composite.giftId,
      lane: composite.lane,
    }),
  });
}

export function assertLevelSpinStarOwner(
  resolvedStableUid: string,
  composite: LevelSpinStarComposite,
): void {
  if (resolvedStableUid !== composite.ownerStableId) {
    console.warn(`${LOG} reject reason=level_spin_star_owner_mismatch op=${composite.operationId}`);
    throw new HttpsError('permission-denied', 'level_spin_star_owner_mismatch');
  }
}

export function levelSpinStarReplayMatches(
  receipt: Partial<StarOpReceipt>,
  composite: LevelSpinStarComposite,
): boolean {
  return receipt.opId === composite.operationId
    && receipt.delta === composite.amount
    && receipt.reason === 'level_spin_grant'
    && receipt.sourceKind === 'level_spin_client_composite'
    && receipt.sourceId === `${composite.requestId}.${composite.lane}`
    && receipt.meta?.clientFingerprint === composite.requestFingerprint
    && receipt.meta?.giftId === composite.giftId
    && receipt.meta?.lane === composite.lane;
}

/** Белый список + статические лимиты; бросает до любых чтений. */
export function classifyLevelSpinStarComposite(composite: LevelSpinStarComposite): CoinWalletClassification {
  const classification = classifyCoinWalletSource(composite.requestId);
  assertCoinWalletOperationShape(composite, classification);
  return classification;
}

function siblingReportAmount(
  snap: admin.firestore.DocumentSnapshot | null,
  composite: LevelSpinStarComposite,
  otherLane: 'base' | 'premium',
): number {
  if (!snap?.exists) return 0;
  const receipt = snap.data() as Partial<StarOpReceipt> | undefined;
  if (receipt?.sourceId !== `${composite.requestId}.${otherLane}`) {
    console.warn(`${LOG} sibling_ignored op=${composite.operationId} reason=source_mismatch sourceId=${String(receipt?.sourceId)}`);
    return 0;
  }
  const delta = Number(receipt.delta);
  return Number.isSafeInteger(delta) && delta > 0 ? delta : 0;
}

export type CoinWalletMaterializeInput = Readonly<{
  authUid: string;
  stableUid: string;
  composite: LevelSpinStarComposite;
  classification: CoinWalletClassification;
  nowMs: number;
}>;

/** Транзакция: повтор → прежний результат без начисления; иначе лимиты → stars_ledger. */
export async function materializeCoinWalletOperation(
  db: admin.firestore.Firestore,
  input: CoinWalletMaterializeInput,
): Promise<LevelSpinStarMaterializationAck> {
  const { authUid, stableUid, composite, classification, nowMs } = input;
  const userRef = db.collection('users').doc(stableUid);
  const receipts = userRef.collection(STAR_OPERATIONS_COLLECTION);
  const receiptRef = receipts.doc(composite.operationId);
  const otherLane = composite.lane === 'base' ? 'premium' : 'base';
  // зачем (Ревизор 22.10): экзамен главы — вторая часть (_2) проходит только после квитанции первой (_1) той же главы;
  // одно чтение в той же транзакции, только для второй части. Жалоба — соседняя полоса, как раньше.
  const chapterExamPartOne = classification.source === 'chapter_exam' && composite.requestId.endsWith('_2')
    ? `${composite.requestId.slice(0, -2)}_1`
    : null;
  const siblingRef = classification.source === 'report_reward'
    ? receipts.doc(`level_spin:${composite.requestId}.${otherLane}`)
    : chapterExamPartOne
      ? receipts.doc(`level_spin:${chapterExamPartOne}.base`)
      : null;
  return db.runTransaction(async (tx) => {
    beginStarLedgerTransactionAttempt(tx);
    const [userSnap, existingReceipt, siblingSnap] = await Promise.all([
      tx.get(userRef), tx.get(receiptRef), siblingRef ? tx.get(siblingRef) : Promise.resolve(null),
    ]);
    if (!userSnap.exists) {
      console.warn(`${LOG} reject reason=level_spin_star_owner_missing op=${composite.operationId}`);
      throw new HttpsError('failed-precondition', 'level_spin_star_owner_missing');
    }
    if (existingReceipt.exists) {
      const receipt = existingReceipt.data() as Partial<StarOpReceipt>;
      if (!levelSpinStarReplayMatches(receipt, composite)) {
        console.warn(`${LOG} reject reason=level_spin_star_operation_conflict op=${composite.operationId} storedDelta=${String(receipt.delta)} amount=${composite.amount}`);
        throw new HttpsError('already-exists', 'level_spin_star_operation_conflict');
      }
      const current = normalizeStars(userSnap.data()?.stars);
      console.log(`${LOG} replay op=${composite.operationId} source=${classification.source} balance=${current.balance} seq=${current.seq} credited=0`);
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
    if (chapterExamPartOne) {
      const partOne = siblingSnap?.exists ? siblingSnap.data() as Partial<StarOpReceipt> | undefined : undefined;
      const delta = Number(partOne?.delta);
      if (partOne?.sourceId !== `${chapterExamPartOne}.base` || !Number.isSafeInteger(delta) || delta <= 0) {
        console.warn(`${LOG} reject reason=coin_wallet_chapter_exam_part_one_missing op=${composite.operationId} sourceId=${String(partOne?.sourceId ?? null)}`);
        throw new HttpsError('failed-precondition', 'coin_wallet_chapter_exam_part_one_missing');
      }
    }
    const limitsBefore = normalizeCoinWalletLimits(userSnap.data()?.[COIN_WALLET_LIMITS_FIELD]);
    const sibling = siblingRef && !chapterExamPartOne ? siblingReportAmount(siblingSnap, composite, otherLane) : 0;
    const limitsAfter = applyCoinWalletLimits(limitsBefore, composite, classification, nowMs, sibling);
    const prepared = await prepareStarOperations(
      tx, db, stableUid, userSnap, [levelSpinStarLedgerOperation(composite)],
      {
        nowMs,
        activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
        weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
        authUid,
        deviceId: null,
      },
    );
    const outcome = prepared.outcomes[0];
    if (outcome?.status !== 'applied') {
      console.warn(`${LOG} reject reason=level_spin_star_materialization_failed op=${composite.operationId} status=${String(outcome?.status)} errorCode=${String(outcome?.errorCode ?? null)}`);
      throw new HttpsError('failed-precondition', 'level_spin_star_materialization_failed');
    }
    const result = commitStarOperations(tx, prepared, { [COIN_WALLET_LIMITS_FIELD]: limitsAfter });
    console.log(`${LOG} credited op=${composite.operationId} source=${classification.source} sub=${classification.subSource} amount=${composite.amount} balance=${result.balance} seq=${result.seq}`);
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
}

// зачем: серверный кошелёк монет, спины удалены (владелец 01.10)
export const levelSpinStarGrant = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<LevelSpinStarMaterializationAck> => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    console.warn(`${LOG} reject reason=auth_required`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const startedAt = Date.now();
  const composite = parseLevelSpinStarComposite(request.data?.operation);
  console.log(`${LOG} enter auth=${authUid.slice(0, 8)} op=${composite.operationId} giftId=${composite.giftId} amount=${composite.amount} eligibility=${composite.promotionEligibility ?? 'none'}`);
  const classification = classifyLevelSpinStarComposite(composite);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, composite.ownerStableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  assertLevelSpinStarOwner(stableUid, composite);
  try {
    const ack = await materializeCoinWalletOperation(db, {
      authUid, stableUid, composite, classification, nowMs: Date.now(),
    });
    console.log(`${LOG} done op=${composite.operationId} replayed=${ack.replayed} balance=${ack.starsBalance} ms=${Date.now() - startedAt}`);
    return ack;
  } catch (error) {
    const code = error instanceof HttpsError ? error.code : 'internal';
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} failed op=${composite.operationId} code=${code} message=${message} ms=${Date.now() - startedAt}`);
    throw error;
  }
});

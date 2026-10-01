import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { arenaSeasonWindow } from './arena_v2_core';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { getWeekKey } from './progress_events';
import {
  STAR_OPERATIONS_COLLECTION,
  STAR_OP_RETENTION_MS,
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

/**
 * Q-COIN (b), координатор 01.10: разовая серверная сверка кошелька монет.
 *
 * ИСТОЧНИК (единственный, серверный, записан до 2.0): `users/{uid}/level_spin_results`.
 * Эти документы пишет ТОЛЬКО сервер (правила: read/write false для клиента;
 * писатель — levelRewardSpinClaim/levelRewardSpinAcknowledge, удалённые в 2.0,
 * efe19ae9d). Дорожка `deliveries.<lane>` со state 'delivered' и подарком
 * `stars_*` — серверный факт: «сервер выдал телефону N монет». Монеты на
 * телефоне материализовались в журнал отдельным вызовом levelSpinStarGrant с
 * распиской `star_operations/level_spin:<requestId>.<lane>`. Нет расписки —
 * монеты жили только на телефоне. Сверка проводит ровно эти недостающие
 * дорожки, ПОД ТЕМ ЖЕ opId — поэтому каждая дорожка зачисляется один раз за
 * жизнь, кто бы её ни провёл (старый вызов или сверка).
 *
 * Чего здесь НЕТ намеренно: число баланса, присланное телефоном
 * (`clientVisibleBalance`), только печатается в лог. Основанием для подъёма
 * оно не является — иначе любой подменит число и накрутит монеты.
 *
 * Отдельной серверной копии «баланса до 2.0» не существует: progress.stars в
 * облако не синхронизировался (app/cloud_sync.ts — ключей монет нет в SYNC_KEYS),
 * а users/{uid}.stars — это и есть текущий журнал. Журналы телефона
 * (personal_sync_segments) пишет сам клиент — для подъёма не годятся.
 *
 * Только ВВЕРХ (класс grant, дельты > 0), идемпотентно (поле
 * users/{uid}.coinReconcileV1 + расписки по opId), с потолком.
 * App Check НЕ включаем: общие HOT_CALLABLE_OPTIONS (пломба 2026-08-17).
 */

const LOG = '[COIN-RECONCILE]';

export const COIN_RECONCILE_V1_FIELD = 'coinReconcileV1' as const;
export const COIN_RECONCILE_V1_SOURCE_KIND = 'coin_reconcile_v1' as const;

/**
 * Номиналы монет в спинах уровня (зеркало прежнего каталога спинов и
 * functions/src/level_spin_star_grant.ts). stars_2000 — номинал компенсации Q12,
 * в спинах его не было — не принимаем.
 */
export const COIN_RECONCILE_V1_SPIN_AMOUNTS: Readonly<Record<string, number>> = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
});

export const COIN_RECONCILE_V1_LIMITS = Object.freeze({
  /**
   * Потолок подъёма за жизнь: 20 000 монет. Обоснование: реальный случай
   * расхождения владельца — 9 830; спин даёт максимум 1 000 на дорожку, так что
   * 20 000 = 20 крупнейших выигрышей подряд, с двукратным запасом над
   * наблюдённым. Выше потолка автоматически НЕ поднимаем ничего (частичный
   * подъём сделал бы потолок обходимым повторами) — статус over_cap_review,
   * решение за координатором/владельцем вручную.
   */
  maxRaiseLifetime: 20_000,
  /** Документов results на человека читаем не больше (один раз за жизнь). */
  maxResultsScanned: 500,
  /** Операций в одной транзакции (лимит Firestore — 500 записей). */
  maxOperations: 200,
  /**
   * Расписки журнала живут STAR_OP_RETENTION_MS (400 дней, TTL). Дорожки старше
   * окна не трогаем: отсутствие расписки там не доказывает «не зачислено».
   * Спины с монетами появились 2026-08-24 — сейчас всё внутри окна.
   */
  receiptSafetyMarginMs: 5 * 24 * 60 * 60 * 1_000,
});

export type CoinReconcileStatus = 'raised' | 'nothing_to_raise' | 'over_cap_review';

export type CoinReconcileV1Record = Readonly<{
  schemaVersion: 1;
  status: CoinReconcileStatus;
  raisedBy: number;
  operationIds: readonly string[];
  /** Сумма, найденная при over_cap_review (для ручного решения); иначе = raisedBy. */
  foundTotal: number;
  atMs: number;
}>;

export type CoinReconcileV1Response = Readonly<{
  status: CoinReconcileStatus | 'replayed';
  raisedBy: number;
  operationIds: readonly string[];
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

export type SpinStarLane = Readonly<{
  requestId: string;
  lane: 'base' | 'premium';
  giftId: string;
  amount: number;
  createdAtMs: number;
  operationId: string;
}>;

const REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;

export function spinStarOperationId(requestId: string, lane: 'base' | 'premium'): string {
  return `level_spin:${requestId}.${lane}`;
}

/**
 * Чистая функция: из документов level_spin_results достаёт выданные монетные
 * дорожки внутри окна хранения расписок. Всё сомнительное пропускается с логом.
 */
export function deliveredSpinStarLanes(
  results: readonly Readonly<{ id: string; data: Record<string, unknown> | undefined }>[],
  nowMs: number,
  log: (line: string) => void = () => {},
): SpinStarLane[] {
  const oldestAllowedMs = nowMs - STAR_OP_RETENTION_MS + COIN_RECONCILE_V1_LIMITS.receiptSafetyMarginMs;
  const lanes: SpinStarLane[] = [];
  for (const result of results) {
    const data = result.data ?? {};
    const requestId = typeof data.requestId === 'string' ? data.requestId : result.id;
    const createdAtMs = Number(data.createdAtMs);
    if (!REQUEST_ID.test(requestId) || requestId !== result.id) {
      log(`skip result=${result.id.slice(0, 12)} reason=request_id_invalid`);
      continue;
    }
    if (!Number.isSafeInteger(createdAtMs) || createdAtMs <= 0 || createdAtMs > nowMs) {
      log(`skip result=${requestId.slice(0, 12)} reason=created_at_invalid value=${String(data.createdAtMs)}`);
      continue;
    }
    if (createdAtMs < oldestAllowedMs) {
      log(`skip result=${requestId.slice(0, 12)} reason=older_than_receipt_retention createdAtMs=${createdAtMs}`);
      continue;
    }
    const deliveries = data.deliveries && typeof data.deliveries === 'object' && !Array.isArray(data.deliveries)
      ? data.deliveries as Record<string, unknown>
      : {};
    for (const lane of ['base', 'premium'] as const) {
      const delivery = deliveries[lane] as Record<string, unknown> | undefined;
      if (!delivery || delivery.state !== 'delivered') continue;
      const giftId = typeof delivery.selectedGiftId === 'string' ? delivery.selectedGiftId : '';
      const amount = COIN_RECONCILE_V1_SPIN_AMOUNTS[giftId];
      if (amount === undefined) continue; // не монетный подарок — не наша забота (Q12)
      lanes.push(Object.freeze({
        requestId, lane, giftId, amount, createdAtMs,
        operationId: spinStarOperationId(requestId, lane),
      }));
    }
  }
  return lanes;
}

export function coinReconcileLedgerOperation(lane: SpinStarLane, nowMs: number): StarOpRequest {
  return Object.freeze({
    opId: lane.operationId,
    delta: lane.amount,
    // Тот же класс, что у прежней материализации спина: grant (не двигает
    // earnedTotal и очки лиги). Источник сверки виден по sourceKind.
    reason: 'level_spin_grant' as const,
    sourceKind: COIN_RECONCILE_V1_SOURCE_KIND,
    sourceId: `${lane.requestId}.${lane.lane}`,
    ruleVersion: 1,
    earnedAtMs: nowMs,
    meta: Object.freeze({ giftId: lane.giftId, lane: lane.lane, reconcile: 'v1' }),
  });
}

/** Чистая функция решения: что поднимать и в каком статусе. */
export function decideCoinReconcile(missing: readonly SpinStarLane[]): Readonly<{
  status: CoinReconcileStatus;
  lanes: readonly SpinStarLane[];
  foundTotal: number;
}> {
  const foundTotal = missing.reduce((total, lane) => total + lane.amount, 0);
  if (missing.length === 0) return Object.freeze({ status: 'nothing_to_raise', lanes: [], foundTotal: 0 });
  if (foundTotal > COIN_RECONCILE_V1_LIMITS.maxRaiseLifetime
    || missing.length > COIN_RECONCILE_V1_LIMITS.maxOperations) {
    return Object.freeze({ status: 'over_cap_review', lanes: [], foundTotal });
  }
  return Object.freeze({ status: 'raised', lanes: missing, foundTotal });
}

export function parseCoinReconcileRecord(raw: unknown): CoinReconcileV1Record | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion !== 1) return null;
  if (value.status !== 'raised' && value.status !== 'nothing_to_raise' && value.status !== 'over_cap_review') return null;
  const raisedBy = Number(value.raisedBy);
  if (!Number.isSafeInteger(raisedBy) || raisedBy < 0) return null;
  const operationIds = Array.isArray(value.operationIds)
    ? value.operationIds.filter((id): id is string => typeof id === 'string')
    : [];
  return Object.freeze({
    schemaVersion: 1,
    status: value.status,
    raisedBy,
    operationIds: Object.freeze(operationIds),
    foundTotal: Math.max(0, Number(value.foundTotal) || 0),
    atMs: Math.max(0, Number(value.atMs) || 0),
  });
}

export type CoinReconcileInput = Readonly<{
  authUid: string;
  stableUid: string;
  nowMs: number;
  clientVisibleBalance: number | null;
}>;

/** Транзакция сверки. Повтор (поле уже есть) — прежний результат без записи. */
export async function runCoinReconcileV1(
  db: admin.firestore.Firestore,
  input: CoinReconcileInput,
): Promise<CoinReconcileV1Response> {
  const { authUid, stableUid, nowMs } = input;
  const userRef = db.collection('users').doc(stableUid);
  const resultsQuery = userRef.collection('level_spin_results').limit(COIN_RECONCILE_V1_LIMITS.maxResultsScanned);
  const receipts = userRef.collection(STAR_OPERATIONS_COLLECTION);
  return db.runTransaction(async (tx) => {
    beginStarLedgerTransactionAttempt(tx);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      console.warn(`${LOG} reject reason=user_missing uid=${stableUid.slice(0, 8)}`);
      throw new HttpsError('failed-precondition', 'coin_reconcile_user_missing');
    }
    const starsNow = normalizeStars(userSnap.data()?.stars);
    const prior = parseCoinReconcileRecord(userSnap.data()?.[COIN_RECONCILE_V1_FIELD]);
    if (prior) {
      console.log(`${LOG} replay uid=${stableUid.slice(0, 8)} status=${prior.status} raisedBy=${prior.raisedBy} balance=${starsNow.balance} seq=${starsNow.seq}`);
      return Object.freeze({
        status: 'replayed' as const,
        raisedBy: prior.raisedBy,
        operationIds: prior.operationIds,
        starsBalance: starsNow.balance,
        starsEarnedTotal: starsNow.earnedTotal,
        starsSeq: starsNow.seq,
      });
    }
    const resultsSnap = await tx.get(resultsQuery);
    const lanes = deliveredSpinStarLanes(
      resultsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> | undefined })),
      nowMs,
      (line) => console.log(`${LOG} ${line}`),
    );
    // Одним getAll за раз (один круг до базы), не чтение в цикле.
    const receiptSnaps = lanes.length > 0
      ? await tx.getAll(...lanes.map((lane) => receipts.doc(lane.operationId)))
      : [];
    const missing = lanes.filter((_lane, index) => !receiptSnaps[index]?.exists);
    const decision = decideCoinReconcile(missing);
    console.log(`${LOG} scan uid=${stableUid.slice(0, 8)} results=${resultsSnap.size} coinLanes=${lanes.length} materialized=${lanes.length - missing.length} missing=${missing.length} foundTotal=${decision.foundTotal} status=${decision.status} serverBalance=${starsNow.balance} clientVisibleBalance=${input.clientVisibleBalance ?? 'none'}`);

    let starsAfter = starsNow;
    let raisedBy = 0;
    if (decision.status === 'raised') {
      const prepared = await prepareStarOperations(
        tx, db, stableUid, userSnap,
        decision.lanes.map((lane) => coinReconcileLedgerOperation(lane, nowMs)),
        {
          nowMs,
          activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
          weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
          authUid,
          deviceId: null,
        },
      );
      const rejected = prepared.outcomes.filter((outcome) => outcome.status !== 'applied');
      if (rejected.length > 0) {
        // Ничего не пишем: сверка «всё или ничего», повтор пройдёт тем же путём.
        console.warn(`${LOG} reject reason=ledger_outcome_not_applied uid=${stableUid.slice(0, 8)} first=${rejected[0]?.opId} status=${rejected[0]?.status} code=${String(rejected[0]?.errorCode ?? null)}`);
        throw new HttpsError('failed-precondition', 'coin_reconcile_ledger_rejected');
      }
      raisedBy = prepared.outcomes.reduce((total, outcome) => total + outcome.appliedDelta, 0);
      const record: CoinReconcileV1Record = Object.freeze({
        schemaVersion: 1, status: 'raised', raisedBy,
        operationIds: Object.freeze(decision.lanes.map((lane) => lane.operationId)),
        foundTotal: decision.foundTotal, atMs: nowMs,
      });
      const result = commitStarOperations(tx, prepared, { [COIN_RECONCILE_V1_FIELD]: record });
      starsAfter = { ...starsNow, balance: result.balance, earnedTotal: result.earnedTotal, seq: result.seq };
      console.log(`${LOG} raised uid=${stableUid.slice(0, 8)} raisedBy=${raisedBy} ops=${decision.lanes.length} balanceBefore=${starsNow.balance} balanceAfter=${result.balance} seq=${result.seq}`);
    } else {
      const record: CoinReconcileV1Record = Object.freeze({
        schemaVersion: 1, status: decision.status, raisedBy: 0, operationIds: Object.freeze([]),
        foundTotal: decision.foundTotal, atMs: nowMs,
      });
      tx.set(userRef, { [COIN_RECONCILE_V1_FIELD]: record }, { merge: true }); // guard-ok: запись внутри транзакции, её фиксирует runTransaction
      console.log(`${LOG} closed uid=${stableUid.slice(0, 8)} status=${decision.status} foundTotal=${decision.foundTotal}`);
    }
    return Object.freeze({
      status: decision.status,
      raisedBy,
      operationIds: decision.status === 'raised' ? decision.lanes.map((lane) => lane.operationId) : [],
      starsBalance: starsAfter.balance,
      starsEarnedTotal: starsAfter.earnedTotal,
      starsSeq: starsAfter.seq,
    });
  });
}

// зачем: Q-COIN (b), координатор 01.10 — разовая серверная сверка монет по
// серверным фактам до 2.0; вызывает сам пользователь (app/coin_reconcile_v1_client.ts).
export const coinReconcileV1 = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<CoinReconcileV1Response> => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    console.warn(`${LOG} reject reason=auth_required`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const startedAt = Date.now();
  const rawClientBalance = Number(request.data?.clientVisibleBalance);
  const clientVisibleBalance = Number.isSafeInteger(rawClientBalance) && rawClientBalance >= 0 ? rawClientBalance : null;
  console.log(`${LOG} enter auth=${authUid.slice(0, 8)} clientVisibleBalance=${clientVisibleBalance ?? 'none'}`);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.ownerStableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  try {
    const response = await runCoinReconcileV1(db, { authUid, stableUid, nowMs: Date.now(), clientVisibleBalance });
    console.log(`${LOG} done uid=${stableUid.slice(0, 8)} status=${response.status} raisedBy=${response.raisedBy} ms=${Date.now() - startedAt}`);
    return response;
  } catch (error) {
    const code = error instanceof HttpsError ? error.code : 'internal';
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} failed uid=${stableUid.slice(0, 8)} code=${code} message=${message} ms=${Date.now() - startedAt}`);
    throw error;
  }
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { getAppSnapshot, patchAppSnapshot } from './app_snapshot_store';
import { callLevelSpinStarComposite } from './community_packs/functionsClient';
import {
  commitPhoneStateNonMonetaryEconomyGrant,
  readPhoneStateStarCreditState,
} from './phone_state_economy_bridge';
import { withStorageLock, type StorageLockLease } from './storage_mutex';
import {
  levelSpinStarCreditAckOperationId,
  hasValidCustomizationRunePurchaseFingerprint,
  hasValidSessionAttemptRuneRecoveryFingerprint,
  parseCustomizationRunePurchaseExactResult,
  parseSessionAttemptRuneRecoveryExactResult,
  hasValidPaidLevelSpinRuneFingerprint,
  parsePaidLevelSpinRuneOperation,
  hasValidDialogExtraRepliesRuneOperationFingerprint,
  parseDialogExtraRepliesRuneOperation,
  sessionAttemptRuneRecoveryOperationId,
  parseLevelSpinStarCreditAckExactResult,
  parseLevelSpinStarCreditExactResult,
  type LevelSpinStarCreditExactResult,
  type CustomizationRunePurchaseExactResultV1,
  type SessionAttemptRuneRecoveryExactResultV1,
  type PaidLevelSpinRuneOperationV1,
  type DialogueExtraRepliesRuneOperationV1,
  hasValidRuneSpendFingerprint,
  parseRuneSpendExactResult,
  runeSpendFingerprint,
  type RuneSpendExactResultV1,
} from '../modules/phone-state/domains/economy';
import {
  practiceRuneSettlementOperationId,
  type PracticeRuneActivity,
} from './practice_rune_earnings';
import {
  paidLevelSpinEnvelopeKey,
  paidLevelSpinEnvelopePrefix,
  parsePaidLevelSpinEnvelope,
} from './level_spin_local_contract';
import { DebugLogger } from './debug-logger';
import { applySuperSundayRuneMultiplier } from '../modules/economy/super_sunday_runes';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const STAR_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
  // v7 (2026-08-29): джекпот рун из спина. Зеркала: modules/phone-state/domains/
  // economy.ts (STAR_CREDIT_AMOUNTS) и functions/src/level_spin_star_grant.ts.
  stars_2000: 2_000,
} as const);

/**
 * зачем (§126 п.7, 04.10): level_spin_star_operation_corrupt ×26 на одном устройстве (1.6.24), а шесть мест
 * бросали эту ошибку молча — неизвестно, где и почему. Печатаем участок, причину, длину и форму записи
 * (имена ключей, version/kind) — без uid и сумм. Ошибка и поведение прежние.
 */
function runeOperationCorrupt(site: string, reason: string, value: unknown, raw: string | null): never {
  const shape = value && typeof value === 'object' && !Array.isArray(value)
    ? { keys: Object.keys(value as Record<string, unknown>).sort().join(',').slice(0, 300),
      version: (value as { version?: unknown }).version ?? null, kind: (value as { kind?: unknown }).kind ?? null }
    : { type: Array.isArray(value) ? 'array' : typeof value };
  console.warn('[RUNE-OP-CORRUPT]', JSON.stringify({ site, reason, rawLength: raw?.length ?? null, ...shape }));
  throw new Error('level_spin_star_operation_corrupt');
}

type LevelSpinStarGiftId = keyof typeof STAR_AMOUNTS;
type LevelSpinStarLane = 'base' | 'premium';
type LevelSpinStarOperation = LevelSpinStarCreditExactResult;
export type PracticeRuneOperation = Readonly<{
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
type PracticeRuneJournalEntry = Readonly<{
  schemaVersion: 'client-practice-rune-journal-entry.v1';
  operation: PracticeRuneOperation;
  accountGeneration: number;
  localRevision: string;
  balanceBefore: number;
  balanceAfter: number;
  result: Readonly<{
    kind: 'practice_rune_credit';
    subjectId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
  }>;
}>;
type LocalRuneOperation = LevelSpinStarOperation
  | PracticeRuneOperation
  | SessionAttemptRuneRecoveryExactResultV1
  | PaidLevelSpinRuneOperationV1
  | DialogueExtraRepliesRuneOperationV1
  | CustomizationRunePurchaseExactResultV1
  // Универсальная трата рун за товар (диалог, подсказка, разбор, набор).
  // До 2026-09-20 эти четыре покупки НЕ списывали ничего — см. комментарий
  // у RuneSpendExactResultV1.
  | RuneSpendExactResultV1;

type LevelSpinStarProjection = Readonly<{
  schemaVersion: 'client-level-spin-star-projection.v3';
  ownerStableId: string;
  operations: readonly LocalRuneOperation[];
  acknowledged: Readonly<Record<string, string>>;
  serverBalance: number;
  serverEarnedTotal: number;
  serverSeq: number;
  /**
   * Q-COIN (a), координатор 01.10, [COIN-DIVERGENCE]: монеты, которые жили только
   * на телефоне и которых нет в серверном кошельке users/{uid}.stars.
   *
   * зачем отдельным полем, а не «max в serverBalance»: при первой квитанции
   * (serverSeq 0 → N) берём БОЛЬШЕЕ из локальной базы и серверного баланса, но
   * если вписать большее прямо в serverBalance, СЛЕДУЮЩАЯ квитанция (seq N+1)
   * законно заменит его серверным числом — и разница пропадёт на втором же
   * начислении. Здесь serverBalance остаётся точной копией сервера (замена по
   * новому seq, защита от позднего ответа — как раньше), а разница живёт рядом
   * и прибавляется к видимому балансу. Снимается только квитанцией серверной
   * сверки coinReconcileV1 (applyCoinReconcileReceiptV1). Поле пишется лишь
   * когда > 0, чтобы прежние проекции на диске не менялись ни байтом.
   */
  unconfirmedLocalLift?: number;
  /** Квитанция coinReconcileV1 уже применена — повтор не снимает разницу дважды. */
  coinReconcileV1Applied?: true;
  /**
   * Вариант (в), диагноз +5000 (05.10): сумма трат (≤ 0), записи которых сняты уплотнением. Сервер о локальных тратах не
   * знает (покупки уходят ему с delta 0, starsBalance — только начисления), поэтому снятая трата обязана остаться в
   * поверх-слое, а не исчезнуть: раньше уплотнение удаляло запись и монеты «возвращались». Отдельным полем, а не в
   * serverBalance: при serverSeq ≠ 0 adoptServerBasis заменяет serverBalance числом сервера и стёр бы «запечённое».
   * Пишется только когда < 0 — проекции без уплотнений на диске не меняются ни байтом.
   *
   * ИНВАРИАНТЫ (opus-ревью 05.10):
   * - в сумму попадают только траты, чей единственный durable-источник — operationStorageKey (C1; конверты платного
   *   спина, журналы, подготовленные и квитанции PhoneState исключены — см. StoredOperationsForOwner);
   * - сервер обязан НИКОГДА не понижать stars без журнала трат (вариант (б)): иначе база − сумма уйдёт ниже нуля и
   *   visibleProjection бросит level_spin_star_balance_invalid (M3);
   * - пока поле есть, никто не передаёт settledSpendOperationIds: «погашенная» сервером свёрнутая трата вычлась бы
   *   дважды (M4, сторож в tests/coin_compaction_logs_contract.test.ts).
   */
  compactedSpendTotal?: number;
}>;

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,80}$/;
const DELIVERY_TOKEN_RE = /^[A-Za-z0-9_-]{16,96}$/;
const MAX_PENDING_STAR_OPERATIONS = 4_096;
const MAX_LOCAL_RUNE_HISTORY = 262_144;
const MAX_ACKNOWLEDGED_RUNE_TOMBSTONES = MAX_LOCAL_RUNE_HISTORY;
const PRACTICE_RUNE_ACTIVITIES: readonly PracticeRuneActivity[] = Object.freeze([
  'lesson', 'vocabulary', 'irregular_verbs', 'flashcards_blitz',
  'flashcards_training', 'mistake_practice', 'speaking_practice',
]);
const PRACTICE_SESSION_KEY_RE = /^[A-Za-z0-9_-]{1,72}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export function levelSpinStarAmount(giftId: string): number {
  const amount = STAR_AMOUNTS[giftId as LevelSpinStarGiftId];
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('level_spin_star_gift_invalid');
  return amount;
}

/**
 * Сумма операции кошелька. Множитель «Супер-воскресенья» — только для игровых источников с плавающей суммой.
 * зачем (Ядро 22.10): экзамен главы (chapterexam_) сервер принимает РОВНО 20 на часть; если множитель вернут, удвоенная
 * сумма была бы отклонена сервером и начисление вечно висело бы в очереди. Поэтому у экзамена сумма фиксирована всегда.
 */
export function levelSpinStarOperationAmountV1(input: Readonly<{
  requestId: string;
  giftId: string;
  promotionEligibility: 'gameplay' | 'excluded_compensation';
  createdAtMs: number;
}>): number {
  const baseAmount = levelSpinStarAmount(input.giftId);
  if (input.promotionEligibility !== 'gameplay' || input.requestId.startsWith('chapterexam_')) return baseAmount;
  return applySuperSundayRuneMultiplier(baseAmount, input.createdAtMs);
}

export function levelSpinStarGrantOutboxKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_grant_outbox_v1:${encodeURIComponent(owner)}`;
}

export function levelSpinStarProjectionKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_projection_v1:${encodeURIComponent(owner)}`;
}

export function levelSpinStarPreparedKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('level_spin_star_owner_invalid');
  return `level_spin_star_prepared_v1:${encodeURIComponent(owner)}`;
}

function operationIdFor(requestId: string, lane: LevelSpinStarLane): string {
  return `level_spin:${requestId}.${lane}`;
}

function operationStorageKey(ownerStableId: string, operationId: string): string {
  return `level_spin_star_operation_v1:${encodeURIComponent(ownerStableId)}:${encodeURIComponent(operationId)}`;
}

export function practiceRuneJournalStorageKey(ownerStableId: string, operationId: string): string {
  return `practice_rune_journal_v1:${encodeURIComponent(ownerStableId)}:${encodeURIComponent(operationId)}`;
}

export function sessionAttemptRuneOperationStorageKey(ownerStableId: string, operationId: string): string {
  return operationStorageKey(ownerStableId, operationId);
}

export function practiceRuneOperationStorageKey(ownerStableId: string, operationId: string): string {
  return operationStorageKey(ownerStableId, operationId);
}

export function paidLevelSpinRuneOperationStorageKey(ownerStableId: string, operationId: string): string {
  return operationStorageKey(ownerStableId, operationId);
}

async function fingerprintFor(input: Readonly<{
  ownerStableId: string; requestId: string; lane: LevelSpinStarLane; deliveryToken?: string;
  giftId: LevelSpinStarGiftId; amount: number;
  promotionEligibility?: 'gameplay' | 'excluded_compensation';
}>): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    requestId: input.requestId,
    lane: input.lane,
    deliveryToken: input.deliveryToken ?? null,
    giftId: input.giftId,
    amount: input.amount,
    ...(input.promotionEligibility === undefined
      ? {}
      : { promotionEligibility: input.promotionEligibility }),
    reason: 'level_spin_star_reward',
  }));
}

async function fingerprintForSessionAttemptRecovery(input: Readonly<{
  ownerStableId: string;
  accountGeneration: number;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  balanceBefore: number;
  balanceAfter: number;
}>): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify({
    schemaVersion: 1,
    ownerStableId: input.ownerStableId,
    accountGeneration: input.accountGeneration,
    sessionId: input.sessionId,
    questionId: input.questionId,
    recoveryOrdinal: input.recoveryOrdinal,
    runeDelta: -25,
    attemptsGranted: 3,
    balanceBefore: input.balanceBefore,
    balanceAfter: input.balanceAfter,
    reason: 'restore_all_session_attempts',
  }));
}

function parseStarOperation(value: unknown, ownerStableId: string): LevelSpinStarOperation | null {
  const entry = parseLevelSpinStarCreditExactResult(value);
  return entry?.ownerStableId === ownerStableId ? entry : null;
}

function parsePracticeRuneOperation(value: unknown, ownerStableId: string): PracticeRuneOperation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const operation = value as Partial<PracticeRuneOperation>;
  const activity = operation.activity as PracticeRuneActivity;
  const sessionKey = operation.sessionKey;
  const completionOrdinal = operation.completionOrdinal;
  const expectedKeys = [
    'schemaVersion', 'operationId', 'ownerStableId', 'activity', 'sessionKey',
    'completionOrdinal', 'amount', 'reason', 'createdAtMs', 'requestFingerprint',
  ];
  const actualKeys = Object.keys(operation).sort();
  if (actualKeys.length !== expectedKeys.length
    || ![...expectedKeys].sort().every((key, index) => actualKeys[index] === key)
    || operation.schemaVersion !== 'client-practice-rune-operation.v1'
    || typeof operation.operationId !== 'string'
    || typeof operation.ownerStableId !== 'string'
    || operation.ownerStableId !== ownerStableId
    || operation.ownerStableId.includes('/')
    || operation.ownerStableId.length > 160
    || !PRACTICE_RUNE_ACTIVITIES.includes(activity)
    || typeof sessionKey !== 'string'
    || !PRACTICE_SESSION_KEY_RE.test(sessionKey)
    || !Number.isSafeInteger(completionOrdinal)
    || Number(completionOrdinal) < 1
    || !Number.isSafeInteger(operation.amount)
    || Number(operation.amount) < 1
    || operation.reason !== 'practice_session_reward'
    || !Number.isSafeInteger(operation.createdAtMs)
    || Number(operation.createdAtMs) < 0
    || typeof operation.requestFingerprint !== 'string'
    || !SHA256_RE.test(operation.requestFingerprint)) return null;

  let canonicalOperationId: string;
  try {
    canonicalOperationId = practiceRuneSettlementOperationId({
      activity,
      sessionKey,
      completionOrdinal: Number(completionOrdinal),
    });
  } catch {
    return null;
  }
  // Receipts written before the 2026-08-27 opId fix can still be present in
  // AsyncStorage. Their bytes are otherwise valid: operationId is not part of
  // the fingerprint. Normalize only these two historical forms to the current
  // id so an update can replay them exactly once instead of raising the generic
  // practice_rune_operation_invalid error.
  const knownOperationId = operation.operationId === canonicalOperationId
    || operation.operationId === `practice_rune:${activity}_${sessionKey}_${completionOrdinal}`
    || operation.operationId === `practice_rune:${activity}:${sessionKey}:${completionOrdinal}`;
  if (!knownOperationId) return null;
  return operation.operationId === canonicalOperationId
    ? operation as PracticeRuneOperation
    : Object.freeze({ ...operation, operationId: canonicalOperationId }) as PracticeRuneOperation;
}

function parsePracticeRuneJournalEntry(
  value: unknown,
  ownerStableId: string,
): PracticeRuneJournalEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Partial<PracticeRuneJournalEntry>;
  const operation = parsePracticeRuneOperation(entry.operation, ownerStableId);
  const rawOperation = entry.operation as Partial<PracticeRuneOperation> | undefined;
  const rawOperationId = typeof rawOperation?.operationId === 'string'
    ? rawOperation.operationId
    : null;
  const result = entry.result;
  if (entry.schemaVersion !== 'client-practice-rune-journal-entry.v1'
    || !operation
    || rawOperationId === null
    || !Number.isSafeInteger(entry.accountGeneration) || Number(entry.accountGeneration) < 0
    || (entry.localRevision !== `${entry.accountGeneration}:${operation.createdAtMs}:${rawOperationId}`
      && entry.localRevision !== `${entry.accountGeneration}:${operation.createdAtMs}:${operation.operationId}`)
    || !Number.isSafeInteger(entry.balanceBefore) || Number(entry.balanceBefore) < 0
    || !Number.isSafeInteger(entry.balanceAfter) || Number(entry.balanceAfter) < 0
    || Number(entry.balanceAfter) !== Number(entry.balanceBefore) + operation.amount
    || !result || result.kind !== 'practice_rune_credit'
    || (result.subjectId !== rawOperationId && result.subjectId !== operation.operationId)
    || result.amount !== operation.amount
    || result.balanceBefore !== entry.balanceBefore
    || result.balanceAfter !== entry.balanceAfter) return null;
  if (rawOperationId === operation.operationId) return entry as PracticeRuneJournalEntry;
  return Object.freeze({
    ...entry,
    operation,
    localRevision: `${entry.accountGeneration}:${operation.createdAtMs}:${operation.operationId}`,
    result: Object.freeze({ ...result, subjectId: operation.operationId }),
  }) as PracticeRuneJournalEntry;
}

function practiceRuneJournalEntryFor(
  operation: PracticeRuneOperation,
  accountGeneration: number,
  balanceBefore: number,
): PracticeRuneJournalEntry {
  const balanceAfter = balanceBefore + operation.amount;
  if (!Number.isSafeInteger(accountGeneration) || accountGeneration < 0
    || !Number.isSafeInteger(balanceBefore) || balanceBefore < 0
    || !Number.isSafeInteger(balanceAfter) || balanceAfter < 0) {
    throw new Error('practice_rune_balance_invalid');
  }
  return Object.freeze({
    schemaVersion: 'client-practice-rune-journal-entry.v1',
    operation,
    accountGeneration,
    localRevision: `${accountGeneration}:${operation.createdAtMs}:${operation.operationId}`,
    balanceBefore,
    balanceAfter,
    result: Object.freeze({
      kind: 'practice_rune_credit',
      subjectId: operation.operationId,
      amount: operation.amount,
      balanceBefore,
      balanceAfter,
    }),
  });
}

function parseLocalRuneOperation(value: unknown, ownerStableId: string): LocalRuneOperation | null {
  return parseStarOperation(value, ownerStableId)
    ?? parsePracticeRuneOperation(value, ownerStableId)
    ?? (() => {
      const entry = parseSessionAttemptRuneRecoveryExactResult(value);
      return entry?.ownerStableId === ownerStableId ? entry : null;
    })()
    ?? (() => {
      const entry = parsePaidLevelSpinRuneOperation(value);
      return entry?.ownerStableId === ownerStableId ? entry : null;
    })()
    ?? (() => {
      const entry = parseDialogExtraRepliesRuneOperation(value);
      return entry?.ownerStableId === ownerStableId ? entry : null;
    })()
    ?? (() => {
      const entry = parseCustomizationRunePurchaseExactResult(value);
      return entry?.ownerStableId === ownerStableId ? entry : null;
    })()
    ?? (() => {
      const entry = parseRuneSpendExactResult(value);
      return entry?.ownerStableId === ownerStableId ? entry : null;
    })();
}

async function hasValidPracticeRuneFingerprint(operation: PracticeRuneOperation): Promise<boolean> {
  const expected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: operation.ownerStableId,
      activity: operation.activity,
      sessionKey: operation.sessionKey,
      completionOrdinal: operation.completionOrdinal,
      amount: operation.amount,
      reason: 'practice_session_reward',
      createdAtMs: operation.createdAtMs,
    }),
  );
  if (expected === operation.requestFingerprint) return true;
  // Migration only: operations written by the broken 2026-08-28 build did
  // not bind createdAtMs. Keep those already-durable receipts readable, while
  // every newly-created receipt uses the exact-byte fingerprint above.
  const legacyExpected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: operation.ownerStableId,
      activity: operation.activity,
      sessionKey: operation.sessionKey,
      completionOrdinal: operation.completionOrdinal,
      amount: operation.amount,
      reason: 'practice_session_reward',
    }),
  );
  return legacyExpected === operation.requestFingerprint;
}

async function hasValidFingerprint(operation: LevelSpinStarOperation): Promise<boolean> {
  const expected = await fingerprintFor({
    ownerStableId: operation.ownerStableId,
    requestId: operation.requestId,
    lane: operation.lane,
    ...(operation.deliveryToken ? { deliveryToken: operation.deliveryToken } : {}),
    giftId: operation.giftId,
    amount: operation.amount,
    // Keep the fingerprint inputs identical for enqueue and recovery so
    // repeated projection scans remain deterministic.
    ...(operation.promotionEligibility === undefined
      ? {}
      : { promotionEligibility: operation.promotionEligibility }),
  });
  return expected === operation.requestFingerprint;
}

async function hasValidLocalRuneFingerprint(operation: LocalRuneOperation): Promise<boolean> {
  if (operation.schemaVersion === 'client-level-spin-star-operation.v1') {
    return hasValidFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-practice-rune-operation.v1') {
    return hasValidPracticeRuneFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-session-attempt-recovery-rune-operation.v1') {
    return hasValidSessionAttemptRuneRecoveryFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-paid-level-spin-rune-operation.v1') {
    return hasValidPaidLevelSpinRuneFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-dialog-extra-replies-rune-operation.v1') {
    return hasValidDialogExtraRepliesRuneOperationFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-customization-rune-operation.v1') {
    return hasValidCustomizationRunePurchaseFingerprint(operation);
  }
  if (operation.schemaVersion === 'client-rune-spend-operation.v1') {
    return hasValidRuneSpendFingerprint(operation);
  }
  return false;
}

function parseOutbox(raw: string | null, ownerStableId: string): LevelSpinStarOperation[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_PENDING_STAR_OPERATIONS) {
      throw new Error('level_spin_star_outbox_corrupt');
    }
    return parsed.map((value) => {
      const operation = parseStarOperation(value, ownerStableId);
      if (!operation) throw new Error('level_spin_star_outbox_corrupt');
      return operation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'level_spin_star_outbox_corrupt') throw error;
    throw new Error('level_spin_star_outbox_corrupt');
  }
}

async function readOutbox(ownerStableId: string): Promise<LevelSpinStarOperation[]> {
  return parseOutbox(await AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)), ownerStableId);
}

function emptyProjection(ownerStableId: string): LevelSpinStarProjection {
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-projection.v3',
    ownerStableId,
    operations: Object.freeze([]),
    acknowledged: Object.freeze({}),
    serverBalance: 0,
    serverEarnedTotal: 0,
    serverSeq: 0,
  });
}

function parseProjection(raw: string | null, ownerStableId: string): LevelSpinStarProjection {
  if (raw === null) return emptyProjection(ownerStableId);
  try {
    const value = JSON.parse(raw) as Omit<Partial<LevelSpinStarProjection>, 'schemaVersion'> & {
      schemaVersion?: unknown;
      serverBalanceFloor?: unknown;
      serverEarnedFloor?: unknown;
    };
    const supportedSchema = value?.schemaVersion === 'client-level-spin-star-projection.v2'
      || value?.schemaVersion === 'client-level-spin-star-projection.v3';
    if (!supportedSchema
      || value.ownerStableId !== ownerStableId
      || !Array.isArray(value.operations)
      || value.operations.length > MAX_LOCAL_RUNE_HISTORY
      || !value.acknowledged || typeof value.acknowledged !== 'object' || Array.isArray(value.acknowledged)
      || Object.keys(value.acknowledged).length > MAX_ACKNOWLEDGED_RUNE_TOMBSTONES
      || !Number.isSafeInteger(value.serverBalance ?? (value as { serverBalanceFloor?: unknown }).serverBalanceFloor)
      || Number(value.serverBalance ?? (value as { serverBalanceFloor?: unknown }).serverBalanceFloor) < 0
      || !Number.isSafeInteger(value.serverEarnedTotal ?? (value as { serverEarnedFloor?: unknown }).serverEarnedFloor)
      || Number(value.serverEarnedTotal ?? (value as { serverEarnedFloor?: unknown }).serverEarnedFloor) < 0
      || !Number.isSafeInteger(value.serverSeq ?? 0) || Number(value.serverSeq ?? 0) < 0
      || !Number.isSafeInteger(value.unconfirmedLocalLift ?? 0) || Number(value.unconfirmedLocalLift ?? 0) < 0
      || (value.coinReconcileV1Applied !== undefined && value.coinReconcileV1Applied !== true)
      || (value.compactedSpendTotal !== undefined
        && (!Number.isSafeInteger(value.compactedSpendTotal) || Number(value.compactedSpendTotal) > 0))) {
      throw new Error('level_spin_star_projection_corrupt');
    }
    const legacyOperationAliases = new Map<string, string>();
    const operations = value.operations.map((candidate) => {
      const operation = value.schemaVersion === 'client-level-spin-star-projection.v2'
        ? parseStarOperation(candidate, ownerStableId)
        : parseLocalRuneOperation(candidate, ownerStableId);
      const rawOperationId = typeof (candidate as { operationId?: unknown }).operationId === 'string'
        ? (candidate as { operationId: string }).operationId
        : null;
      if (operation && rawOperationId !== null && rawOperationId !== operation.operationId) {
        legacyOperationAliases.set(rawOperationId, operation.operationId);
      }
      return operation;
    });
    if (operations.some((candidate) => !candidate)) throw new Error('level_spin_star_projection_corrupt');
    const unique = new Map<string, LocalRuneOperation>();
    for (const operation of operations as LocalRuneOperation[]) {
      const prior = unique.get(operation.operationId);
      if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      unique.set(operation.operationId, operation);
    }
    const acknowledged: Record<string, string> = {};
    for (const [operationId, fingerprint] of Object.entries(value.acknowledged)) {
      if (typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) {
        throw new Error('level_spin_star_projection_corrupt');
      }
      const normalizedOperationId = legacyOperationAliases.get(operationId) ?? operationId;
      const operation = unique.get(normalizedOperationId);
      const durablePracticeTombstone = !operation && operationId.startsWith('practice_rune:');
      if ((!operation && !durablePracticeTombstone)
        || (operation
          && operation.schemaVersion !== 'client-level-spin-star-operation.v1'
          && operation.schemaVersion !== 'client-practice-rune-operation.v1')
        || (operation && operation.requestFingerprint !== fingerprint)) {
        throw new Error('level_spin_star_projection_corrupt');
      }
      if (acknowledged[normalizedOperationId]
        && acknowledged[normalizedOperationId] !== fingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      acknowledged[normalizedOperationId] = fingerprint;
    }
    return Object.freeze({
      schemaVersion: 'client-level-spin-star-projection.v3',
      ownerStableId,
      operations: Object.freeze([...unique.values()].sort((left, right) => left.operationId.localeCompare(right.operationId))),
      acknowledged: Object.freeze(acknowledged),
      serverBalance: Number(value.serverBalance ?? value.serverBalanceFloor),
      serverEarnedTotal: Number(value.serverEarnedTotal ?? value.serverEarnedFloor),
      serverSeq: Number(value.serverSeq ?? 0),
      ...(Number(value.unconfirmedLocalLift ?? 0) > 0
        ? { unconfirmedLocalLift: Number(value.unconfirmedLocalLift) } : {}),
      ...(value.coinReconcileV1Applied === true ? { coinReconcileV1Applied: true as const } : {}),
      ...(Number(value.compactedSpendTotal ?? 0) < 0
        ? { compactedSpendTotal: Number(value.compactedSpendTotal) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'level_spin_star_projection_corrupt'
      || error.message === 'level_spin_star_request_conflict'
    )) throw error;
    throw new Error('level_spin_star_projection_corrupt');
  }
}

function parsePrepared(raw: string | null, ownerStableId: string): LocalRuneOperation[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_PENDING_STAR_OPERATIONS) {
      throw new Error('level_spin_star_prepared_corrupt');
    }
    return parsed.map((candidate) => {
      const operation = parseLocalRuneOperation(candidate, ownerStableId);
      if (!operation) throw new Error('level_spin_star_prepared_corrupt');
      return operation;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'level_spin_star_prepared_corrupt') throw error;
    throw new Error('level_spin_star_prepared_corrupt');
  }
}

/** v3.1: какие возвращённые конверты уже напечатаны в этом запуске (в памяти процесса, не durable). */
const refundedEnvelopeLoggedThisLaunch = new Set<string>();

function compactedSpendTotalOf(projection: Readonly<{ compactedSpendTotal?: number }>): number {
  return Math.min(0, Math.trunc(projection.compactedSpendTotal ?? 0));
}

function unacknowledgedTotal(projection: LevelSpinStarProjection): number {
  // зачем (вариант (в)): снятые уплотнением траты по-прежнему вычитаются — одной суммой вместо записей.
  return compactedSpendTotalOf(projection) + projection.operations.reduce((total, operation) => (
    operation.schemaVersion === 'client-level-spin-star-operation.v1'
      ? projection.acknowledged[operation.operationId] === operation.requestFingerprint
        ? total
        : total + operation.amount
      : operation.schemaVersion === 'client-practice-rune-operation.v1'
        ? projection.acknowledged[operation.operationId] === operation.requestFingerprint
          ? total
          : total + operation.amount
        : total + operation.runeDelta
  ), 0);
}

/**
 * Только для лога: из чего складывается неподтверждённая разница — по схемам операций (число, сумма, возраст
 * самой старой). Без сумм нельзя понять, какие траты ещё ждут подтверждения сервера и не застряли ли они.
 */
function unacknowledgedBreakdown(
  projection: LevelSpinStarProjection,
  nowMs: number,
): Record<string, { count: number; amount: number; oldestAgeMin: number }> {
  const out: Record<string, { count: number; amount: number; oldestAgeMin: number }> = {};
  for (const operation of projection.operations) {
    const isGrant = operation.schemaVersion === 'client-level-spin-star-operation.v1'
      || operation.schemaVersion === 'client-practice-rune-operation.v1';
    if (isGrant && projection.acknowledged[operation.operationId] === operation.requestFingerprint) continue;
    const amount = isGrant ? operation.amount : (operation as { runeDelta: number }).runeDelta;
    const ageMin = Math.max(0, Math.round((nowMs - operation.createdAtMs) / 60_000));
    const row = out[operation.schemaVersion] ?? { count: 0, amount: 0, oldestAgeMin: 0 };
    out[operation.schemaVersion] = {
      count: row.count + 1,
      amount: row.amount + amount,
      oldestAgeMin: Math.max(row.oldestAgeMin, ageMin),
    };
  }
  const compacted = compactedSpendTotalOf(projection);
  if (compacted < 0) out.compacted_spend_total = { count: 0, amount: compacted, oldestAgeMin: 0 };
  return out;
}

/**
 * Только для лога [COIN-COMPACTION]: что снимает уплотнение трат и как от этого меняется видимый баланс. «После» —
 * расчёт на копии (записи сняты, их сумма перенесена в compactedSpendTotal), ничего не пишется. Видимый баланс до и
 * после обязан совпасть; расхождение = утечка. Подсчёт не имеет права уронить восстановление: сбой → причина в строке.
 */
function describeSpendCompaction(
  projection: LevelSpinStarProjection,
  stale: readonly LocalRuneOperation[],
  keptOperationId: string | null,
): Record<string, unknown> {
  const removedIds = new Set(stale.map((operation) => operation.operationId));
  const removed = stale.map((operation) => ({
    id: operation.operationId,
    kind: (operation as { kind?: unknown }).kind ?? operation.schemaVersion,
    runeDelta: (operation as { runeDelta?: unknown }).runeDelta ?? null,
  }));
  const removedSum = removed.reduce((sum, row) => sum + (typeof row.runeDelta === 'number' ? row.runeDelta : 0), 0);
  let visibleBefore: number | string;
  let visibleAfter: number | string;
  try {
    visibleBefore = visibleProjection(projection).balance;
  } catch (error) {
    visibleBefore = `error:${error instanceof Error ? error.message : String(error)}`;
  }
  const compactedSpendTotalBefore = compactedSpendTotalOf(projection);
  const compactedSpendTotalAfter = compactedSpendTotalBefore + removedSum;
  try {
    visibleAfter = visibleProjection(Object.freeze({
      ...projection,
      compactedSpendTotal: compactedSpendTotalAfter,
      operations: Object.freeze(projection.operations.filter((operation) => !removedIds.has(operation.operationId))),
    })).balance;
  } catch (error) {
    visibleAfter = `error:${error instanceof Error ? error.message : String(error)}`;
  }
  return {
    serverSeq: projection.serverSeq,
    removedCount: removed.length,
    removedSum,
    removed,
    keptOperationId,
    serverBalanceBefore: projection.serverBalance,
    serverBalanceAfter: projection.serverBalance,
    compactedSpendTotalBefore,
    compactedSpendTotalAfter,
    visibleBefore,
    visibleAfter,
  };
}

function unacknowledgedPracticeEarnedTotal(projection: LevelSpinStarProjection): number {
  return projection.operations.reduce((total, operation) => (
    operation.schemaVersion === 'client-practice-rune-operation.v1'
      && projection.acknowledged[operation.operationId] !== operation.requestFingerprint
      ? total + operation.amount
      : total
  ), 0);
}

function visibleProjection(projection: LevelSpinStarProjection): Readonly<{ balance: number; earnedTotal: number }> {
  const overlay = unacknowledgedTotal(projection);
  const balance = projection.serverBalance + unconfirmedLiftOf(projection) + overlay;
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('level_spin_star_balance_invalid');
  return Object.freeze({
    balance,
    // Practice is earned progress; gifts and purchases are balance-only.
    earnedTotal: projection.serverEarnedTotal + unacknowledgedPracticeEarnedTotal(projection),
  });
}

function unconfirmedLiftOf(projection: Readonly<{ unconfirmedLocalLift?: number }>): number {
  return Math.max(0, Math.trunc(projection.unconfirmedLocalLift ?? 0));
}

/** Пишет разницу только когда > 0 — проекции без разницы остаются байт в байт прежними. */
function withUnconfirmedLift(
  projection: LevelSpinStarProjection,
  lift: number,
): LevelSpinStarProjection {
  const { unconfirmedLocalLift: _previous, ...rest } = projection;
  return Object.freeze(lift > 0 ? { ...rest, unconfirmedLocalLift: lift } : rest);
}

export type CoinBasisPath = 'sync_ack' | 'phone_state_ack' | 'merge_server_stars' | 'practice_ack' | 'reconcile_v1';

/**
 * Q-COIN (a), координатор 01.10: первая серверная квитанция при НЕподтверждённой
 * локальной базе (serverSeq 0) больше не заменяет монеты серверными.
 *
 * `localBasisAfter` — локальная база ПОСЛЕ того, что эта квитанция подтвердила
 * (база + разница + суммы операций, чей overlay квитанция снимает). Возвращает
 * новую пару: serverBalance = точный серверный баланс, разница = насколько
 * локальная база выше. Видимое = max(локальное, серверное) — ровно как путь
 * практики. При serverSeq > 0 база подтверждена: сервер заменяет баланс как
 * раньше (законное понижение тратами, тест «exact materialization»), а уже
 * накопленная разница переносится без изменений.
 */
function adoptServerBasis(input: Readonly<{
  path: CoinBasisPath;
  ownerStableId: string;
  currentSeq: number;
  currentLift: number;
  localBasisAfter: number;
  observedBalance: number;
  observedSeq: number;
}>): Readonly<{ serverBalance: number; lift: number }> {
  if (input.currentSeq !== 0) {
    return Object.freeze({ serverBalance: input.observedBalance, lift: input.currentLift });
  }
  const lift = Math.max(0, input.localBasisAfter - input.observedBalance);
  DebugLogger.info('[COIN-DIVERGENCE] basis:first_server_observation', JSON.stringify({
    path: input.path,
    owner: input.ownerStableId.slice(0, 8),
    localBasisAfter: input.localBasisAfter,
    serverBalance: input.observedBalance,
    serverSeq: input.observedSeq,
    chosen: lift > 0 ? 'local_kept_as_lift' : 'server',
    lift,
  }));
  return Object.freeze({ serverBalance: input.observedBalance, lift });
}

function withOperations(
  projection: LevelSpinStarProjection,
  operations: readonly LocalRuneOperation[],
): LevelSpinStarProjection {
  const merged = new Map(projection.operations.map((operation) => [operation.operationId, operation]));
  for (const operation of operations) {
    const prior = merged.get(operation.operationId);
    if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
      throw new Error('level_spin_star_request_conflict');
    }
    merged.set(operation.operationId, operation);
  }
  return Object.freeze({
    ...projection,
    operations: Object.freeze([...merged.values()].sort((left, right) => left.operationId.localeCompare(right.operationId))),
  });
}

// зачем (владелец, 2026-09-02, письмо «level_spin_star_projection_corrupt» из
// practice_runes): прежняя версия требовала, чтобы ВСЕ траты рун сошлись в один
// и тот же восстановленный баланс, иначе бросала corrupt. Инвариант невыполним
// на живом аккаунте: траты (покупка аватарки, платный спин, пересдача) никогда
// не компактятся и копятся навсегда, а их balanceBefore записан в базисе того
// момента. Первый же ack сервера двигает serverBalance — и старая трата даёт
// один candidate, новая другой. Практика падала на observeCurrentSnapshot и
// РУНЫ ЗА СЕССИЮ НЕ НАЧИСЛЯЛИСЬ ВООБЩЕ (класс «награду показали, но не начислили»).
// Теперь истина — САМАЯ СВЕЖАЯ трата: её balanceBefore единственный записан в
// актуальном базисе, старые устарели по определению, а не «испорчены».
function inferredServerBalanceFromRecoveryOperations(projection: LevelSpinStarProjection): number | null {
  const ordered = [...projection.operations].sort((left, right) => (
    left.createdAtMs - right.createdAtMs || left.operationId.localeCompare(right.operationId)
  ));
  // зачем (вариант (в)): balanceBefore свежей траты уже учитывал снятые уплотнением траты — их сумма входит в overlay.
  let localOverlayBefore = compactedSpendTotalOf(projection);
  let inferred: number | null = null;
  let inferredFromOperationId: string | null = null;
  let divergentCount = 0;
  for (const operation of ordered) {
    if (operation.schemaVersion === 'client-level-spin-star-operation.v1'
      || operation.schemaVersion === 'client-practice-rune-operation.v1') {
      if (projection.acknowledged[operation.operationId] !== operation.requestFingerprint) {
        localOverlayBefore += operation.amount;
      }
      continue;
    }
    const candidate = operation.balanceBefore - localOverlayBefore;
    if (!Number.isSafeInteger(candidate) || candidate < 0) {
      // Отрицательный/нецелый кандидат — трата старше текущего базиса: её
      // balanceBefore меньше накопленного overlay. Это не порча, а устаревание.
      // Пропускаем: свежая трата ниже по списку даст корректное значение.
      DebugLogger.info('level_spin_star_grants:inferred_candidate_stale', JSON.stringify({
        operationId: operation.operationId,
        schemaVersion: operation.schemaVersion,
        balanceBefore: operation.balanceBefore,
        localOverlayBefore,
        candidate,
        serverSeq: projection.serverSeq,
        serverBalance: projection.serverBalance,
      }));
      localOverlayBefore += operation.runeDelta;
      continue;
    }
    if (inferred !== null && inferred !== candidate) divergentCount += 1;
    inferred = candidate;
    inferredFromOperationId = operation.operationId;
    localOverlayBefore += operation.runeDelta;
  }
  if (divergentCount > 0) {
    // Раньше здесь был throw. Расхождение ожидаемо и само по себе не порча —
    // логируем, чтобы аномальные объёмы были видны, и берём свежее значение.
    DebugLogger.info('level_spin_star_grants:inferred_divergent', JSON.stringify({
      divergentCount,
      inferred,
      inferredFromOperationId,
      operations: ordered.length,
      serverSeq: projection.serverSeq,
      serverBalance: projection.serverBalance,
    }));
  }
  return inferred;
}

function observeCurrentSnapshot(projection: LevelSpinStarProjection): LevelSpinStarProjection {
  const progress = getAppSnapshot().progress;
  // зачем (владелец 01.10, «сперва логи»): расхождение монет — на холодном старте
  // progress.stars публиковался 0 при едином кошельке 9830. Подозрение: пересчёт
  // шёл, пока снимок прогресса ещё не поднят, и без него проекция = 0.
  if (!progress) {
    DebugLogger.info('[COIN-DIVERGENCE] observe:no_progress_snapshot', JSON.stringify({
      serverBalance: projection.serverBalance, serverSeq: projection.serverSeq,
      operations: projection.operations.length, unacknowledged: unacknowledgedTotal(projection),
    }));
    return projection;
  }
  const visibleBalance = Math.max(0, Math.trunc(progress.stars ?? 0));
  const visibleEarned = Math.max(0, Math.trunc(progress.starsEarnedTotal ?? 0));
  const inferredServerBalance = inferredServerBalanceFromRecoveryOperations(projection);
  // зачем (владелец, 2026-09-02): здесь тоже был throw — при serverSeq === 0 и
  // расхождении с восстановленным балансом. Он ронял начисление рун за практику
  // целиком. Расхождение решаем в пользу БОЛЬШЕГО значения: занизить баланс —
  // отнять у человека честно заработанное, а завысить нельзя, потому что оба
  // числа получены из его же локальных записей.
  if (projection.serverSeq === 0
    && inferredServerBalance !== null
    && projection.serverBalance !== 0
    && projection.serverBalance !== inferredServerBalance) {
    DebugLogger.info('level_spin_star_grants:observe_seq0_mismatch', JSON.stringify({
      serverBalance: projection.serverBalance,
      inferredServerBalance,
      visibleBalance,
      operations: projection.operations.length,
    }));
  }
  return Object.freeze({
    ...projection,
    serverBalance: projection.serverSeq === 0
      ? inferredServerBalance !== null
        ? Math.max(projection.serverBalance, inferredServerBalance)
        : Math.max(
            projection.serverBalance,
            Math.max(0, visibleBalance - unacknowledgedTotal(projection)),
          )
      : projection.serverBalance,
    serverEarnedTotal: Math.max(
      projection.serverEarnedTotal,
      Math.max(0, visibleEarned - unacknowledgedPracticeEarnedTotal(projection)),
    ),
  });
}

function publishProjection(token: AccountGenerationToken, projection: LevelSpinStarProjection): void {
  if (!isCurrentAccountGeneration(token, projection.ownerStableId)) {
    DebugLogger.info('[COIN-DIVERGENCE] publish:skip_stale_generation', JSON.stringify({ owner: projection.ownerStableId.slice(0, 8) }));
    return;
  }
  const visible = visibleProjection(projection);
  const before = getAppSnapshot().progress;
  // зачем (владелец 01.10, «сперва логи»): каждая публикация печатает, ЧТО было в
  // снимке, ЧТО пришло из проекции и откуда (serverBalance/serverSeq/операции),
  // и кто позвал — чтобы найти публикацию, которая затирает 9830 нулём.
  if (!before || before.stars !== visible.balance) {
    DebugLogger.info('[COIN-DIVERGENCE] publish', JSON.stringify({
      owner: projection.ownerStableId.slice(0, 8),
      snapshotStars: before ? before.stars ?? null : 'no_progress',
      snapshotSource: before ? (before as { source?: unknown }).source ?? null : null,
      nextStars: visible.balance,
      serverBalance: projection.serverBalance,
      serverSeq: projection.serverSeq,
      operations: projection.operations.length,
      unacknowledged: unacknowledgedTotal(projection),
      // зачем (Сверка 05.10: «serverBalance 10315, unacknowledged −8470» после повышения ранга): из чего состоит разница —
      // какие траты ждут подтверждения сервера, сколько и как давно; застрявшая трата видна по возрасту.
      unacknowledgedBySchema: unacknowledgedBreakdown(projection, Date.now()),
      dropToZero: Boolean(before && (before.stars ?? 0) > 0 && visible.balance === 0),
      caller: (new Error().stack ?? '').split('\n').slice(2, 5).map((line) => line.trim()).join(' <- '),
    }));
  }
  patchAppSnapshot((current) => current.progress ? (
    // зачем (владелец, 2026-08-24, «цифра рун постоянно прыгает»): публикация
    // зовётся часто (recover, sync, каждое начисление) и раньше ВСЕГДА создавала
    // новый объект progress с updatedAt: Date.now(). shallowPatchChanged сравнивает
    // секции по ссылке, поэтому будились ВСЕ подписчики снапшота на каждой
    // публикации — лишние ре-рендеры Главной без единого изменения числа.
    // Руны те же -> патча нет.
    current.progress.stars === visible.balance
    && current.progress.starsEarnedTotal === visible.earnedTotal
  ) ? {} : {
    progress: {
      ...current.progress,
      source: 'local',
      updatedAt: Date.now(),
      stars: visible.balance,
      starsEarnedTotal: visible.earnedTotal,
    },
  } : {});
}

type RowVerdict<T> =
  | Readonly<{ kind: 'skip' }>
  | Readonly<{ kind: 'ok'; value: T }>
  | Readonly<{ kind: 'fail'; fail: () => never }>;
const SKIP_ROW: RowVerdict<never> = Object.freeze({ kind: 'skip' });
// Сколько проверок отпечатков идёт одновременно: при истории до MAX_LOCAL_RUNE_HISTORY строк неограниченный
// параллелизм дал бы всплеск памяти и вызовов через мост (ревью opus 04.10).
const VERIFY_BATCH_SIZE = 32;

/**
 * Проверяет строки пачками параллельно, но решает строго в исходном порядке: исключение или отказ строки
 * раньше по порядку всегда побеждает более позднюю строку — как было при проверке по одной.
 */
async function verifyRowsInOrder<R, T>(
  rows: readonly R[],
  check: (row: R) => Promise<RowVerdict<T>>,
): Promise<T[]> {
  const values: T[] = [];
  for (let start = 0; start < rows.length; start += VERIFY_BATCH_SIZE) {
    const settled = await Promise.all(rows.slice(start, start + VERIFY_BATCH_SIZE).map((row) => check(row).then(
      (verdict) => ({ threw: false as const, verdict }),
      (error: unknown) => ({ threw: true as const, error }),
    )));
    for (const item of settled) {
      if (item.threw) throw item.error;
      if (item.verdict.kind === 'skip') continue;
      if (item.verdict.kind === 'fail') return item.verdict.fail();
      values.push(item.verdict.value);
    }
  }
  return values;
}

type StoredOperationsForOwner = Readonly<{
  operations: readonly LocalRuneOperation[];
  /**
   * C1 (opus-ревью 05.10, вариант (в)): id операций, у которых есть durable-источник КРОМЕ operationStorageKey —
   * журнал практики и конверт неоткрытого платного спина (его в 2.0 никто не удаляет). Уплотнение снимает только
   * operationStorageKey, поэтому такую трату снимать нельзя: следующий проход вернул бы её из второго источника и
   * compactedSpendTotal вычел бы её ещё раз.
   */
  externallySourcedIds: ReadonlySet<string>;
  /**
   * N1 (повторное opus-ревью 05.10, вариант (а)): операции конвертов платного спина, у которых НЕТ своего
   * operationStorageKey. В 2.0 конверты никто не пишет и не раскрывает (local_level_spins.ts удалён, efe19ae9d) —
   * это зависшие покупки 1.6.x, приз за которые получить уже нельзя.
   */
  envelopeOnlyIds: ReadonlySet<string>;
}>;

async function storedOperationsForOwner(ownerStableId: string): Promise<StoredOperationsForOwner> {
  // зачем (замер №9): полный обход ключей хранилища на каждом восстановлении — подозреваемый в 4 с на холодном
  // старте. Пишем цену обхода, чтений и проверки отпечатков, только если весь кусок дольше 500 мс.
  const loadStartedAt = Date.now();
  const allKeys = await AsyncStorage.getAllKeys();
  const scanMs = Date.now() - loadStartedAt;
  if (allKeys.length > 524_288) throw new Error('level_spin_star_storage_scan_too_large');
  const prefix = `level_spin_star_operation_v1:${encodeURIComponent(ownerStableId)}:`;
  const journalPrefix = `practice_rune_journal_v1:${encodeURIComponent(ownerStableId)}:`;
  const paidEnvelopePrefix = paidLevelSpinEnvelopePrefix(ownerStableId);
  const keys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  const journalKeys = allKeys.filter((key) => key.startsWith(journalPrefix)).sort();
  const paidEnvelopeKeys = allKeys.filter((key) => key.startsWith(paidEnvelopePrefix)).sort();
  if (keys.length > MAX_LOCAL_RUNE_HISTORY
    || journalKeys.length > MAX_LOCAL_RUNE_HISTORY
    || paidEnvelopeKeys.length > MAX_LOCAL_RUNE_HISTORY) {
    throw new Error('level_spin_star_history_too_large');
  }
  const [rows, journalRows, paidEnvelopeRows] = await Promise.all([
    AsyncStorage.multiGet(keys),
    AsyncStorage.multiGet(journalKeys),
    AsyncStorage.multiGet(paidEnvelopeKeys),
  ]);
  const readsMs = Date.now() - loadStartedAt - scanMs;
  // зачем (координатор 04.10, замер №11: verify ~450 мс на 13 операций + 4 журнала): отпечатки проверялись
  // строго по очереди (await в цикле). Теперь проверки идут пачками по VERIFY_BATCH_SIZE параллельно, а решение
  // принимается в ИСХОДНОМ порядке строк (verifyRowsInOrder): первая битая строка роняет восстановление с той же
  // причиной, что и раньше, следующие пачки не запускаются. Ни одна строка не пропускается; порядок прежний.
  const operations = await verifyRowsInOrder(rows, async ([, raw]): Promise<RowVerdict<LocalRuneOperation>> => {
    if (raw === null) return SKIP_ROW;
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; } catch {
      return { kind: 'fail', fail: () => runeOperationCorrupt('read_all', 'json_parse', null, raw) };
    }
    const operation = parseLocalRuneOperation(parsed, ownerStableId);
    if (!operation) return { kind: 'fail', fail: () => runeOperationCorrupt('read_all', 'parse_failed', parsed, raw) };
    if (!await hasValidLocalRuneFingerprint(operation)) {
      return { kind: 'fail', fail: () => runeOperationCorrupt('read_all', 'fingerprint_invalid', parsed, raw) };
    }
    return { kind: 'ok', value: operation };
  });
  const journalCorrupt = (): never => { throw new Error('practice_rune_journal_corrupt'); };
  const journalOperations = await verifyRowsInOrder(journalRows, async ([, raw]): Promise<RowVerdict<LocalRuneOperation>> => {
    if (raw === null) return SKIP_ROW;
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; } catch { return { kind: 'fail', fail: journalCorrupt }; }
    const entry = parsePracticeRuneJournalEntry(parsed, ownerStableId);
    if (!entry || !await hasValidPracticeRuneFingerprint(entry.operation)) return { kind: 'fail', fail: journalCorrupt };
    return { kind: 'ok', value: entry.operation };
  });
  const envelopeCorrupt = (): never => { throw new Error('paid_level_spin_envelope_corrupt'); };
  const envelopeOperations = await verifyRowsInOrder(paidEnvelopeRows, async ([key, raw]): Promise<RowVerdict<LocalRuneOperation>> => {
    if (raw === null) return SKIP_ROW;
    let parsed: unknown;
    try { parsed = JSON.parse(raw) as unknown; } catch { return { kind: 'fail', fail: envelopeCorrupt }; }
    const envelope = await parsePaidLevelSpinEnvelope(parsed, ownerStableId);
    if (!envelope || key !== paidLevelSpinEnvelopeKey(ownerStableId, envelope.requestId)) {
      return { kind: 'fail', fail: envelopeCorrupt };
    }
    return { kind: 'ok', value: envelope.operation };
  });
  const result: LocalRuneOperation[] = [...operations, ...journalOperations, ...envelopeOperations];
  const unique = new Map<string, LocalRuneOperation>();
  for (const operation of result) {
    const prior = unique.get(operation.operationId);
    if (prior && (prior.requestFingerprint !== operation.requestFingerprint
      || prior.createdAtMs !== operation.createdAtMs)) {
      throw new Error('level_spin_star_request_conflict');
    }
    unique.set(operation.operationId, operation);
  }
  const totalLoadMs = Date.now() - loadStartedAt;
  if (totalLoadMs >= 500) {
    console.warn('[COIN-RECOVER] stored_ops', JSON.stringify({
      totalMs: totalLoadMs,
      scanMs,
      readsMs,
      verifyMs: totalLoadMs - scanMs - readsMs,
      allKeys: allKeys.length,
      operations: keys.length,
      journal: journalKeys.length,
      paidEnvelopes: paidEnvelopeKeys.length,
    }));
  }
  return Object.freeze({
    operations: Object.freeze([...unique.values()]),
    externallySourcedIds: new Set([...journalOperations, ...envelopeOperations].map((operation) => operation.operationId)),
    envelopeOnlyIds: new Set(envelopeOperations
      .map((operation) => operation.operationId)
      .filter((operationId) => !operations.some((keyed) => keyed.operationId === operationId))),
  });
}

async function recoverProjection(
  token: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
  // зачем (владелец 2026-09-20, лог 19:17:10 «step 6 есть, step 7 нет»):
  // аренды ОДНОГО замка аккаунта не хватало. Вызов изнутри уже взятого
  // storage-замка вставал в очередь за ним же — второй самозахват, из-за
  // которого покупка диалога висела вечно и кнопка была мёртвой.
  storageLockLease?: StorageLockLease,
): Promise<LevelSpinStarProjection> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  // зачем (координатор 04.10, замер №8, «сперва логи»): восстановление проекции кошелька держало замок аккаунта
  // ~5,2 с на старте, а за ним стояли курс Learning V2 и чтения монет (Блиц). Какой шаг стоит 5 с — по коду не
  // видно: трасса шагов + счётчики, пишется только если всё дольше 500 мс (частые чтения баланса не шумят).
  const recoverStartedAt = Date.now();
  const recoverStages: Record<string, number> = {};
  const recoverCounts: Record<string, number> = {};
  let recoverStageAt = recoverStartedAt;
  const recoverStage = (name: string) => {
    const now = Date.now();
    recoverStages[name] = now - recoverStageAt;
    recoverStageAt = now;
  };
  const logRecoverIfSlow = (outcome: string) => {
    const totalMs = Date.now() - recoverStartedAt;
    if (totalMs < 500) return;
    console.warn('[COIN-RECOVER] slow', JSON.stringify({ outcome, totalMs, stages: recoverStages, counts: recoverCounts }));
  };
  return withAccountTransitionLock(async (lease) => {
    recoverStage('account_lock_wait');
    // зачем (замер №9: этот шаг 3,7–4,4 с на холодном старте против 435 мс на тёплом): два куска идут
    // параллельно — какой из них тянет, видно только раздельным замером.
    const parallelStartedAt = Date.now();
    const [phoneState, storedSources] = await Promise.all([
      readPhoneStateStarCreditState({
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
      }).then((value) => { recoverStages.part_phone_state = Date.now() - parallelStartedAt; return value; }),
      storedOperationsForOwner(ownerStableId)
        .then((value) => { recoverStages.part_stored_ops = Date.now() - parallelStartedAt; return value; }),
    ]);
    const storedOperations = storedSources.operations;
    recoverStage('phone_state_and_stored_ops');
    recoverCounts.phoneCredits = phoneState.credits.length;
    recoverCounts.storedOperations = storedOperations.length;
    for (const operation of phoneState.credits) {
      if (!await hasValidFingerprint(operation)) throw new Error('level_spin_star_phone_state_corrupt');
    }
    recoverStage('phone_credit_fingerprints');
    const phoneStateAcknowledgements = phoneState.acknowledgements.map((candidate) => {
      const acknowledgement = parseLevelSpinStarCreditAckExactResult(candidate);
      if (!acknowledgement || acknowledgement.ownerStableId !== ownerStableId) {
        throw new Error('level_spin_star_phone_state_corrupt');
      }
      return acknowledgement;
    });
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    return withStorageLock(async () => {
    recoverStage('storage_lock_wait');
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const [projectionRaw, outboxRaw, preparedRaw] = await Promise.all([
      AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarPreparedKey(ownerStableId)),
    ]);
    if (projectionRaw === null) {
      // зачем ([COIN-DIVERGENCE]): проекции на диске нет — восстановление стартует
      // с нуля. Печатаем, что в этот момент видит снимок: если там уже монеты,
      // источник «0 при 9830» — подмена/стирание ключа проекции (выход, очистка,
      // восстановление из облака), а не арифметика кошелька.
      const progressNow = getAppSnapshot().progress;
      DebugLogger.info('[COIN-DIVERGENCE] recover:projection_absent', JSON.stringify({
        owner: ownerStableId.slice(0, 8),
        snapshotStars: progressNow ? progressNow.stars ?? null : 'no_progress',
        storedOperations: storedOperations.length,
        phoneCredits: phoneState.credits.length,
        phoneAcks: phoneStateAcknowledgements.length,
      }));
    }
    recoverStage('storage_reads');
    recoverCounts.projectionBytes = projectionRaw?.length ?? 0;
    const prepared = parsePrepared(preparedRaw, ownerStableId);
    recoverCounts.prepared = prepared.length;
    for (const operation of prepared) {
      if (!await hasValidLocalRuneFingerprint(operation)) throw new Error('level_spin_star_prepared_corrupt');
    }
    recoverStage('prepared_fingerprints');
    const preparedPracticeOperations = prepared.filter((operation): operation is PracticeRuneOperation => (
      operation.schemaVersion === 'client-practice-rune-operation.v1'
    ));
    const preparedPracticeJournalRows = await AsyncStorage.multiGet(
      preparedPracticeOperations.map((operation) => (
        practiceRuneJournalStorageKey(ownerStableId, operation.operationId)
      )),
    );
    const existingPracticeJournals = new Map<string, PracticeRuneJournalEntry>();
    for (const [index, [, raw]] of preparedPracticeJournalRows.entries()) {
      if (raw === null) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error('practice_rune_journal_corrupt'); }
      const entry = parsePracticeRuneJournalEntry(parsed, ownerStableId);
      const preparedOperation = preparedPracticeOperations[index];
      if (!entry || !preparedOperation
        || entry.operation.operationId !== preparedOperation.operationId
        || entry.operation.requestFingerprint !== preparedOperation.requestFingerprint
        || entry.operation.createdAtMs !== preparedOperation.createdAtMs) {
        throw new Error('practice_rune_journal_corrupt');
      }
      existingPracticeJournals.set(entry.operation.operationId, entry);
    }
    recoverStage('practice_journal_reads');
    // зачем (N1, повторное opus-ревью 05.10, вариант (а) — «у людей не списывать»): прежнее уплотнение снимало трату
    // зависшего конверта платного спина на каждом проходе, поэтому этих монет на диске уже нет в проекции, человек их
    // видел и мог потратить. Удерживать её теперь — разовое падение баланса, а при остатке < цены — ниже нуля и
    // level_spin_star_balance_invalid (мёртвый кошелёк). Приз за такой спин в 2.0 получить нельзя. Поэтому трата
    // конверта, у которой нет ни своего operationStorageKey, ни записи в проекции на диске, считается возвращённой и в
    // проекцию не вливается. Трата конверта, уже лежащая в проекции (её человек видел списанной), удерживается как была.
    const diskProjection = parseProjection(projectionRaw, ownerStableId);
    const diskOperationIds = new Set(diskProjection.operations.map((operation) => operation.operationId));
    const refundedEnvelopeOperations = storedOperations.filter((operation) => (
      storedSources.envelopeOnlyIds.has(operation.operationId) && !diskOperationIds.has(operation.operationId)
    ));
    // v3.1 (повторное ревью): конверт лежит вечно, решение принимается на каждом проходе — строка печатается один раз
    // за запуск на каждую пару «владелец + операция», а не на каждом восстановлении.
    const newlyRefundedEnvelopeOperations = refundedEnvelopeOperations.filter((operation) => {
      const logKey = `${ownerStableId}\u0000${operation.operationId}`;
      if (refundedEnvelopeLoggedThisLaunch.has(logKey)) return false;
      refundedEnvelopeLoggedThisLaunch.add(logKey);
      return true;
    });
    if (newlyRefundedEnvelopeOperations.length > 0) {
      const refunded = newlyRefundedEnvelopeOperations.map((operation) => ({
        id: operation.operationId,
        runeDelta: (operation as { runeDelta?: unknown }).runeDelta ?? null,
      }));
      console.warn('[COIN-COMPACTION] envelope_refunded', JSON.stringify({
        count: refunded.length,
        sum: refunded.reduce((total, row) => total + (typeof row.runeDelta === 'number' ? row.runeDelta : 0), 0),
        refunded,
        serverSeq: diskProjection.serverSeq,
      })); // guard-ok: денежное решение обязано логироваться и в релизе
    }
    const refundedEnvelopeIds = new Set(refundedEnvelopeOperations.map((operation) => operation.operationId));
    let projection = observeCurrentSnapshot(withOperations(
      diskProjection,
      [...storedOperations.filter((operation) => !refundedEnvelopeIds.has(operation.operationId)), ...phoneState.credits],
    ));
    recoverCounts.projectionOperations = projection.operations.length;
    const recoveredPracticeJournalWrites: [string, string][] = [];
    for (const operation of prepared) {
      if (operation.schemaVersion === 'client-practice-rune-operation.v1'
        && !existingPracticeJournals.has(operation.operationId)) {
        const alreadyProjected = projection.operations.some((candidate) => (
          candidate.operationId === operation.operationId
        ));
        const visibleBeforeRecovery = visibleProjection(projection).balance;
        const balanceBefore = alreadyProjected
          ? Math.max(0, visibleBeforeRecovery - operation.amount)
          : visibleBeforeRecovery;
        const journalEntry = practiceRuneJournalEntryFor(
          operation,
          token.generation,
          balanceBefore,
        );
        recoveredPracticeJournalWrites.push([
          practiceRuneJournalStorageKey(ownerStableId, operation.operationId),
          JSON.stringify(journalEntry),
        ]);
      }
      projection = withOperations(projection, [operation]);
    }
    projection = observeCurrentSnapshot(projection);
    const acknowledged = { ...projection.acknowledged };
    let serverBalance = projection.serverBalance;
    let serverEarnedTotal = projection.serverEarnedTotal;
    let serverSeq = projection.serverSeq;
    // Q-COIN (a): сумма операций, чей overlay снимают квитанции этого прохода —
    // она входит в локальную базу «после», с которой сравнивается сервер.
    let newlyAcknowledgedAmount = 0;
    for (const acknowledgement of phoneStateAcknowledgements) {
      const operation = projection.operations.find((candidate) => (
        candidate.operationId === acknowledgement.operationId
      ));
      if (operation && operation.requestFingerprint !== acknowledgement.requestFingerprint) {
        throw new Error('level_spin_star_phone_state_corrupt');
      }
      if (operation && acknowledged[operation.operationId] !== operation.requestFingerprint
        && (operation.schemaVersion === 'client-level-spin-star-operation.v1'
          || operation.schemaVersion === 'client-practice-rune-operation.v1')) {
        newlyAcknowledgedAmount += operation.amount;
      }
      if (operation) acknowledged[operation.operationId] = acknowledgement.requestFingerprint;
      if (acknowledgement.starsSeq > serverSeq) {
        serverBalance = acknowledgement.starsBalance;
        serverSeq = acknowledgement.starsSeq;
      }
      serverEarnedTotal = Math.max(serverEarnedTotal, acknowledgement.starsEarnedTotal);
    }
    // зачем (Q-COIN a): раньше первая квитанция PhoneState при serverSeq 0
    // ЗАМЕНЯЛА локальную базу серверной (9830 → 10). Решаем по ИТОГУ прохода,
    // а не по первой квитанции: квитанции приходят в любом порядке, и разница,
    // посчитанная по одной из них, потеряла бы операции из соседних.
    const phoneBasis = serverSeq > projection.serverSeq
      ? adoptServerBasis({
          path: 'phone_state_ack',
          ownerStableId,
          currentSeq: projection.serverSeq,
          currentLift: unconfirmedLiftOf(projection),
          localBasisAfter: projection.serverBalance + unconfirmedLiftOf(projection) + newlyAcknowledgedAmount,
          observedBalance: serverBalance,
          observedSeq: serverSeq,
        })
      : Object.freeze({ serverBalance, lift: unconfirmedLiftOf(projection) });
    projection = withUnconfirmedLift(Object.freeze({
      ...projection,
      acknowledged: Object.freeze(acknowledged),
      serverBalance: phoneBasis.serverBalance,
      serverEarnedTotal,
      serverSeq,
    }), phoneBasis.lift);
    const outbox = parseOutbox(outboxRaw, ownerStableId);
    const pending = new Map(outbox.filter((operation) => (
      projection.acknowledged[operation.operationId] !== operation.requestFingerprint
    )).map((operation) => [operation.operationId, operation]));
    for (const operation of projection.operations) {
      if (operation.schemaVersion !== 'client-level-spin-star-operation.v1') continue;
      if (projection.acknowledged[operation.operationId] === operation.requestFingerprint) continue;
      const prior = pending.get(operation.operationId);
      if (prior && prior.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      pending.set(operation.operationId, operation);
    }
    if (pending.size > MAX_PENDING_STAR_OPERATIONS) throw new Error('level_spin_star_outbox_full');
    // зачем (владелец, 2026-09-02): траты рун не подпадали НИ ПОД ОДНО условие
    // компакции — у них другая схема и им никогда не проставляется acknowledged.
    // Они копились навсегда (потолок 262 144), раздували проекцию и ломали
    // восстановление баланса устаревшими balanceBefore. Как только сервер
    // подтвердил свой базис (serverSeq > 0), все траты, кроме самой свежей,
    // больше ничего не доказывают: их balanceBefore записан в снятом базисе.
    // Свежую храним — по ней восстанавливается баланс на чистом старте.
    const spendOperations = projection.operations.filter((operation) => (
      operation.schemaVersion !== 'client-level-spin-star-operation.v1'
      && operation.schemaVersion !== 'client-practice-rune-operation.v1'
      && operation.schemaVersion !== 'client-dialog-extra-replies-rune-operation.v1'
    ));
    const newestSpendOperationId = spendOperations.length > 0
      ? [...spendOperations].sort((left, right) => (
          left.createdAtMs - right.createdAtMs || left.operationId.localeCompare(right.operationId)
        ))[spendOperations.length - 1].operationId
      : null;
    // C1 (opus-ревью 05.10): уплотняется только трата, чей единственный durable-источник — operationStorageKey.
    // Конверт платного спина, журнал практики, список подготовленных и квитанции PhoneState пережили бы multiRemove и
    // вернули трату на следующем проходе — compactedSpendTotal вычел бы её снова. Такие траты остаются записью.
    const nonCompactableSpendIds = new Set<string>([
      ...storedSources.externallySourcedIds,
      ...prepared.map((operation) => operation.operationId),
      ...phoneState.credits.map((operation) => operation.operationId),
    ]);
    const heldExternalSpendIds = spendOperations
      .filter((operation) => nonCompactableSpendIds.has(operation.operationId))
      .map((operation) => operation.operationId);
    const staleSpendOperations = projection.serverSeq > 0
      ? spendOperations.filter((operation) => (
        operation.operationId !== newestSpendOperationId && !nonCompactableSpendIds.has(operation.operationId)
      ))
      : [];
    // зачем (координатор 05.10, диагноз +5000 на тестовом аккаунте): уплотнение снимало старые траты, НЕ внося их
    // никуда, — видимый баланс рос на их сумму. Вариант (в): сумма переезжает в compactedSpendTotal (ниже). Лог
    // показывает до/после — они обязаны совпасть. Без uid: суммы, id записей трат, их вид.
    if (staleSpendOperations.length > 0) {
      console.warn('[COIN-COMPACTION] spends_removed', JSON.stringify({
        ...describeSpendCompaction(projection, staleSpendOperations, newestSpendOperationId),
        heldExternal: heldExternalSpendIds,
      })); // guard-ok: денежный исход обязан логироваться и в релизе
    } else if (spendOperations.length > 0) {
      console.log('[COIN-COMPACTION] skip', JSON.stringify({
        reason: projection.serverSeq <= 0 ? 'no_server_basis'
          : heldExternalSpendIds.length > 0 ? 'only_newest_or_external_source' : 'only_newest_spend',
        serverSeq: projection.serverSeq,
        spends: spendOperations.length,
        keptOperationId: newestSpendOperationId,
        heldExternal: heldExternalSpendIds,
      })); // guard-ok: ранний выход денежного блока обязан логироваться
    }
    // M1 (opus-ревью): сумма считается и проверяется ДО multiRemove — при порче ключи ещё целы.
    const compactedSpendTotal = compactedSpendTotalOf(projection) + staleSpendOperations.reduce((total, operation) => (
      total + (operation as { runeDelta: number }).runeDelta
    ), 0);
    if (!Number.isSafeInteger(compactedSpendTotal) || compactedSpendTotal > 0) {
      console.warn('[COIN-COMPACTION] total_invalid', JSON.stringify({
        compactedSpendTotal, removed: staleSpendOperations.map((operation) => operation.operationId),
      })); // guard-ok: отказ денежного блока обязан логироваться
      throw new Error('level_spin_star_projection_corrupt');
    }
    const compactedOperations = [
      ...projection.operations.filter((operation) => (
        operation.schemaVersion === 'client-level-spin-star-operation.v1'
        && projection.acknowledged[operation.operationId] === operation.requestFingerprint
      )),
      ...staleSpendOperations,
    ];
    recoverStage('compute_projection');
    recoverCounts.compacted = compactedOperations.length;
    if (compactedOperations.length > 0) {
      const compactedOperationIds = new Set(compactedOperations.map((operation) => operation.operationId));
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      await AsyncStorage.multiRemove(compactedOperations.map((operation) => (
        operationStorageKey(ownerStableId, operation.operationId)
      )));
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      // зачем (вариант (в)): сумма снимаемых трат переезжает в compactedSpendTotal — видимый баланс не меняется.
      // Повторного вычитания нет: снятые записи уходят из operations и с диска в этом же проходе, следующий проход их
      // уже не видит. Если процесс умрёт между multiRemove и записью проекции, на диске останется прежняя проекция
      // с этими записями и прежней суммой — следующий проход перенесёт их ровно один раз (тест H2).
      const { compactedSpendTotal: _priorCompacted, ...withoutCompacted } = projection;
      projection = Object.freeze({
        ...withoutCompacted,
        ...(compactedSpendTotal < 0 ? { compactedSpendTotal } : {}),
        operations: Object.freeze(projection.operations.filter((operation) => (
          !compactedOperationIds.has(operation.operationId)
        ))),
        // Level-spin has an independent durable PhoneState acknowledgement and
        // can drop this local copy. Practice operations remain in the journal.
        acknowledged: Object.freeze(Object.fromEntries(Object.entries(projection.acknowledged).filter(
          ([operationId]) => !compactedOperationIds.has(operationId)
            || operationId.startsWith('practice_rune:'),
        ))),
      });
    }
    // зачем (координатор 05.10, шаг К1; пакет 04:26: multi_set 0,8–0,86 с на КАЖДОМ проходе восстановления, проходов
    // на старте до трёх): проекция и outbox перезаписывались, даже когда ничего не изменилось. Запись пропускается
    // ТОЛЬКО при байтовом совпадении нового JSON с тем, что уже лежит на диске (прочитано выше под тем же
    // storage-замком) — запись идентичного значения ничего не меняет. Журналы практики и подготовленные операции
    // пишутся как раньше.
    const projectionJson = JSON.stringify(projection);
    const outboxJson = JSON.stringify([...pending.values()]);
    // зачем (владелец 21.10, №1; Ревизор к 3c3764f72): пустая проекция снова пишется (иначе прочерк монет у гостя на
    // каждом холодном старте) — ключ с ней долив аварийной копии считает отсутствующим
    // (account_switch_backup_restore.isReplaceableServerOnlyCoinProjection), копия больше не теряется.
    const projectionUnchanged = projectionRaw !== null && projectionRaw === projectionJson;
    const outboxUnchanged = outboxRaw !== null && outboxRaw === outboxJson;
    const writes: [string, string][] = [
      ...recoveredPracticeJournalWrites,
      ...(projectionUnchanged ? [] : [[levelSpinStarProjectionKey(ownerStableId), projectionJson] as [string, string]]),
      ...(outboxUnchanged ? [] : [[levelSpinStarGrantOutboxKey(ownerStableId), outboxJson] as [string, string]]),
      ...prepared.map((operation) => [
        operationStorageKey(ownerStableId, operation.operationId),
        JSON.stringify(operation),
      ] as [string, string]),
    ];
    recoverStage('compaction');
    recoverCounts.writes = writes.length;
    recoverCounts.writeBytes = writes.reduce((sum, [, value]) => sum + value.length, 0);
    recoverCounts.skippedUnchanged = (projectionUnchanged ? 1 : 0) + (outboxUnchanged ? 1 : 0);
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    // Пропуск виден в [COIN-RECOVER] slow (counts.skippedUnchanged) — отдельный лог на частом пути не пишем.
    if (writes.length > 0) await AsyncStorage.multiSet(writes);
    recoverStage('multi_set');
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    // зачем ([COLD-START-IO], store-release, слабый профиль, 02.10): очистка подготовленных операций
    // писалась на КАЖДОМ восстановлении, даже когда список и так пуст — 5 записей за старт, до 4,2 с
    // в очереди AsyncStorage. Пишем только если было что очищать (запись есть и она не «[]»).
    if (preparedRaw !== null && preparedRaw !== '[]') {
      await AsyncStorage.setItem(levelSpinStarPreparedKey(ownerStableId), '[]');
    } else {
      console.log(`[LEVEL-SPIN-STAR] recover:prepared_clear_skipped — список уже пуст (raw=${preparedRaw === null ? 'null' : '[]'})`);
    }
    recoverStage('prepared_clear');
    logRecoverIfSlow('ok');
    return projection;
    }, storageLockLease);
  }, accountTransitionLockLease);
}

// зачем (координатор 04.10, замер №9, «ок» на пункт 1): на холодном старте восстановление проекции зовут
// почти одновременно стартовая подготовка баланса и чтение монет экранами — второй вызов 2,5–3,9 с стоял в
// очереди замка аккаунта и потом пересчитывал то же самое. Одновременные вызовы БЕЗ аренды замка получают
// один общий промис «в полёте» на (владелец, поколение). После завершения (успех или ошибка) запись
// снимается — кэша нет, следующий вызов считает заново. Ключ с поколением: смена аккаунта во время полёта
// не отдаст новому вызову проекцию старого поколения. Путь с арендой замка сюда НЕ ходит (иначе вызов
// изнутри замка ждал бы промис, который сам ждёт этот замок) — он зовёт recoverProjection напрямую.
// Только для чтения баланса: потоки, которые по результату решают запись (сверка, повтор после «слепого»
// восстановления), зовут recoverProjection напрямую и всегда считают сами.
const recoverProjectionInFlight = new Map<string, Promise<LevelSpinStarProjection>>();

function recoverProjectionShared(token: AccountGenerationToken): Promise<LevelSpinStarProjection> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId) return recoverProjection(token);
  const flightKey = `${ownerStableId}\u0000${token.generation}`;
  const inFlight = recoverProjectionInFlight.get(flightKey);
  if (inFlight) {
    console.log(`[COIN-RECOVER] dedupe:joined — восстановление уже идёт (generation=${token.generation})`);
    return inFlight;
  }
  const flight = recoverProjection(token).finally(() => {
    if (recoverProjectionInFlight.get(flightKey) === flight) recoverProjectionInFlight.delete(flightKey);
  });
  recoverProjectionInFlight.set(flightKey, flight);
  return flight;
}

function hasRecoverySpendOperation(projection: LevelSpinStarProjection): boolean {
  return projection.operations.some((operation) => (
    operation.schemaVersion !== 'client-level-spin-star-operation.v1'
    && operation.schemaVersion !== 'client-practice-rune-operation.v1'
  ));
}

// зачем (владелец 01.10, [COIN-DIVERGENCE], тест tests/coin_divergence_cold_start.test.ts):
// на холодном старте восстановление может пройти ВСЛЕПУЮ — observeCurrentSnapshot
// не видит секции progress (снимок ещё не поднят) либо проекция на диске была
// пустой/подменённой, пока снимок уже показал настоящие монеты. Публикация такой
// проекции затирала видимые 9830 нулём. Пока проекция не подтверждена сервером
// (serverSeq 0) и в ней нет трат, понижение ничем не объяснено — значит, это
// слепое восстановление, а не настоящее списание. Занизить баланс нельзя:
// повторяем восстановление уже с поднятым снимком — observe берёт БОЛЬШЕЕ и
// записывает его на диск, чтобы следующий старт не прочитал 0.
function unconfirmedBlindDrop(projection: LevelSpinStarProjection): number | null {
  if (projection.serverSeq !== 0 || hasRecoverySpendOperation(projection)) return null;
  const progress = getAppSnapshot().progress;
  if (!progress) return null;
  const snapshotStars = Math.max(0, Math.trunc(progress.stars ?? 0));
  return snapshotStars > visibleProjection(projection).balance ? snapshotStars : null;
}

export async function recoverAndHydrateLevelSpinStarGrants(
  token: AccountGenerationToken,
  // зачем shareInFlight (ревью дедупликации 04.10): общий промис только по явной просьбе — стартовый вызов.
  // После подтяжки PhoneState и восстановления попыток данные пишутся мимо замка аккаунта; присоединись они
  // к уже идущему проходу, показали бы баланс без только что скачанных монет. Поэтому по умолчанию — свой проход.
  options: Readonly<{ syncNow?: boolean; shareInFlight?: boolean }> = {},
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  let projection = options.shareInFlight === true
    ? await recoverProjectionShared(token)
    : await recoverProjection(token);
  const blindDropFrom = unconfirmedBlindDrop(projection);
  if (blindDropFrom !== null) {
    DebugLogger.info('[COIN-DIVERGENCE] hydrate:blind_drop_reobserve', JSON.stringify({
      owner: token.stableId?.slice(0, 8) ?? null,
      snapshotStars: blindDropFrom,
      projectionBalance: visibleProjection(projection).balance,
      serverBalance: projection.serverBalance,
      operations: projection.operations.length,
    }));
    projection = await recoverProjection(token);
  }
  publishProjection(token, projection);
  if (options.syncNow !== false) {
    void syncPendingLevelSpinStarGrants(token).catch(noteSwallowedHandler('level_spin_star_grants:promise_1'));
    // зачем (D148, Q109): миграция «Подарки → монеты» удалена целиком — здесь её
    // запуск больше не нужен. Сверка кошелька ниже — единственный фоновый шаг.
    // зачем (Q-COIN b, координатор 01.10): разовая серверная сверка — после
    // восстановления кошелька, тем же единственным стартовым вызовом. Модуль
    // ленивый; сам решает, нужна ли сверка (разница «только на телефоне» или
    // застрявшие спиновые начисления), иначе сети нет вовсе.
    if (coinReconcileV1NeedFor(projection).needed) {
      void import('./coin_reconcile_v1_client')
        .then(({ runCoinReconcileV1Once }) => runCoinReconcileV1Once(token))
        .catch((error: unknown) => {
          DebugLogger.warn('[COIN-RECONCILE]', `catch step=client_import error=${String(error)}`);
        });
    }
  }
  return visibleProjection(projection);
}

export async function mergeLevelSpinServerStars(
  token: AccountGenerationToken,
  observation: Readonly<{
    stars?: unknown;
    starsEarnedTotal?: unknown;
    starsSeq?: unknown;
    /**
     * Траты, которые ЭТОТ серверный ответ уже учёл в `stars`. Только их можно
     * снять с локального overlay — см. комментарий у `settledSpends`.
     * Передаёт тот, кто синхронизировал покупку; обычные снапшоты не передают.
     */
    settledSpendOperationIds?: readonly string[];
    /**
     * Сколько монет ЭТОТ ответ сервера начислил (приз рулетки, награда рассылки).
     * Нужен только при неподтверждённой базе (serverSeq 0, Q-COIN a): локальная
     * база этого приза ещё не содержит, и без него он растворился бы в max.
     */
    serverCreditedDelta?: unknown;
  }>,
  // Аренда вызывающего — см. комментарий у readUnifiedLevelSpinStars (самозахват).
  accountTransitionLockLease?: AccountTransitionLockLease,
  // Вторая аренда, storage-замка: без неё запись баланса из-под покупки
  // вставала в очередь за замком, который держит сама покупка (step 10).
  storageLockLease?: StorageLockLease,
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const projection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(token, lease, storageLockLease);
    return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const current = parseProjection(
      await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      ownerStableId,
    );
    const balance = Number(observation.stars);
    const earned = Number(observation.starsEarnedTotal);
    const seq = Number(observation.starsSeq);
    // A server snapshot cannot prove which locally pending materializations it
    // already contains. Accepting it and then retaining the same overlay would
    // double a grant after a crash between server commit and local ack. Exact
    // callable/PhoneState receipts reconcile these operations first; until then
    // the local client-authoritative projection remains the safe source.
    const hasUnacknowledgedServerMaterialization = current.operations.some((operation) => (
      (operation.schemaVersion === 'client-practice-rune-operation.v1'
        || operation.schemaVersion === 'client-level-spin-star-operation.v1')
      && current.acknowledged[operation.operationId] !== operation.requestFingerprint
    ));
    const newer = !hasUnacknowledgedServerMaterialization
      && Number.isSafeInteger(seq) && seq > current.serverSeq;
    /**
     * Снимаем ТОЛЬКО те траты, которые сервер НАЗВАЛ учтёнными.
     *
     * зачем именно поимённо (замерено 2026-09-20): сначала я снимал траты при
     * любом новом `serverSeq` — и дев-начисление 5000 после покупки давало
     * 10523 вместо 5523. Сервер о несинхронизированной покупке НЕ знал, а его
     * снапшот стирал её: руны возвращались, диалог оставался. Бесплатно.
     *
     * Обратная крайность так же опасна: оставить трату, которую сервер уже
     * списал, — цена уходит ДВАЖДЫ, баланс в минус и экран рун падает
     * `balance_invalid`. Поэтому решает не догадка по seq, а явный список от
     * того, кто синхронизировал покупку.
     */
    const settledSpends = newer && observation.settledSpendOperationIds
      ? new Set(current.operations
          .filter((operation) => (
            operation.schemaVersion === 'client-rune-spend-operation.v1'
            && observation.settledSpendOperationIds?.includes(operation.operationId)
          ))
          .map((operation) => operation.operationId))
      : new Set<string>();
    if (settledSpends.size > 0) {
      DebugLogger.info('level_spin_star_grants:spend_settled', JSON.stringify({
        settled: settledSpends.size, serverSeq: seq, serverBalance: balance,
      }));
    }
    // зачем (вариант (в)): сейчас settledSpendOperationIds не передаёт никто. Если когда-нибудь сервер «погасит» трату,
    // запись которой уже свёрнута в compactedSpendTotal, она вычтется дважды (сервером и суммой). Этот случай обязан
    // быть виден сразу — лечится серверным журналом трат (вариант (б)).
    const settledButCompacted = newer && observation.settledSpendOperationIds
      ? observation.settledSpendOperationIds.filter((id) => !current.operations.some((operation) => operation.operationId === id))
      : [];
    if (settledButCompacted.length > 0 && compactedSpendTotalOf(current) < 0) {
      console.warn('[COIN-COMPACTION] settled_after_compaction', JSON.stringify({
        ids: settledButCompacted, compactedSpendTotal: compactedSpendTotalOf(current), serverSeq: seq,
      })); // guard-ok: возможное двойное списание обязано логироваться и в релизе
    }
    const balanceAdoptable = newer && Number.isSafeInteger(balance) && balance >= 0;
    // зачем (Q-COIN a): при serverSeq 0 снимок сервера раньше ЗАМЕНЯЛ локальную
    // базу. Локальная база «после» = база + разница + снятые траты (runeDelta < 0:
    // сервер их уже вычел) + приз, который этот ответ начислил на сервере
    // (рулетка, рассылка) — иначе приз растворился бы в большем из двух чисел.
    const settledSpendDelta = current.operations.reduce((total, operation) => (
      settledSpends.has(operation.operationId) && operation.schemaVersion === 'client-rune-spend-operation.v1'
        ? total + operation.runeDelta : total
    ), 0);
    const creditedDelta = Number(observation.serverCreditedDelta ?? 0);
    const mergeBasis = balanceAdoptable
      ? adoptServerBasis({
          path: 'merge_server_stars',
          ownerStableId,
          currentSeq: current.serverSeq,
          currentLift: unconfirmedLiftOf(current),
          localBasisAfter: Math.max(0, current.serverBalance + unconfirmedLiftOf(current) + settledSpendDelta
            + (Number.isSafeInteger(creditedDelta) && creditedDelta > 0 ? creditedDelta : 0)),
          observedBalance: balance,
          observedSeq: seq,
        })
      : Object.freeze({ serverBalance: current.serverBalance, lift: unconfirmedLiftOf(current) });
    const next = withUnconfirmedLift(Object.freeze({
      ...current,
      operations: settledSpends.size > 0
        ? current.operations.filter((operation) => !settledSpends.has(operation.operationId))
        : current.operations,
      // serverBalance — всегда точная копия сервера (adoptServerBasis не меняет
      // само число, только считает разницу); большее живёт в unconfirmedLocalLift.
      serverBalance: balanceAdoptable ? balance : current.serverBalance,
      serverEarnedTotal: !hasUnacknowledgedServerMaterialization
        && Number.isSafeInteger(earned) && earned >= 0
        ? Math.max(current.serverEarnedTotal, earned) : current.serverEarnedTotal,
      serverSeq: newer ? seq : current.serverSeq,
    }), mergeBasis.lift);
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    // Файл операции удаляем ВМЕСТЕ со снятием из проекции: `recoverProjection`
    // собирает операции сканом по префиксу и иначе вернул бы трату обратно —
    // баланс ушёл бы в минус уже при следующем чтении.
    if (settledSpends.size > 0) {
      await AsyncStorage.multiRemove([...settledSpends].map((operationId) => (
        operationStorageKey(ownerStableId, operationId)
      )));
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    }
    await AsyncStorage.setItem(levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next));
    return next;
    }, storageLockLease);
  }, accountTransitionLockLease);
  publishProjection(token, projection);
  return visibleProjection(projection);
}

export type ServerWalletAdoptOutcome =
  | 'merged'
  | 'skip_not_newer'
  | 'skip_no_stars_field'
  | 'skip_invalid_stars'
  | 'skip_stale_generation'
  | 'failed';

/**
 * Серверный кошелёк users/{uid}.stars {balance, earnedTotal, seq} → проекция монет (A1, решение владельца 21.10
 * «сервер — главный»). Документ уже прочитан восстановлением — 0 лишних чтений Firestore.
 *
 * зачем: после смены аккаунта и на новом телефоне проекция стартует с нуля, а поднять её мог только ответ сервера на
 * конкретное действие (спин, Пик, подарок) — человек видел 0 до первого такого действия. Вливаем тем же единственным
 * каналом серверных снимков: только более новый seq; при неподтверждённых начислениях база не трогается (иначе
 * задвоение); при seq 0 локальная разница сохраняется (Q-COIN a). Вызывающий отвечает за порядок: на входе со сменой
 * аккаунта — ПОСЛЕ долива аварийной копии, иначе копия пропустит свою проекцию (account_switch_backup_restore).
 * Никогда не бросает: исход — в журнал [COIN-DIVERGENCE] и в возврат.
 */
export async function adoptServerWalletFromUserDoc(
  token: AccountGenerationToken,
  stars: unknown,
  source: string,
): Promise<ServerWalletAdoptOutcome> {
  // зачем (Ревизор к 3c3764f72, п.5): в журнал — только исходы и числа, без префикса владельца.
  if (stars === undefined || stars === null) {
    DebugLogger.info('[COIN-DIVERGENCE] server_wallet:skip', JSON.stringify({ source, reason: 'no_stars_field' }));
    return 'skip_no_stars_field';
  }
  const record = typeof stars === 'object' ? stars as Record<string, unknown> : null;
  const balance = Number(record?.balance);
  const earnedTotal = Number(record?.earnedTotal);
  const seq = Number(record?.seq);
  if (!record || !Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(seq) || seq < 0) {
    DebugLogger.warn('[COIN-DIVERGENCE] server_wallet:skip', JSON.stringify({
      source, reason: 'invalid_stars', balanceType: typeof record?.balance, seqType: typeof record?.seq,
    }));
    return 'skip_invalid_stars';
  }
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    DebugLogger.info('[COIN-DIVERGENCE] server_wallet:skip', JSON.stringify({ source, reason: 'stale_generation' }));
    return 'skip_stale_generation';
  }
  try {
    // зачем (Ревизор к 3c3764f72, п.5): не новый seq — честный исход и НИ ОДНОЙ записи (merge пишет проекцию всегда).
    const storedRaw = await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId));
    const storedSeq = storedRaw === null ? null : parseProjection(storedRaw, ownerStableId).serverSeq;
    if (storedSeq !== null && seq <= storedSeq) {
      DebugLogger.info('[COIN-DIVERGENCE] server_wallet:skip', JSON.stringify({ source, reason: 'not_newer', serverSeq: seq, storedSeq }));
      return 'skip_not_newer';
    }
    const visible = await mergeLevelSpinServerStars(token, {
      stars: balance,
      starsEarnedTotal: Number.isSafeInteger(earnedTotal) && earnedTotal >= 0 ? earnedTotal : undefined,
      starsSeq: seq,
    });
    DebugLogger.info('[COIN-DIVERGENCE] server_wallet:merged', JSON.stringify({
      source, serverBalance: balance, serverSeq: seq, storedSeq, visibleBalance: visible.balance,
    }));
    return 'merged';
  } catch (error: unknown) {
    DebugLogger.warn('[COIN-DIVERGENCE] server_wallet:failed', JSON.stringify({
      source, reason: error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120),
    }));
    return 'failed';
  }
}

export type PreparedRuneSpend =
  | Readonly<{
      ok: true;
      alreadySpent: boolean;
      balanceBefore: number;
      balanceAfter: number;
      /** Записи траты. Вызывающий пишет их ОДНИМ multiSet вместе с товаром. */
      durableWrites: readonly (readonly [string, string])[];
      projection: LevelSpinStarProjection;
    }>
  | Readonly<{ ok: false; reason: 'insufficient_runes' }>;

/**
 * ГОТОВИТ трату рун за товар и её durable-записи. САМА НЕ ПИШЕТ.
 *
 * зачем (владелец 2026-09-20, дословно: «ничего не списывается вообще, счёт
 * как был так и остался»): покупка диалога, подсказки, разбора ошибки и
 * набора карточек звали `mergeLevelSpinServerStars` — канал СЕРВЕРНЫХ
 * снапшотов. Он применяет значение только при более новом `starsSeq`, а
 * покупка его не передаёт: `newer === false`, и списание молча не
 * происходило. Замерено: покупка вернула `balance 523`, а чтение баланса
 * сразу после неё дало 5523.
 *
 * зачем ПОДГОТОВКА, а не списание одним вызовом: конституция экономики
 * (tests/economy_constitution_contract.test.ts и ещё два сторожа) прямо
 * запрещает `spendRunes` — отдельный шаг списания. Причина верная: сбой между
 * «сняли руны» и «выдали товар» оставил бы человека без денег И без покупки.
 * Поэтому трата отдаётся записями, а вызывающий пишет их ОДНИМ `multiSet`
 * вместе с самим товаром — как это делает покупка кастомизации.
 *
 * Идемпотентность по `operationId`: повторный тап и ретрай находят уже
 * записанную трату и НЕ списывают вторую цену — возвращают `alreadySpent`.
 *
 * Обе аренды замков принимаются, потому что вызывающие (покупки) уже держат
 * их сами — без наследования это был бы самозахват, из-за которого кнопка
 * покупки диалога висела вечно.
 */
export async function prepareRuneSpend(
  input: Readonly<{
    token: AccountGenerationToken;
    operationId: string;
    kind: RuneSpendExactResultV1['kind'];
    subjectId: string;
    price: number;
    createdAtMs?: number;
  }>,
  accountTransitionLockLease?: AccountTransitionLockLease,
  storageLockLease?: StorageLockLease,
): Promise<PreparedRuneSpend> {
  const ownerStableId = input.token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  return withAccountTransitionLock(async (lease) => {
    await recoverProjection(input.token, lease, storageLockLease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      const projection = parseProjection(
        await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
        ownerStableId,
      );
      const existing = projection.operations.find((operation) => (
        operation.operationId === input.operationId
      ));
      if (existing) {
        // Повтор той же траты — не вторая цена. Возвращаем факт, а не списание.
        const visible = visibleProjection(projection);
        console.log(`[RUNE-SPEND] already_spent op=${input.operationId} balance=${visible.balance}`); // guard-ok: исход обязан логироваться и в релизе
        return Object.freeze({
          ok: true as const,
          alreadySpent: true as const,
          balanceBefore: visible.balance,
          balanceAfter: visible.balance,
          // Писать нечего: трата уже лежит. Вызывающий просто выдаёт товар.
          durableWrites: Object.freeze([] as readonly (readonly [string, string])[]),
          projection,
        });
      }
      const balanceBefore = visibleProjection(projection).balance;
      if (balanceBefore < input.price) {
        console.log(`[RUNE-SPEND] denied insufficient balance=${balanceBefore} price=${input.price}`); // guard-ok: отказ обязан логироваться и в релизе
        return Object.freeze({ ok: false as const, reason: 'insufficient_runes' as const });
      }
      const balanceAfter = balanceBefore - input.price;
      const unsigned: Omit<RuneSpendExactResultV1, 'schemaVersion' | 'requestFingerprint'> = {
        operationId: input.operationId,
        ownerStableId,
        accountGeneration: input.token.generation,
        kind: input.kind,
        subjectId: input.subjectId,
        runeDelta: -input.price,
        price: input.price,
        balanceBefore,
        balanceAfter,
        createdAtMs: input.createdAtMs ?? Date.now(),
      };
      const operation: RuneSpendExactResultV1 = Object.freeze({
        schemaVersion: 'client-rune-spend-operation.v1',
        ...unsigned,
        requestFingerprint: await runeSpendFingerprint(unsigned),
      });
      if (!parseRuneSpendExactResult(operation) || !await hasValidRuneSpendFingerprint(operation)) {
        throw new Error('rune_spend_operation_invalid');
      }
      const nextProjection = withOperations(projection, [operation]);
      // Страховка от тихой ошибки в арифметике overlay: цифра на экране
      // обязана совпасть с тем, что мы обещали человеку.
      if (visibleProjection(nextProjection).balance !== balanceAfter) {
        throw new Error('rune_spend_projection_invalid');
      }
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      console.log(`[RUNE-SPEND] prepared kind=${input.kind} subject=${input.subjectId} ${balanceBefore}→${balanceAfter}`); // guard-ok: исход обязан логироваться и в релизе
      // НЕ пишем: записи отдаём вызывающему, он положит их одним multiSet
      // вместе с товаром. Иначе сбой между списанием и выдачей оставил бы
      // человека без рун и без покупки (конституция экономики).
      return Object.freeze({
        ok: true as const,
        alreadySpent: false as const,
        balanceBefore,
        balanceAfter,
        durableWrites: Object.freeze([
          Object.freeze([
            operationStorageKey(ownerStableId, input.operationId), JSON.stringify(operation),
          ] as const),
          Object.freeze([
            levelSpinStarProjectionKey(ownerStableId), JSON.stringify(nextProjection),
          ] as const),
        ]),
        projection: nextProjection,
      });
    }, storageLockLease);
  }, accountTransitionLockLease);
}

/**
 * Публикует новую цифру рун после того, как вызывающий ЗАПИСАЛ трату.
 *
 * Отдельным шагом, потому что подготовка ничего не пишет: пока записи не
 * легли на диск, показывать списанный баланс нельзя — цифра разошлась бы
 * с действительностью при сбое записи.
 */
export function publishRuneSpend(
  token: AccountGenerationToken,
  prepared: Extract<PreparedRuneSpend, { ok: true }>,
): void {
  publishProjection(token, prepared.projection);
}

export async function hydrateLevelSpinStarsAfterPhoneStatePull(
  token: AccountGenerationToken,
  result: Readonly<{ downloaded?: unknown }>,
): Promise<void> {
  if (!Number.isSafeInteger(result.downloaded) || Number(result.downloaded) <= 0) return;
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return;
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
}

/**
 * Зачем `accountTransitionLockLease` (владелец 2026-09-20, логи 15:19):
 * без него вызов ИЗНУТРИ уже взятого `withAccountTransitionLock`
 * вставал в очередь за ЗАМКОМ, КОТОРЫЙ ДЕРЖИТ САМ ВЫЗЫВАЮЩИЙ —
 * классический самозахват. Покупка диалога зависала НАВСЕГДА именно
 * здесь: ни `ok`, ни `denied`, ни таймаута — дедлайн режет ожидание
 * СНАРУЖИ, а зависали мы ВНУТРИ уже взятого замка.
 *
 * Передал аренду — замок узнаёт «это свой» и пускает без ожидания.
 */
export async function readUnifiedLevelSpinStars(
  token: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
  // зачем: аренды замка аккаунта было МАЛО. Покупка держит ещё и storage-замок,
  // и без этой второй аренды чтение баланса вставало в очередь за ним же.
  storageLockLease?: StorageLockLease,
): Promise<Readonly<{ balance: number; earnedTotal: number }>> {
  // зачем: без аренд — общий промис одновременных восстановлений; с арендой — строго свой проход.
  return visibleProjection(
    accountTransitionLockLease || storageLockLease
      ? await recoverProjection(token, accountTransitionLockLease, storageLockLease)
      : await recoverProjectionShared(token),
  );
}

/**
 * Показывает руны, накапавшие за просмотр видео, в ГЛОБАЛЬНОМ счётчике — сразу,
 * не дожидаясь сервера.
 *
 * зачем (владелец 2026-09-21, дословно: «во время просмотра видео нету
 * начисления рун, начисление должно происходить сразу во время просмотра и оно
 * должно прям сразу изменять счетчик везде во всех местах»): бейдж поверх
 * плеера считал минуты локально, но глобального баланса не касался вообще.
 * Руны падали на счёт только при паузе/закрытии, когда сервер отвечал на claim.
 * На Главной цифра стояла всё время просмотра.
 *
 * зачем БЕЗ durable-операции (важно, не «недоделка»): сервер при claim
 * пересчитывает время ПО СВОИМ ЧАСАМ и возвращает авторитетный баланс — он и
 * есть источник истины. Записать здесь ещё и постоянную операцию значило бы
 * посчитать одни и те же минуты дважды: один раз локальной распиской, второй —
 * серверной. Поэтому это ЧИСТО ЭКРАННЫЙ overlay поверх снапшота: он живёт, пока
 * идёт просмотр, и снимается ответом сервера (`mergeAuthoritativeStars`).
 * Пропажа overlay при крахе ничего не стоит — время просмотра хранит серверная
 * сессия, а не телефон (правило «празднование не ставится в durable-очередь»).
 *
 * `baseline` — баланс на момент старта просмотра. Пишем всегда от него, а не
 * «+= delta», иначе повторный вызов с тем же значением наращивал бы цифру.
 */
export function showVideoWatchRunesInGlobalBalance(
  token: AccountGenerationToken,
  input: Readonly<{ alreadyShownRunes: number; earnedRunes: number }>,
): number {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    return Math.max(0, Math.trunc(input.alreadyShownRunes));
  }
  const alreadyShown = Math.max(0, Math.trunc(input.alreadyShownRunes));
  const earned = Math.max(0, Math.trunc(input.earnedRunes));
  if (!Number.isSafeInteger(alreadyShown) || !Number.isSafeInteger(earned)) return alreadyShown;
  // Показываем ТОЛЬКО прирост с прошлого раза.
  //
  // зачем инкремент, а не «базис + всего заработано» (замерено симуляцией
  // 2026-09-21): при абсолютном значении хватало ОДНОЙ чужой награды во время
  // просмотра, чтобы счётчик замер. Награда за урок поднимала баланс выше
  // нашей цели, защита от понижения честно отбрасывала патч — и следующие
  // минуты просмотра человек уже не видел. Инкремент складывается с чем угодно:
  // сколько накапало, столько и прибавили.
  const delta = earned - alreadyShown;
  if (delta <= 0) return alreadyShown;
  patchAppSnapshot((current) => {
    if (!current.progress) return {};
    const currentStars = Math.max(0, Math.trunc(current.progress.stars ?? 0));
    // Прибавляем к ТЕКУЩЕМУ числу, поэтому руны, пришедшие во время просмотра
    // из другого источника (награда за урок, покупка, ответ сервера), остаются
    // на месте. Сработавший здесь DATA-SAFETY-GUARD был прав: прежняя
    // безусловная запись `stars: target` их стирала — прямая потеря валюты
    // (класс бага «клиент понизил баланс», 3 инцидента в проекте).
    return {
      progress: {
        ...current.progress,
        source: 'local',
        updatedAt: Date.now(),
        stars: currentStars + delta,
      },
    };
  });
  return earned;
}

/**
 * Дешёвое чтение баланса рун для СТАРТОВОЙ гидратации снапшота.
 *
 * зачем (владелец, 2026-08-24, «руны на Главной ждут подгрузки и показывают
 * ноль»): полное восстановление (`readUnifiedLevelSpinStars` -> `recoverProjection`)
 * сканирует ВСЕ ключи AsyncStorage, чинит outbox и пишет обратно — на холодном
 * старте это дорого и поздно, поэтому загрузчик его не звал вовсе. В итоге
 * `buildProgressSnapshot` брал руны из пустой памяти процесса (`stars ?? 0`), и
 * первый кадр честно рисовал ноль.
 *
 * Здесь только один `getItem` уже записанной проекции: без починки, без записи,
 * без сканирования. Результат — то же число, что покажет полное восстановление
 * секундой позже, поэтому «прыжка» после догрузки не будет. Битая или пустая
 * проекция даёт `null` — загрузчик тогда просто не трогает секцию, а не обнуляет её.
 */
export async function peekStoredLevelSpinStarsForBoot(
  token: AccountGenerationToken,
): Promise<Readonly<{ balance: number; earnedTotal: number }> | null> {
  const ownerStableId = token.stableId?.trim();
  // зачем (правило «немых выходов нет»; эмулятор 01.10: Главная рисовала 0 монет 14 с):
  // каждый ранний выход говорит, почему стартовый снимок остался без монет.
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    console.warn('[HOME-COINS] boot:skip', JSON.stringify({ reason: ownerStableId ? 'stale_generation' : 'no_stable_id', phase: token.phase }));
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId));
    if (raw === null) {
      console.warn('[HOME-COINS] boot:skip', JSON.stringify({ reason: 'no_projection_on_disk' }));
      return null;
    }
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      console.warn('[HOME-COINS] boot:skip', JSON.stringify({ reason: 'generation_changed_during_read' }));
      return null;
    }
    const visible = visibleProjection(parseProjection(raw, ownerStableId));
    console.log('[HOME-COINS] boot:read', JSON.stringify({ balance: visible.balance }));
    return visible;
  } catch (error: unknown) {
    // Проекция битая — её починит recoverProjection в обычном потоке. Показать
    // «неизвестно» и дать снапшоту остаться прежним честнее, чем нарисовать 0.
    console.warn('[HOME-COINS] boot:skip', JSON.stringify({ reason: 'projection_parse_failed', message: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}

// зачем (§99, 03.10): функции покупки за руны (косметика, платный спин, допответы диалога) удалены — у них не осталось
// ни одного вызова (всё снято в 2.0: D09/D102/D124). Старые операции читаются в modules/phone-state/domains/economy, сервер не тронут.

export type PreparedSessionAttemptRuneRecovery = Readonly<{
  duplicate: boolean;
  operation: SessionAttemptRuneRecoveryExactResultV1;
  balanceBefore: number;
  balanceAfter: number;
  durableWrites: readonly (readonly [string, string])[];
}>;

/**
 * Builds the closed rune-debit + attempts-grant receipt and its exact local
 * projection writes. This function never writes them: the attempts recovery
 * coordinator owns the one multiSet that also persists the attempts receipt.
 */
export async function prepareSessionAttemptRuneRecovery(input: Readonly<{
  token: AccountGenerationToken;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  createdAtMs?: number;
}>, accountTransitionLockLease?: AccountTransitionLockLease): Promise<PreparedSessionAttemptRuneRecovery> {
  const ownerStableId = input.token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const operationId = sessionAttemptRuneRecoveryOperationId(input.sessionId, input.recoveryOrdinal);
  return withAccountTransitionLock(async (lease) => {
    await recoverProjection(input.token, lease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      const operationKey = operationStorageKey(ownerStableId, operationId);
      const [projectionRaw, existingRaw] = await Promise.all([
        AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
        AsyncStorage.getItem(operationKey),
      ]);
      const projection = parseProjection(projectionRaw, ownerStableId);
      if (existingRaw !== null) {
        let parsed: unknown;
        try { parsed = JSON.parse(existingRaw); } catch { runeOperationCorrupt('attempt_recovery', 'json_parse', null, existingRaw); }
        const existing = parseSessionAttemptRuneRecoveryExactResult(parsed);
        if (!existing) runeOperationCorrupt('attempt_recovery', 'parse_failed', parsed, existingRaw);
        if (existing.ownerStableId !== ownerStableId) runeOperationCorrupt('attempt_recovery', 'owner_mismatch', parsed, existingRaw);
        if (!await hasValidSessionAttemptRuneRecoveryFingerprint(existing)) {
          runeOperationCorrupt('attempt_recovery', 'fingerprint_invalid', parsed, existingRaw);
        }
        if (existing.operationId !== operationId
          || existing.sessionId !== input.sessionId
          || existing.questionId !== input.questionId
          || existing.recoveryOrdinal !== input.recoveryOrdinal) {
          throw new Error('level_spin_star_request_conflict');
        }
        return Object.freeze({
          duplicate: true,
          operation: existing,
          balanceBefore: existing.balanceBefore,
          balanceAfter: existing.balanceAfter,
          durableWrites: Object.freeze([]),
        });
      }

      const balanceBefore = visibleProjection(projection).balance;
      if (balanceBefore < 25) throw new Error('session_attempt_runes_insufficient');
      const balanceAfter = balanceBefore - 25;
      const operation: SessionAttemptRuneRecoveryExactResultV1 = Object.freeze({
        schemaVersion: 'client-session-attempt-recovery-rune-operation.v1',
        operationId,
        ownerStableId,
        accountGeneration: input.token.generation,
        sessionId: input.sessionId,
        questionId: input.questionId,
        recoveryOrdinal: input.recoveryOrdinal,
        runeDelta: -25,
        attemptsGranted: 3,
        balanceBefore,
        balanceAfter,
        reason: 'restore_all_session_attempts',
        createdAtMs: input.createdAtMs ?? Date.now(),
        requestFingerprint: await fingerprintForSessionAttemptRecovery({
          ownerStableId,
          accountGeneration: input.token.generation,
          sessionId: input.sessionId,
          questionId: input.questionId,
          recoveryOrdinal: input.recoveryOrdinal,
          balanceBefore,
          balanceAfter,
        }),
      });
      if (!parseSessionAttemptRuneRecoveryExactResult(operation)) {
        throw new Error('session_attempt_rune_operation_invalid');
      }
      const nextProjection = withOperations(projection, [operation]);
      if (visibleProjection(nextProjection).balance !== balanceAfter) {
        throw new Error('session_attempt_rune_projection_invalid');
      }
      return Object.freeze({
        duplicate: false,
        operation,
        balanceBefore,
        balanceAfter,
        durableWrites: Object.freeze([
          Object.freeze([operationKey, JSON.stringify(operation)] as const),
          Object.freeze([levelSpinStarProjectionKey(ownerStableId), JSON.stringify(nextProjection)] as const),
        ]),
      });
    });
  }, accountTransitionLockLease);
}

export async function enqueueLevelSpinStarGrant(
  input: Readonly<{
    token: AccountGenerationToken;
    requestId: string;
    lane: LevelSpinStarLane;
    deliveryToken?: string;
    giftId: string;
    promotionEligibility?: 'gameplay' | 'excluded_compensation';
  }>,
  options: Readonly<{
    syncNow?: boolean;
    /** Internal capability propagated by an existing account-transition critical section. */
    accountTransitionLockLease?: AccountTransitionLockLease;
  }> = {},
): Promise<void> {
  const ownerStableId = input.token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const requestId = input.requestId.trim();
  if (!REQUEST_ID_RE.test(requestId)) throw new Error('level_spin_star_request_invalid');
  if (input.deliveryToken !== undefined && !DELIVERY_TOKEN_RE.test(input.deliveryToken.trim())) {
    throw new Error('level_spin_star_delivery_token_invalid');
  }
  const giftId = input.giftId as LevelSpinStarGiftId;
  const promotionEligibility = input.promotionEligibility ?? 'gameplay';
  const createdAtMs = Date.now();
  const amount = levelSpinStarOperationAmountV1({ requestId, giftId, promotionEligibility, createdAtMs });
  const operationId = operationIdFor(requestId, input.lane);
  const deliveryToken = input.deliveryToken?.trim();
  const requestFingerprint = await fingerprintFor({
    ownerStableId, requestId, lane: input.lane, ...(deliveryToken ? { deliveryToken } : {}),
    giftId, amount, promotionEligibility,
  });
  if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const operation: LevelSpinStarOperation = Object.freeze({
    schemaVersion: 'client-level-spin-star-operation.v1',
    operationId,
    ownerStableId,
    requestId,
    lane: input.lane,
    ...(deliveryToken ? { deliveryToken } : {}),
    giftId,
    amount,
    promotionEligibility,
    reason: 'level_spin_star_reward',
    grant: Object.freeze({
      kind: 'star_credit',
      subjectId: operationId,
      payload: Object.freeze({ requestId, lane: input.lane, giftId, amount }),
    }),
    createdAtMs,
    requestFingerprint,
  });

  const committedProjection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(input.token, lease);
    return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const operationKey = operationStorageKey(ownerStableId, operationId);
    const [existingRaw, outboxRaw, projectionRaw, preparedRaw] = await Promise.all([
      AsyncStorage.getItem(operationKey),
      AsyncStorage.getItem(levelSpinStarGrantOutboxKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
      AsyncStorage.getItem(levelSpinStarPreparedKey(ownerStableId)),
    ]);
    let existingValue: unknown = null;
    try { existingValue = existingRaw ? JSON.parse(existingRaw) as unknown : null; } catch {
      runeOperationCorrupt('star_grant', 'json_parse', null, existingRaw);
    }
    const existing = existingRaw ? parseStarOperation(existingValue, ownerStableId) : null;
    if (existingRaw && !existing) runeOperationCorrupt('star_grant', 'parse_failed', existingValue, existingRaw);
    if (existing) {
      if (existing.requestId !== requestId || existing.lane !== input.lane ||
        existing.deliveryToken !== deliveryToken || existing.giftId !== giftId ||
        (existing.promotionEligibility !== undefined &&
          existing.promotionEligibility !== promotionEligibility)) {
        throw new Error('level_spin_star_request_conflict');
      }
      return observeCurrentSnapshot(parseProjection(projectionRaw, ownerStableId));
    }
    const outbox = parseOutbox(outboxRaw, ownerStableId);
    if (outbox.length >= MAX_PENDING_STAR_OPERATIONS) throw new Error('level_spin_star_outbox_full');
    const prepared = parsePrepared(preparedRaw, ownerStableId);
    const priorPreparedValue = prepared.find((candidate) => candidate.operationId === operationId);
    const priorPrepared = priorPreparedValue
      ? parseStarOperation(priorPreparedValue, ownerStableId)
      : null;
    if (priorPreparedValue && !priorPrepared) {
      throw new Error('level_spin_star_request_conflict');
    }
    if (priorPrepared && (priorPrepared.requestId !== requestId ||
      priorPrepared.lane !== input.lane || priorPrepared.deliveryToken !== deliveryToken ||
      priorPrepared.giftId !== giftId ||
      (priorPrepared.promotionEligibility !== undefined &&
        priorPrepared.promotionEligibility !== promotionEligibility))) {
      throw new Error('level_spin_star_request_conflict');
    }
    if (prepared.length >= MAX_PENDING_STAR_OPERATIONS && !priorPrepared) {
      throw new Error('level_spin_star_outbox_full');
    }
    const sealedOperation = priorPrepared ?? operation;
    const nextPrepared = priorPrepared ? prepared : [...prepared, sealedOperation];
    const projection = observeCurrentSnapshot(withOperations(
      parseProjection(projectionRaw, ownerStableId),
      [sealedOperation],
    ));
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(levelSpinStarPreparedKey(ownerStableId), JSON.stringify(nextPrepared));
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.multiSet([
      [operationKey, JSON.stringify(sealedOperation)],
      [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(projection)],
      [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify([...outbox, sealedOperation])],
    ]);
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    await AsyncStorage.setItem(
      levelSpinStarPreparedKey(ownerStableId),
      JSON.stringify(prepared.filter((candidate) => candidate.operationId !== operationId)),
    );
    return projection;
    });
  }, options.accountTransitionLockLease);

  publishProjection(input.token, committedProjection);
  if (options.syncNow !== false) void syncPendingLevelSpinStarGrants(input.token).catch(noteSwallowedHandler('level_spin_star_grants:promise_2'));
}

/**
 * Делает заработанные в практике руны частью локального журнала ДО сети.
 * Операция идемпотентна и восстанавливается из AsyncStorage после перезапуска.
 */
export async function commitPracticeRuneGrantLocally(
  token: AccountGenerationToken,
  operationInput: PracticeRuneOperation,
): Promise<void> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const operation = parsePracticeRuneOperation(operationInput, ownerStableId);
  if (!operation || !await hasValidPracticeRuneFingerprint(operation)) {
    throw new Error('practice_rune_operation_invalid');
  }
  const journalEntryFor = (balanceBefore: number): PracticeRuneJournalEntry => (
    practiceRuneJournalEntryFor(operation, token.generation, balanceBefore)
  );

  const committedProjection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(token, lease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      const operationKey = operationStorageKey(ownerStableId, operation.operationId);
      const journalKey = practiceRuneJournalStorageKey(ownerStableId, operation.operationId);
      const [existingRaw, projectionRaw, preparedRaw, journalRaw] = await Promise.all([
        AsyncStorage.getItem(operationKey),
        AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
        AsyncStorage.getItem(levelSpinStarPreparedKey(ownerStableId)),
        AsyncStorage.getItem(journalKey),
      ]);
      let existingValue: unknown = null;
      try { existingValue = existingRaw ? JSON.parse(existingRaw) as unknown : null; } catch {
        runeOperationCorrupt('practice_rune', 'json_parse', null, existingRaw);
      }
      const existing = existingRaw ? parseLocalRuneOperation(existingValue, ownerStableId) : null;
      if (existingRaw && !existing) runeOperationCorrupt('practice_rune', 'parse_failed', existingValue, existingRaw);
      let journalValue: unknown = null;
      try { journalValue = journalRaw ? JSON.parse(journalRaw) as unknown : null; } catch {
        throw new Error('practice_rune_journal_corrupt');
      }
      const existingJournal = journalRaw
        ? parsePracticeRuneJournalEntry(journalValue, ownerStableId)
        : null;
      if (journalRaw && !existingJournal) throw new Error('practice_rune_journal_corrupt');
      if (existingJournal && (existingJournal.operation.requestFingerprint !== operation.requestFingerprint
        || existingJournal.operation.createdAtMs !== operation.createdAtMs)) {
        throw new Error('level_spin_star_request_conflict');
      }
      const currentProjection = parseProjection(projectionRaw, ownerStableId);
      const acknowledgedFingerprint = currentProjection.acknowledged[operation.operationId];
      if (acknowledgedFingerprint) {
        if (acknowledgedFingerprint !== operation.requestFingerprint) {
          throw new Error('level_spin_star_request_conflict');
        }
        if (!existingJournal) {
          const visible = visibleProjection(currentProjection).balance;
          await AsyncStorage.setItem(journalKey, JSON.stringify(journalEntryFor(
            Math.max(0, visible - operation.amount),
          )));
        }
        return observeCurrentSnapshot(currentProjection);
      }
      if (existing) {
        if (existing.requestFingerprint !== operation.requestFingerprint
          || existing.createdAtMs !== operation.createdAtMs) {
          throw new Error('level_spin_star_request_conflict');
        }
        if (!existingJournal) {
          const visible = visibleProjection(currentProjection).balance;
          await AsyncStorage.setItem(journalKey, JSON.stringify(journalEntryFor(
            Math.max(0, visible - operation.amount),
          )));
        }
        return observeCurrentSnapshot(currentProjection);
      }

      const prepared = parsePrepared(preparedRaw, ownerStableId);
      const priorPrepared = prepared.find((candidate) => candidate.operationId === operation.operationId);
      if (priorPrepared && (priorPrepared.requestFingerprint !== operation.requestFingerprint
        || priorPrepared.createdAtMs !== operation.createdAtMs)) {
        throw new Error('level_spin_star_request_conflict');
      }
      if (prepared.length >= MAX_PENDING_STAR_OPERATIONS && !priorPrepared) {
        throw new Error('level_spin_star_outbox_full');
      }
      const nextPrepared = priorPrepared ? prepared : [...prepared, operation];
      const journalEntry = existingJournal ?? journalEntryFor(
        visibleProjection(currentProjection).balance,
      );
      const projection = observeCurrentSnapshot(withOperations(
        currentProjection,
        [operation],
      ));
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      await AsyncStorage.setItem(levelSpinStarPreparedKey(ownerStableId), JSON.stringify(nextPrepared));
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      await AsyncStorage.multiSet([
        [journalKey, JSON.stringify(journalEntry)],
        [operationKey, JSON.stringify(operation)],
        [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(projection)],
      ]);
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      await AsyncStorage.setItem(
        levelSpinStarPreparedKey(ownerStableId),
        JSON.stringify(prepared.filter((candidate) => candidate.operationId !== operation.operationId)),
      );
      return projection;
    });
  });
  publishProjection(token, committedProjection);
}

/** Replaces the local practice overlay with the monotonic server receipt. */
export async function acknowledgePracticeRuneGrantLocally(
  token: AccountGenerationToken,
  operationInput: PracticeRuneOperation,
  ack: PracticeRuneMaterializationAck,
): Promise<void> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  const operation = parsePracticeRuneOperation(operationInput, ownerStableId);
  if (!operation || !await hasValidPracticeRuneFingerprint(operation)
    || ack.materialized !== true
    || ack.operationId !== operation.operationId
    || ack.requestFingerprint !== operation.requestFingerprint
    || typeof ack.replayed !== 'boolean'
    || !Number.isSafeInteger(ack.starsBalance) || ack.starsBalance < 0
    || !Number.isSafeInteger(ack.starsEarnedTotal) || ack.starsEarnedTotal < 0
    || !Number.isSafeInteger(ack.starsSeq) || ack.starsSeq < 1) {
    throw new Error('practice_rune_ack_invalid');
  }

  const acknowledgedProjection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(token, lease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      const current = parseProjection(
        await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
        ownerStableId,
      );
      const storedOperation = current.operations.find((candidate) => (
        candidate.operationId === operation.operationId
      ));
      if (storedOperation && storedOperation.requestFingerprint !== operation.requestFingerprint) {
        throw new Error('level_spin_star_request_conflict');
      }
      const acknowledged = storedOperation ? {
        ...current.acknowledged,
        [operation.operationId]: operation.requestFingerprint,
      } : current.acknowledged;
      const operationWasUnacknowledged = Boolean(storedOperation)
        && current.acknowledged[operation.operationId] !== operation.requestFingerprint;
      const newer = ack.starsSeq > current.serverSeq;
      // зачем (Q-COIN a, единообразие): при serverSeq 0 большее больше не
      // вписывается в serverBalance — следующая квитанция (seq > 0) законно
      // заменила бы его серверным числом и разница пропала бы. Видимое то же:
      // сервер + разница = max(локальное, серверное).
      const practiceBasis = newer && current.serverSeq === 0
        ? adoptServerBasis({
            path: 'practice_ack',
            ownerStableId,
            currentSeq: current.serverSeq,
            currentLift: unconfirmedLiftOf(current),
            localBasisAfter: current.serverBalance + unconfirmedLiftOf(current)
              + (operationWasUnacknowledged ? operation.amount : 0),
            observedBalance: ack.starsBalance,
            observedSeq: ack.starsSeq,
          })
        : null;
      const next = withUnconfirmedLift(Object.freeze({
        ...current,
        acknowledged: Object.freeze(acknowledged),
        // Exact ack removes this operation's local overlay. Preserve the same
        // visible value even when the cloud snapshot started behind this phone.
        serverBalance: practiceBasis
          ? practiceBasis.serverBalance
          : newer
          ? Math.max(
            current.serverBalance + (operationWasUnacknowledged ? operation.amount : 0),
            ack.starsBalance,
          )
          : current.serverBalance,
        serverEarnedTotal: newer
          ? Math.max(
            current.serverEarnedTotal + (operationWasUnacknowledged ? operation.amount : 0),
            ack.starsEarnedTotal,
          )
          : Math.max(current.serverEarnedTotal, ack.starsEarnedTotal),
        serverSeq: newer ? ack.starsSeq : current.serverSeq,
      }), practiceBasis ? practiceBasis.lift : unconfirmedLiftOf(current));
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        throw new Error('level_spin_star_identity_changed');
      }
      await AsyncStorage.setItem(levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next));
      return next;
    });
  });
  publishProjection(token, acknowledgedProjection);
}

export async function syncPendingLevelSpinStarGrants(
  token: AccountGenerationToken,
): Promise<{ synced: number; pending: number }> {
  const ownerStableId = token.stableId?.trim();
  // зачем (координатор 22.10, «сперва логи»): после клеймов наград очередь не дошла до сервера ни разу,
  // а каждый выход ниже был немым. Метка [COIN-WALLET] — вход, каждый ранний выход, ответ, catch и итог.
  const walletLog = (event: string, fields: Readonly<Record<string, unknown>>): void => {
    console.warn(`[COIN-WALLET] sync:${event}`, JSON.stringify({ owner: ownerStableId?.slice(0, 8) ?? null, ...fields }));
  };
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    walletLog('skip', { reason: ownerStableId ? 'account_generation_stale' : 'owner_missing', generation: token.generation });
    return { synced: 0, pending: 0 };
  }
  const recovered = await recoverProjectionShared(token);
  publishProjection(token, recovered);
  const snapshot = await readOutbox(ownerStableId);
  walletLog('enter', { generation: token.generation, outbox: snapshot.length, ops: snapshot.map((op) => op.operationId).slice(0, 10) });
  let synced = 0;
  for (const operation of snapshot) {
    const op = operation.operationId;
    if (!isCurrentAccountGeneration(token, ownerStableId)) {
      walletLog('stop', { reason: 'account_generation_stale', at: 'loop_start', op });
      break;
    }
    try {
      if (!await hasValidFingerprint(operation)) {
        walletLog('skip_op', { reason: 'fingerprint_invalid', op, promotionEligibility: operation.promotionEligibility ?? null });
        continue;
      }
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        walletLog('stop', { reason: 'account_generation_stale', at: 'after_fingerprint', op });
        break;
      }
      const stored = await commitPhoneStateNonMonetaryEconomyGrant({
        operationId: operation.operationId,
        kind: 'star_credit',
        entitlementId: operation.operationId,
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
        exactResult: operation,
      });
      if (!stored || !isCurrentAccountGeneration(token, ownerStableId)) {
        walletLog('stop', { reason: stored ? 'account_generation_stale' : 'phone_state_commit_refused', at: 'before_network', op, generation: token.generation });
        break;
      }
      const startedAt = Date.now();
      walletLog('call', { op, amount: operation.amount, promotionEligibility: operation.promotionEligibility ?? null });
      const ack = await callLevelSpinStarComposite(operation);
      walletLog('ack', { op, ms: Date.now() - startedAt, materialized: ack.materialized, starsBalance: ack.starsBalance, starsSeq: ack.starsSeq });
      if (!isCurrentAccountGeneration(token, ownerStableId)) {
        walletLog('stop', { reason: 'account_generation_stale', at: 'after_network', op });
        break;
      }
      if (ack.materialized !== true
        || ack.operationId !== operation.operationId
        || ack.requestFingerprint !== operation.requestFingerprint
        || !Number.isSafeInteger(ack.starsBalance) || ack.starsBalance < 0
        || !Number.isSafeInteger(ack.starsEarnedTotal) || ack.starsEarnedTotal < 0
        || !Number.isSafeInteger(ack.starsSeq) || ack.starsSeq < 0) {
        throw new Error('level_spin_star_ack_invalid');
      }
      const ackOperationId = levelSpinStarCreditAckOperationId(operation.operationId);
      if (!ackOperationId) throw new Error('level_spin_star_ack_invalid');
      const ackStored = await commitPhoneStateNonMonetaryEconomyGrant({
        operationId: ackOperationId,
        kind: 'star_credit_ack',
        entitlementId: operation.operationId,
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
        exactResult: Object.freeze({
          schemaVersion: 'client-level-spin-star-ack.v1',
          operationId: operation.operationId,
          ownerStableId,
          requestFingerprint: operation.requestFingerprint,
          starsBalance: ack.starsBalance,
          starsEarnedTotal: ack.starsEarnedTotal,
          starsSeq: ack.starsSeq,
        }),
      });
      if (!ackStored || !isCurrentAccountGeneration(token, ownerStableId)) break;
      const projection = await withAccountTransitionLock(async () => withStorageLock(async () => {
        if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
        const current = await readOutbox(ownerStableId);
        const exact = current.find((candidate) => candidate.operationId === operation.operationId);
        if (!exact || exact.requestFingerprint !== operation.requestFingerprint) return null;
        const currentProjection = withOperations(parseProjection(
          await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
          ownerStableId,
        ), [operation]);
        // зачем (Q-COIN a): квитанция синка при serverSeq 0 раньше ЗАМЕНЯЛА
        // неподтверждённую локальную базу серверной — 9830 → 10 (тест (d)).
        const syncWasUnacknowledged = currentProjection.acknowledged[operation.operationId]
          !== operation.requestFingerprint;
        const syncBasis = ack.starsSeq > currentProjection.serverSeq
          ? adoptServerBasis({
              path: 'sync_ack',
              ownerStableId,
              currentSeq: currentProjection.serverSeq,
              currentLift: unconfirmedLiftOf(currentProjection),
              localBasisAfter: currentProjection.serverBalance + unconfirmedLiftOf(currentProjection)
                + (syncWasUnacknowledged ? operation.amount : 0),
              observedBalance: ack.starsBalance,
              observedSeq: ack.starsSeq,
            })
          : Object.freeze({
              serverBalance: currentProjection.serverBalance,
              lift: unconfirmedLiftOf(currentProjection),
            });
        const next: LevelSpinStarProjection = withUnconfirmedLift(Object.freeze({
          ...currentProjection,
          acknowledged: Object.freeze({
            ...currentProjection.acknowledged,
            [operation.operationId]: operation.requestFingerprint,
          }),
          serverBalance: syncBasis.serverBalance,
          serverEarnedTotal: Math.max(currentProjection.serverEarnedTotal, ack.starsEarnedTotal),
          serverSeq: Math.max(currentProjection.serverSeq, ack.starsSeq),
        }), syncBasis.lift);
        if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
        await AsyncStorage.multiSet([
          [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next)],
          [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify(
            current.filter((candidate) => candidate.operationId !== operation.operationId),
          )],
        ]);
        // зачем (владелец, 2026-09-02): здесь ack-метки стирались ЦЕЛИКОМ
        // (acknowledged: {}), хотя в recoverProjection practice-метки намеренно
        // сохраняются — у практики нет своей durable-квитанции, и её overlay
        // снимается ТОЛЬКО меткой. Стёртая метка возвращала уже зачтённую руну
        // в overlay, то есть задваивала её. Сохраняем practice-метки и тут.
        const compactedIds = next.operations.filter((candidate) => (
          next.acknowledged[candidate.operationId] === candidate.requestFingerprint
          && !candidate.operationId.startsWith('practice_rune:')
        ));
        const compactedIdSet = new Set(compactedIds.map((candidate) => candidate.operationId));
        const compacted: LevelSpinStarProjection = Object.freeze({
          ...next,
          operations: Object.freeze(next.operations.filter((candidate) => (
            !compactedIdSet.has(candidate.operationId)
          ))),
          acknowledged: Object.freeze(Object.fromEntries(
            Object.entries(next.acknowledged).filter(([operationId]) => (
              !compactedIdSet.has(operationId) || operationId.startsWith('practice_rune:')
            )),
          )),
        });
        if (compactedIds.length > 0) {
          await AsyncStorage.multiRemove(compactedIds.map((candidate) => (
            operationStorageKey(ownerStableId, candidate.operationId)
          )));
          if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
          await AsyncStorage.setItem(levelSpinStarProjectionKey(ownerStableId), JSON.stringify(compacted));
        }
        synced += 1;
        return compacted;
      }));
      if (projection) publishProjection(token, projection);
      else walletLog('ack_not_applied', { op, reason: 'outbox_entry_changed_or_account_stale' });
    } catch (e) {
      // Sync is persistence only; the locally committed credit remains durable.
      walletLog('catch', { op, code: (e as { code?: unknown } | null)?.code ?? null, message: e instanceof Error ? e.message : String(e) });
      DebugLogger.error('level_spin_star_grants:compactedIds', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  if (!isCurrentAccountGeneration(token, ownerStableId)) {
    walletLog('done', { synced, pending: null, reason: 'account_generation_stale' });
    return { synced: 0, pending: 0 };
  }
  const pending = (await readOutbox(ownerStableId)).length;
  walletLog('done', { synced, pending });
  return { synced, pending };
}

// ── Q-COIN (b): квитанция серверной сверки coinReconcileV1 ────────────────────

export type CoinReconcileV1Receipt = Readonly<{
  /** Сколько сервер добавил в users/{uid}.stars этой сверкой (0 — нечего было поднимать). */
  raisedBy: number;
  /** operationId спиновых начислений `level_spin:<requestId>.<lane>`, проведённых сверкой. */
  operationIds: readonly string[];
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

/** Нужна ли сверка: есть разница «только на телефоне» или застрявшие спиновые начисления. */
export function coinReconcileV1NeedFor(
  projection: Readonly<{
    operations: readonly { operationId: string; requestFingerprint: string; schemaVersion: string }[];
    acknowledged: Readonly<Record<string, string>>;
    unconfirmedLocalLift?: number;
    coinReconcileV1Applied?: true;
  }>,
): Readonly<{ needed: boolean; lift: number; unackedSpinCredits: number; applied: boolean }> {
  const unackedSpinCredits = projection.operations.filter((operation) => (
    operation.schemaVersion === 'client-level-spin-star-operation.v1'
    && operation.operationId.startsWith('level_spin:')
    && projection.acknowledged[operation.operationId] !== operation.requestFingerprint
  )).length;
  const lift = unconfirmedLiftOf(projection);
  const applied = projection.coinReconcileV1Applied === true;
  return Object.freeze({ needed: !applied && (lift > 0 || unackedSpinCredits > 0), lift, unackedSpinCredits, applied });
}

export async function readCoinReconcileV1Need(
  token: AccountGenerationToken,
): Promise<ReturnType<typeof coinReconcileV1NeedFor>> {
  // зачем (ревью дедупликации 04.10): по ответу решается разовая сверка — считаем сами, без общего промиса.
  return coinReconcileV1NeedFor(await recoverProjection(token));
}

/**
 * Применяет квитанцию сверки РОВНО один раз (метка coinReconcileV1Applied).
 *
 * зачем так: сервер поднял баланс на raisedBy за спиновые начисления, которых
 * не было в журнале. Часть из них ещё висит у телефона overlay-операциями
 * (operationIds) — их помечаем подтверждёнными, иначе монеты задвоятся
 * (сервер + overlay). Остаток raisedBy уже сидел в «разнице только на телефоне» —
 * снимаем его оттуда (не ниже нуля). Видимый баланс от этого НЕ падает:
 * сервер вырос ровно на столько, сколько ушло из overlay и разницы.
 */
export async function applyCoinReconcileReceiptV1(
  token: AccountGenerationToken,
  receipt: CoinReconcileV1Receipt,
): Promise<Readonly<{ balance: number; earnedTotal: number; applied: boolean }>> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('level_spin_star_identity_changed');
  }
  if (!Number.isSafeInteger(receipt.raisedBy) || receipt.raisedBy < 0
    || !Array.isArray(receipt.operationIds) || receipt.operationIds.length > 4_096
    || receipt.operationIds.some((id) => typeof id !== 'string' || !id.startsWith('level_spin:'))
    || !Number.isSafeInteger(receipt.starsBalance) || receipt.starsBalance < 0
    || !Number.isSafeInteger(receipt.starsEarnedTotal) || receipt.starsEarnedTotal < 0
    || !Number.isSafeInteger(receipt.starsSeq) || receipt.starsSeq < 0) {
    DebugLogger.warn('[COIN-RECONCILE]', `apply:receipt_invalid raisedBy=${String(receipt.raisedBy)} seq=${String(receipt.starsSeq)}`);
    throw new Error('coin_reconcile_receipt_invalid');
  }
  let applied = false;
  // зачем: спиновые начисления живут ещё и в PhoneState (star_credit) — после
  // компакции recoverProjection вернёт их из PhoneState как НЕподтверждённые,
  // если рядом нет durable-квитанции. Поэтому, как и синк, сначала пишем
  // квитанцию star_credit_ack в PhoneState и только потом снимаем overlay.
  const before = await recoverProjection(token);
  if (before.coinReconcileV1Applied !== true) {
    for (const operation of before.operations) {
      if (operation.schemaVersion !== 'client-level-spin-star-operation.v1') continue;
      if (!receipt.operationIds.includes(operation.operationId)) continue;
      if (before.acknowledged[operation.operationId] === operation.requestFingerprint) continue;
      const ackOperationId = levelSpinStarCreditAckOperationId(operation.operationId);
      if (!ackOperationId) throw new Error('coin_reconcile_ack_id_invalid');
      const stored = await commitPhoneStateNonMonetaryEconomyGrant({
        operationId: ackOperationId,
        kind: 'star_credit_ack',
        entitlementId: operation.operationId,
        expectedOwnerStableId: ownerStableId,
        expectedAccountGeneration: token.generation,
        exactResult: Object.freeze({
          schemaVersion: 'client-level-spin-star-ack.v1',
          operationId: operation.operationId,
          ownerStableId,
          requestFingerprint: operation.requestFingerprint,
          starsBalance: receipt.starsBalance,
          starsEarnedTotal: receipt.starsEarnedTotal,
          starsSeq: receipt.starsSeq,
        }),
      });
      if (!stored || !isCurrentAccountGeneration(token, ownerStableId)) {
        DebugLogger.warn('[COIN-RECONCILE]', `apply:phone_state_ack_not_stored op=${operation.operationId}`);
        throw new Error('coin_reconcile_phone_state_ack_failed');
      }
    }
  }
  const projection = await withAccountTransitionLock(async (lease) => {
    await recoverProjection(token, lease);
    return withStorageLock(async () => {
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      const current = parseProjection(
        await AsyncStorage.getItem(levelSpinStarProjectionKey(ownerStableId)),
        ownerStableId,
      );
      if (current.coinReconcileV1Applied === true) {
        DebugLogger.info('[COIN-RECONCILE]', `apply:already_applied seq=${current.serverSeq}`);
        return current;
      }
      const reconciled = new Set(receipt.operationIds);
      // Overlay, который покрыла сверка, считаем по состоянию ДО записи квитанций
      // в PhoneState: повторное восстановление выше уже могло снять его само.
      const overlayCovered = before.operations.reduce((total, operation) => (
        operation.schemaVersion === 'client-level-spin-star-operation.v1'
          && reconciled.has(operation.operationId)
          && before.acknowledged[operation.operationId] !== operation.requestFingerprint
          ? total + operation.amount : total
      ), 0);
      const acknowledged: Record<string, string> = { ...current.acknowledged };
      let coveredStillUnacknowledged = 0;
      for (const operation of current.operations) {
        if (operation.schemaVersion !== 'client-level-spin-star-operation.v1') continue;
        if (!reconciled.has(operation.operationId)) continue;
        if (acknowledged[operation.operationId] === operation.requestFingerprint) continue;
        acknowledged[operation.operationId] = operation.requestFingerprint;
        coveredStillUnacknowledged += operation.amount;
      }
      const currentLift = unconfirmedLiftOf(current);
      const newer = receipt.starsSeq > current.serverSeq;
      // Две ветки:
      // • база НЕ была подтверждена (serverSeq 0 до сверки): сервер уже содержит
      //   raisedBy — сравниваем его с локальной базой как первую квитанцию
      //   (большее). Если квитанции PhoneState уже сделали это сами
      //   (current.serverSeq > 0), разницу не трогаем — вычесть ещё раз = потеря.
      // • база подтверждена: сервер заменяет баланс, а из разницы снимаем ту часть
      //   raisedBy, что не была overlay (она и сидела в разнице), не ниже нуля.
      const basis = before.serverSeq === 0
        ? newer && current.serverSeq === 0
          ? adoptServerBasis({
              path: 'reconcile_v1',
              ownerStableId,
              currentSeq: 0,
              currentLift,
              localBasisAfter: current.serverBalance + currentLift + coveredStillUnacknowledged,
              observedBalance: receipt.starsBalance,
              observedSeq: receipt.starsSeq,
            })
          : Object.freeze({
              serverBalance: newer ? receipt.starsBalance : current.serverBalance,
              lift: currentLift,
            })
        : Object.freeze({
            serverBalance: newer ? receipt.starsBalance : current.serverBalance,
            lift: Math.max(0, currentLift - Math.max(0, receipt.raisedBy - overlayCovered)),
          });
      DebugLogger.info('[COIN-RECONCILE]', `apply raisedBy=${receipt.raisedBy} overlayCovered=${overlayCovered} liftBefore=${currentLift} liftAfter=${basis.lift} seqBeforeReconcile=${before.serverSeq} seqNow=${current.serverSeq} receiptSeq=${receipt.starsSeq} newer=${newer}`);
      const next = withUnconfirmedLift(Object.freeze({
        ...current,
        acknowledged: Object.freeze(acknowledged),
        serverBalance: basis.serverBalance,
        serverEarnedTotal: Math.max(current.serverEarnedTotal, receipt.starsEarnedTotal),
        serverSeq: newer ? receipt.starsSeq : current.serverSeq,
        coinReconcileV1Applied: true as const,
      }), basis.lift);
      if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
      // Outbox: подтверждённые сверкой спиновые операции больше не отправляем —
      // кошелёк всё равно отклоняет спины (coin_wallet_source_not_allowed).
      const outbox = await readOutbox(ownerStableId);
      await AsyncStorage.multiSet([
        [levelSpinStarProjectionKey(ownerStableId), JSON.stringify(next)],
        [levelSpinStarGrantOutboxKey(ownerStableId), JSON.stringify(
          outbox.filter((candidate) => !reconciled.has(candidate.operationId)),
        )],
      ]);
      applied = true;
      return next;
    });
  });
  publishProjection(token, projection);
  return Object.freeze({ ...visibleProjection(projection), applied });
}

export default function __RouteShim() { return null; }

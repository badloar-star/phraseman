import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { BONUS_ENERGY_KEY } from './bonus_energy_store';
import { requireGiftAccountStorageKey } from './gift_account_storage';
import { parseBonusEnergyStorageValue } from './spin_gift_storage_integrity';
import { withStorageLock } from './storage_mutex';
import { ENERGY_BASE_CAPACITY, ENERGY_BONUS_CAPACITY_LIMIT, ENERGY_PERMANENT_CAPACITY_LIMIT } from './energy_contract';

const ENERGY_KEY = 'energy_state';
const OP_PREFIX = 'energy_session_operation_v1:';
const PREPARED_PREFIX = 'energy_session_prepared_v1:';
const GRANT_PREFIX = 'energy_session_grant_receipt_v1:';
const ACK_PREFIX = 'energy_session_ack_v1:';
const STATE_PREFIX = 'energy_session_ledger_state_v1:';
const REFUND_CREDIT_PREFIX = 'energy_session_refund_credit_v1:';
const REFUND_REQUEST_PREFIX = 'energy_session_refund_request_v1:';
const ABORT_PREFIX = 'energy_session_abort_v1:';
const OP_ID_RE = /^[A-Za-z0-9_:-]{8,120}$/;
const TOKEN_RE = /^[A-Za-z0-9_.:-]{1,160}$/;

export type EnergySessionGrant = Readonly<{
  kind: string;
  subjectId: string;
  attemptId: string;
}>;

export type EnergySessionIntent = Readonly<{
  operationId: string;
  grant: EnergySessionGrant;
}>;

export type EnergySessionProjection = Readonly<{
  schemaVersion: 2;
  baseEnergy: number;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
  refundCredit: number;
  lastSettledAt: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
  maxEnergy: number;
}>;

type LegacyEnergySessionProjection = Readonly<{
  schemaVersion?: undefined;
  baseEnergy: number;
  bonusEnergy: number;
  bonusCapacity?: number;
  bonusExpiresAt: number;
  refundCredit: number;
  lastRecoveryTime: number;
  maxEnergy: number;
}>;

type EnergySessionProjectionInput = EnergySessionProjection | LegacyEnergySessionProjection;

type EnergySplit = Readonly<{ bonus: number; refundCredit: number; base: number }>;

export type EnergySessionOperation = Readonly<{
  schemaVersion: 'energy-session-operation.v1' | 'energy-session-operation.v2';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  bootId: string;
  direction: 'debit' | 'refund';
  cost: number;
  reason: string;
  grant: EnergySessionGrant;
  reversesOperationId: string | null;
  split: EnergySplit;
  projectionBefore: EnergySessionProjection;
  projectionAfter: EnergySessionProjection;
  revision: number;
  createdAtMs: number;
  requestFingerprint: string;
}>;

type Prepared = Readonly<{
  schemaVersion: 'energy-session-prepared.v1';
  ownerStableId: string;
  operation: EnergySessionOperation;
  preparedAtMs: number;
}>;

type LedgerState = Readonly<{
  schemaVersion: 'energy-session-ledger-state.v1';
  ownerStableId: string;
  revision: number;
  headOperationId: string | null;
  projection: EnergySessionProjection;
  updatedAtMs: number;
}>;

type GrantReceipt = Readonly<{
  schemaVersion: 'energy-session-grant-receipt.v1';
  ownerStableId: string;
  operationId: string;
  requestFingerprint: string;
  grant: EnergySessionGrant;
  createdAtMs: number;
}>;

type EnergySessionAck = Readonly<{
  schemaVersion: 'energy-session-ack.v1';
  ownerStableId: string;
  operationId: string;
  requestFingerprint: string;
  acknowledgedAtMs: number;
}>;

export type EnergySessionStartStatus =
  | Readonly<{ status: 'missing' | 'prepared' | 'charged' | 'refunded' | 'acknowledged' | 'stale_account' }>
  | Readonly<{ status: 'unavailable'; reason: string }>;

type RefundRequest = Readonly<{
  schemaVersion: 'energy-session-refund-request.v1';
  ownerStableId: string;
  originalOperationId: string;
  reason: string;
  requestedAtMs: number;
}>;

type AbortRecord = Readonly<{
  schemaVersion: 'energy-session-abort.v1';
  ownerStableId: string;
  operationId: string;
  requestFingerprint: string;
  reason: 'insufficient';
}>;

export type EnergySessionCommitResult =
  | Readonly<{ status: 'applied' | 'already-applied'; operation: EnergySessionOperation; projection: EnergySessionProjection }>
  | Readonly<{ status: 'reversed'; operation: EnergySessionOperation; projection: EnergySessionProjection }>
  | Readonly<{ status: 'insufficient'; projection: EnergySessionProjection }>
  | Readonly<{ status: 'failed'; reason: string }>;

const ownerPart = (owner: string): string => encodeURIComponent(owner);
const opKey = (owner: string, operationId: string): string => `${OP_PREFIX}${ownerPart(owner)}:${operationId}`;
const preparedKey = (owner: string, operationId: string): string => `${PREPARED_PREFIX}${ownerPart(owner)}:${operationId}`;
const grantKey = (owner: string, operationId: string): string => `${GRANT_PREFIX}${ownerPart(owner)}:${operationId}`;
const ackKey = (owner: string, operationId: string): string => `${ACK_PREFIX}${ownerPart(owner)}:${operationId}`;
const stateKey = (owner: string): string => `${STATE_PREFIX}${ownerPart(owner)}`;
const refundCreditKey = (owner: string): string => `${REFUND_CREDIT_PREFIX}${ownerPart(owner)}`;
const refundRequestKey = (owner: string, operationId: string): string => `${REFUND_REQUEST_PREFIX}${ownerPart(owner)}:${operationId}`;
const refundOperationId = (operationId: string): string => `${operationId.slice(0, 112)}:refund`;
const abortKey = (owner: string, operationId: string): string => `${ABORT_PREFIX}${ownerPart(owner)}:${operationId}`;

function safeToken(value: string, fallback: string): string {
  const normalized = String(value ?? '').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 150);
  return normalized || fallback;
}

function compactOperationToken(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193);
    hashB = Math.imul(hashB ^ code, 0x85ebca6b);
  }
  const digest = `${(hashA >>> 0).toString(16).padStart(8, '0')}${(hashB >>> 0).toString(16).padStart(8, '0')}`;
  return `${value.slice(0, maxLength - digest.length - 1)}-${digest}`;
}

export function createEnergySessionIntent(
  kind: string,
  subjectId: string,
  attemptId: string = Crypto.randomUUID(),
): EnergySessionIntent {
  const safeKind = safeToken(kind, 'session');
  const safeSubject = safeToken(subjectId, 'unknown');
  const safeAttempt = safeToken(attemptId, Crypto.randomUUID());
  return Object.freeze({
    operationId: `energy:${compactOperationToken(safeKind, 32)}:${compactOperationToken(safeAttempt, 72)}`,
    grant: Object.freeze({ kind: safeKind, subjectId: safeSubject, attemptId: safeAttempt }),
  });
}

// зачем (баг 01.10, «Дизайн»: «Начать диалог» — мёртвая кнопка, operation_id_conflict):
// временная трассировка — какой номер операции столкнулся и с чем (сценарий/попытка старая и новая).
function logEnergyOperationConflict(site: string, incoming: unknown, existing: unknown): void {
  const view = (value: unknown) => {
    const op = value as { operationId?: unknown; grant?: unknown; createdAtMs?: unknown } | null;
    return { operationId: op?.operationId, grant: op?.grant, createdAtMs: op?.createdAtMs };
  };
  console.warn('[ENERGY-CONFLICT]', JSON.stringify({ site, incoming: view(incoming), existing: view(existing) }));
}

export function createEnergySessionBootId(): string {
  return `boot:${safeToken(Crypto.randomUUID(), String(Date.now()))}`;
}

function finiteInt(value: unknown, min = 0): number | null {
  return Number.isSafeInteger(value) && Number(value) >= min ? Number(value) : null;
}

/**
 * зачем (PM-081, D06): шкала 1..5 первой версии теперь совпадает с новой
 * шкалой 0..5, поэтому множитель старых записей = 5/5 = 1 (было ×20 под 100).
 */
const LEGACY_V1_PROJECTION_SCALE = ENERGY_BASE_CAPACITY / 5;

/**
 * Приводит сохранённую проекцию эпохи «запас 100–260» к потолку 5.
 *
 * зачем (PM-081): состояние журнала и записи операций лежат на диске с
 * maxEnergy=100…260. Без этого приведения validateProjection отверг бы их как
 * испорченные, readState бросил бы energy_session_ledger_state_corrupt — и
 * у КАЖДОГО обновившегося человека перестали бы открываться занятия. Запас
 * срезаем до 5, кредит возвратов — тоже до 5 (старые возвраты были в единицах
 * по 10–25, иначе один старый возврат дал бы десятки бесплатных занятий).
 * Нецелые/битые значения не трогаем — их отвергнет validateProjection.
 */
function clampProjectionToCapacity(value: EnergySessionProjection): EnergySessionProjection {
  if (
    !Number.isSafeInteger(value.maxEnergy)
    || !Number.isSafeInteger(value.baseEnergy)
    || !Number.isSafeInteger(value.refundCredit)
  ) return value;
  if (
    value.maxEnergy <= ENERGY_PERMANENT_CAPACITY_LIMIT
    && value.baseEnergy <= ENERGY_PERMANENT_CAPACITY_LIMIT
    && value.refundCredit <= ENERGY_BASE_CAPACITY
  ) return value;
  const maxEnergy = Math.min(ENERGY_PERMANENT_CAPACITY_LIMIT, Math.max(ENERGY_BASE_CAPACITY, value.maxEnergy));
  return {
    ...value,
    maxEnergy,
    baseEnergy: Math.min(maxEnergy, Math.max(0, value.baseEnergy)),
    refundCredit: Math.min(ENERGY_BASE_CAPACITY, Math.max(0, value.refundCredit)),
  };
}

function upgradeProjection(value: EnergySessionProjectionInput): EnergySessionProjection {
  if (value.schemaVersion === 2) return clampProjectionToCapacity(value);
  const scale = LEGACY_V1_PROJECTION_SCALE;
  return {
    schemaVersion: 2,
    baseEnergy: Math.min(ENERGY_BASE_CAPACITY, Math.max(0, Math.floor(value.baseEnergy * scale))),
    bonusEnergy: Math.min(ENERGY_BONUS_CAPACITY_LIMIT, Math.max(0, Math.floor(value.bonusEnergy * scale))),
    bonusCapacity: Math.min(
      ENERGY_BONUS_CAPACITY_LIMIT,
      Math.max(0, Math.floor((value.bonusCapacity ?? value.bonusEnergy) * scale)),
    ),
    bonusExpiresAt: value.bonusExpiresAt,
    refundCredit: Math.max(0, Math.floor(value.refundCredit * scale)),
    lastSettledAt: value.lastRecoveryTime,
    recoveryCreditMicrounits: 0,
    recoveryDivisionRemainder: 0,
    maxEnergy: ENERGY_BASE_CAPACITY,
  };
}

function validateProjection(value: EnergySessionProjection): void {
  if (
    value.schemaVersion !== 2
    ||
    finiteInt(value.baseEnergy) === null
    || finiteInt(value.bonusEnergy) === null
    || finiteInt(value.bonusCapacity) === null
    || value.bonusCapacity < value.bonusEnergy
    || finiteInt(value.refundCredit) === null
    || finiteInt(value.lastSettledAt, 1) === null
    || finiteInt(value.recoveryCreditMicrounits) === null
    || finiteInt(value.recoveryDivisionRemainder) === null
    || finiteInt(value.maxEnergy, ENERGY_BASE_CAPACITY) === null
    || value.maxEnergy > ENERGY_PERMANENT_CAPACITY_LIMIT
    || value.baseEnergy > value.maxEnergy
    || !Number.isFinite(value.bonusExpiresAt)
    || value.bonusExpiresAt < 0
  ) throw new Error('energy_session_projection_invalid');
}

function validateIntent(intent: EnergySessionIntent): void {
  if (!OP_ID_RE.test(intent.operationId)) throw new Error('invalid_operation_id');
  if (!TOKEN_RE.test(intent.grant.kind) || !TOKEN_RE.test(intent.grant.subjectId) || !TOKEN_RE.test(intent.grant.attemptId)) {
    throw new Error('invalid_energy_session_grant');
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non_finite_energy_session_payload');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  throw new Error('unsupported_energy_session_payload');
}

async function fingerprint(value: unknown): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical(value));
}

function publicRequest(input: {
  operationId: string;
  ownerStableId: string;
  direction: 'debit' | 'refund';
  cost: number;
  reason: string;
  grant: EnergySessionGrant;
  reversesOperationId: string | null;
}): unknown {
  return input;
}

function parseOperation(raw: string | null, owner: string): EnergySessionOperation | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Omit<EnergySessionOperation, 'projectionBefore' | 'projectionAfter'> & {
      projectionBefore: EnergySessionProjectionInput;
      projectionAfter: EnergySessionProjectionInput;
    };
    const migratedLegacyProjection = stored.schemaVersion === 'energy-session-operation.v1'
      && stored.projectionBefore.schemaVersion !== 2;
    const value: EnergySessionOperation = {
      ...stored,
      // PM-081: шкала v1 (1..5) совпадает с новой (0..5) — множитель 1.
      cost: migratedLegacyProjection ? stored.cost * LEGACY_V1_PROJECTION_SCALE : stored.cost,
      split: migratedLegacyProjection ? {
        bonus: stored.split.bonus * LEGACY_V1_PROJECTION_SCALE,
        refundCredit: stored.split.refundCredit * LEGACY_V1_PROJECTION_SCALE,
        base: stored.split.base * LEGACY_V1_PROJECTION_SCALE,
      } : stored.split,
      projectionBefore: upgradeProjection(stored.projectionBefore),
      projectionAfter: upgradeProjection(stored.projectionAfter),
    };
    validateProjection(value.projectionBefore);
    validateProjection(value.projectionAfter);
    if (
      (value.schemaVersion !== 'energy-session-operation.v1'
        && value.schemaVersion !== 'energy-session-operation.v2')
      || value.ownerStableId !== owner
      || !OP_ID_RE.test(value.operationId)
      || !TOKEN_RE.test(value.bootId)
      || !TOKEN_RE.test(value.reason)
      || (value.direction !== 'debit' && value.direction !== 'refund')
      || finiteInt(value.cost, 1) === null
      || finiteInt(value.revision, 1) === null
      || finiteInt(value.createdAtMs, 1) === null
      || !/^[a-f0-9]{64}$/.test(value.requestFingerprint)
    ) return null;
    validateIntent({ operationId: value.operationId, grant: value.grant });
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:operation_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parsePrepared(raw: string | null, owner: string): Prepared | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Prepared;
    if (value.schemaVersion !== 'energy-session-prepared.v1' || value.ownerStableId !== owner) return null;
    const operation = parseOperation(JSON.stringify(value.operation), owner);
    return operation ? { ...value, operation } : null;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:prepared_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parseState(raw: string | null, owner: string): LedgerState | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Omit<LedgerState, 'projection'> & {
      projection: EnergySessionProjectionInput;
    };
    const value: LedgerState = { ...stored, projection: upgradeProjection(stored.projection) };
    validateProjection(value.projection);
    if (
      value.schemaVersion !== 'energy-session-ledger-state.v1'
      || value.ownerStableId !== owner
      || finiteInt(value.revision) === null
      || (value.headOperationId !== null && !OP_ID_RE.test(value.headOperationId))
    ) return null;
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:state_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parseGrantReceipt(raw: string | null, owner: string, operationId: string): GrantReceipt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as GrantReceipt;
    validateIntent({ operationId: value.operationId, grant: value.grant });
    if (
      value.schemaVersion !== 'energy-session-grant-receipt.v1'
      || value.ownerStableId !== owner
      || value.operationId !== operationId
      || !/^[a-f0-9]{64}$/.test(value.requestFingerprint)
      || finiteInt(value.createdAtMs, 1) === null
    ) return null;
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:grant_receipt_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parseEnergySessionAck(raw: string | null, owner: string, operationId: string): EnergySessionAck | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as EnergySessionAck;
    if (
      value.schemaVersion !== 'energy-session-ack.v1'
      || value.ownerStableId !== owner
      || value.operationId !== operationId
      || !/^[a-f0-9]{64}$/.test(value.requestFingerprint)
      || finiteInt(value.acknowledgedAtMs, 1) === null
    ) return null;
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:ack_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parseRefundRequest(raw: string | null, owner: string): RefundRequest | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as RefundRequest;
    if (
      value.schemaVersion !== 'energy-session-refund-request.v1'
      || value.ownerStableId !== owner
      || !OP_ID_RE.test(value.originalOperationId)
      || !TOKEN_RE.test(value.reason)
      || finiteInt(value.requestedAtMs, 1) === null
    ) return null;
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:refund_request_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

function parseAbort(raw: string | null, owner: string, operationId: string): AbortRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as AbortRecord;
    if (
      value.schemaVersion !== 'energy-session-abort.v1'
      || value.ownerStableId !== owner
      || value.operationId !== operationId
      || value.reason !== 'insufficient'
      || !/^[a-f0-9]{64}$/.test(value.requestFingerprint)
    ) return null;
    return value;
  } catch (error) {
    console.warn('[ENERGY-LEDGER] parse:abort_invalid →null', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    return null;
  }
}

/**
 * Дольше этого полный скан индекса здесь уже ощущается как заминка при старте
 * активности. Логируем только выбросы, чтобы журнал не захлебнулся.
 */
const PREPARED_SCAN_SLOW_MS = 120;

async function assertNoOtherPrepared(owner: string, allowedOperationId: string): Promise<void> {
  const prefix = `${PREPARED_PREFIX}${ownerPart(owner)}:`;
  const abortPrefix = `${ABORT_PREFIX}${ownerPart(owner)}:`;
  // зачем (владелец 2026-09-22, «после 5 минут переходов начало лагать»): это
  // ПОЛНЫЙ скан индекса AsyncStorage, и он выполняется при подготовке КАЖДОЙ
  // траты энергии, то есть на старте каждой активности. Индекс растёт за
  // сессию, поэтому скан дорожает по ходу игры.
  //
  // Логика НЕ меняется намеренно: пакет 21.09 оставил эту функцию вне области
  // с прямым обоснованием — ошибка здесь стоит потерянной или дважды списанной
  // энергии, поэтому сперва факты с устройства. Замер их и даёт: он ничего не
  // решает, только называет цену.
  const scanStartedAt = Date.now();
  const keys = await AsyncStorage.getAllKeys();
  const scanMs = Date.now() - scanStartedAt;
  if (scanMs >= PREPARED_SCAN_SLOW_MS) {
    console.warn(`[ENERGY-LEDGER] полный скан индекса при подготовке траты: ${scanMs}мс, `
      + `ключей=${keys.length} (порог ${PREPARED_SCAN_SLOW_MS}мс)`);
  }
  for (const key of keys) {
    if (key.startsWith(abortPrefix) && !key.endsWith(`:${allowedOperationId}`)) {
      const abortedOperationId = key.slice(abortPrefix.length);
      const abort = parseAbort(await AsyncStorage.getItem(key), owner, abortedOperationId);
      if (!abort) throw new Error('energy_session_abort_corrupt');
      throw new Error('energy_session_pending_operation');
    }
    if (!key.startsWith(prefix) || key.endsWith(`:${allowedOperationId}`)) continue;
    const pending = parsePrepared(await AsyncStorage.getItem(key), owner);
    if (!pending) throw new Error('energy_session_prepared_corrupt');
    throw new Error('energy_session_pending_operation');
  }
}

function normalizedProjection(projectionInput: EnergySessionProjectionInput, nowMs: number): EnergySessionProjection {
  const projection = upgradeProjection(projectionInput);
  validateProjection(projection);
  if ((projection.bonusEnergy > 0 || projection.bonusCapacity > 0)
    && projection.bonusExpiresAt <= nowMs) {
    return { ...projection, bonusEnergy: 0, bonusCapacity: 0, bonusExpiresAt: 0 };
  }
  return projection;
}

export function planEnergySessionDebit(
  projectionInput: EnergySessionProjectionInput,
  costInput: number,
  nowMs: number,
): Readonly<{ split: EnergySplit; after: EnergySessionProjection }> | null {
  const cost = finiteInt(Math.floor(costInput), 1);
  if (cost === null) throw new Error('energy_session_cost_invalid');
  const before = normalizedProjection(projectionInput, nowMs);
  if (before.bonusEnergy + before.refundCredit + before.baseEnergy < cost) return null;
  const bonus = Math.min(cost, before.bonusEnergy);
  const remainingAfterBonus = cost - bonus;
  const refundCredit = Math.min(remainingAfterBonus, before.refundCredit);
  const base = remainingAfterBonus - refundCredit;
  const baseAfter = before.baseEnergy - base;
  const activeCapacity = before.maxEnergy + before.bonusCapacity;
  const activeEnergy = before.baseEnergy + before.bonusEnergy;
  const spentFromFullPool = activeEnergy >= activeCapacity;
  const lastSettledAt = spentFromFullPool
    ? nowMs
    : before.lastSettledAt;
  return {
    split: { bonus, refundCredit, base },
    after: {
      ...before,
      baseEnergy: baseAfter,
      bonusEnergy: before.bonusEnergy - bonus,
      // The temporary slots exist until expiry even after their remaining
      // units reach zero, so retain the deadline in the durable projection.
      bonusExpiresAt: before.bonusExpiresAt,
      refundCredit: before.refundCredit - refundCredit,
      lastSettledAt,
      recoveryCreditMicrounits: spentFromFullPool ? 0 : before.recoveryCreditMicrounits,
      recoveryDivisionRemainder: spentFromFullPool ? 0 : before.recoveryDivisionRemainder,
    },
  };
}

export function planEnergySessionRefund(
  projectionInput: EnergySessionProjectionInput,
  original: EnergySessionOperation,
  nowMs: number,
): EnergySessionProjection {
  const current = normalizedProjection(projectionInput, nowMs);
  const activeBonusCapacity = current.bonusExpiresAt > nowMs
    ? current.bonusCapacity
    : 0;
  const bonusRoom = Math.max(0, activeBonusCapacity - current.bonusEnergy);
  const refundableBonus = original.split.bonus > 0
    && original.projectionBefore.bonusExpiresAt > nowMs
    && activeBonusCapacity > 0
    ? Math.min(original.split.bonus, bonusRoom)
    : 0;
  const baseRoom = Math.max(0, current.maxEnergy - current.baseEnergy);
  const baseToPool = Math.min(baseRoom, original.split.base);
  const overflowBase = original.split.base - baseToPool;
  return {
    ...current,
    baseEnergy: current.baseEnergy + baseToPool,
    bonusEnergy: current.bonusEnergy + refundableBonus,
    // A refund restores only currently empty temporary slots. It must never
    // extend their capacity or lifetime after recovery (or a newer gift) has
    // already filled the active pool.
    bonusExpiresAt: current.bonusExpiresAt,
    refundCredit: current.refundCredit + original.split.refundCredit + overflowBase,
  };
}

async function publishProjection(owner: string, token: AccountGenerationToken, projection: EnergySessionProjection): Promise<void> {
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('stale_account_generation');
  const bonusStorageKey = requireGiftAccountStorageKey(BONUS_ENERGY_KEY, token);
  const nowMs = Date.now();
  const inspectedBonus = parseBonusEnergyStorageValue(
    await AsyncStorage.getItem(bonusStorageKey),
    nowMs,
  );
  if (inspectedBonus.status === 'malformed') throw new Error('bonus_energy_storage_corrupt');
  const currentBonus = inspectedBonus.status === 'valid' ? inspectedBonus.value : null;
  await AsyncStorage.multiSet([
    [ENERGY_KEY, JSON.stringify({
      schemaVersion: 2,
      current: projection.baseEnergy,
      lastSettledAt: projection.lastSettledAt,
      recoveryCreditMicrounits: projection.recoveryCreditMicrounits,
      recoveryDivisionRemainder: projection.recoveryDivisionRemainder,
    })],
    [refundCreditKey(owner), String(projection.refundCredit)],
  ]);
  const bonusExpiresAt = Math.max(
    projection.bonusExpiresAt > nowMs ? projection.bonusExpiresAt : 0,
    currentBonus?.expiresAt ?? 0,
  );
  const bonusCapacity = Math.max(
    currentBonus?.capacity ?? 0,
    projection.bonusCapacity,
  );
  if (bonusCapacity > 0 && bonusExpiresAt > nowMs) {
    await AsyncStorage.setItem(bonusStorageKey, JSON.stringify({
      schemaVersion: 2,
      amount: projection.bonusEnergy,
      capacity: bonusCapacity,
      expiresAt: bonusExpiresAt,
    }));
  } else {
    await AsyncStorage.removeItem(bonusStorageKey);
  }
  if (!isCurrentAccountGeneration(token, owner)) throw new Error('stale_account_generation');
}

async function readState(owner: string, opening: EnergySessionProjection): Promise<LedgerState> {
  const raw = await AsyncStorage.getItem(stateKey(owner));
  if (raw !== null) {
    const parsed = parseState(raw, owner);
    if (!parsed) throw new Error('energy_session_ledger_state_corrupt');
    return parsed;
  }
  return {
    schemaVersion: 'energy-session-ledger-state.v1',
    ownerStableId: owner,
    revision: 0,
    headOperationId: null,
    projection: opening,
    updatedAtMs: Date.now(),
  };
}

async function finalizePrepared(
  prepared: Prepared,
  token: AccountGenerationToken,
  liveProjection: EnergySessionProjection,
): Promise<EnergySessionCommitResult> {
  const owner = prepared.ownerStableId;
  let operation = prepared.operation;
  const operationStorageKey = opKey(owner, operation.operationId);
  const operationAbortKey = abortKey(owner, operation.operationId);
  const abortRaw = await AsyncStorage.getItem(operationAbortKey);
  const abort = parseAbort(abortRaw, owner, operation.operationId);
  if (abortRaw !== null && !abort) throw new Error('energy_session_abort_corrupt');
  if (abort) {
    if (abort.requestFingerprint !== operation.requestFingerprint) {
      logEnergyOperationConflict('abort', operation, abort);
      throw new Error('operation_id_conflict');
    }
    await AsyncStorage.removeItem(preparedKey(owner, operation.operationId));
    await AsyncStorage.removeItem(operationStorageKey);
    await AsyncStorage.removeItem(grantKey(owner, operation.operationId));
    await AsyncStorage.removeItem(operationAbortKey);
    return { status: 'insufficient', projection: normalizedProjection(liveProjection, Date.now()) };
  }
  const existingRaw = await AsyncStorage.getItem(operationStorageKey);
  const existing = parseOperation(existingRaw, owner);
  if (existingRaw !== null && !existing) throw new Error('energy_session_operation_corrupt');
  if (existing && existing.requestFingerprint !== operation.requestFingerprint) {
    logEnergyOperationConflict('existing_operation', operation, existing);
    throw new Error('operation_id_conflict');
  }
  const receiptRaw = await AsyncStorage.getItem(grantKey(owner, operation.operationId));
  const receipt = parseGrantReceipt(receiptRaw, owner, operation.operationId);
  if (receiptRaw !== null && !receipt) throw new Error('energy_session_grant_corrupt');
  if (receipt && receipt.requestFingerprint !== operation.requestFingerprint) throw new Error('energy_session_grant_conflict');
  if (!receipt) {
    const nextReceipt: GrantReceipt = {
      schemaVersion: 'energy-session-grant-receipt.v1',
      ownerStableId: owner,
      operationId: operation.operationId,
      requestFingerprint: operation.requestFingerprint,
      grant: operation.grant,
      createdAtMs: Date.now(),
    };
    await AsyncStorage.setItem(grantKey(owner, operation.operationId), JSON.stringify(nextReceipt));
  }
  if (!existing) await AsyncStorage.setItem(operationStorageKey, JSON.stringify(operation));

  const stateRaw = await AsyncStorage.getItem(stateKey(owner));
  const state = stateRaw === null ? null : parseState(stateRaw, owner);
  if (stateRaw !== null && !state) throw new Error('energy_session_ledger_state_corrupt');
  const durablePreparedRaw = await AsyncStorage.getItem(preparedKey(owner, operation.operationId));
  const durablePrepared = parsePrepared(durablePreparedRaw, owner);
  if (durablePreparedRaw !== null && !durablePrepared) throw new Error('energy_session_prepared_corrupt');
  if (durablePrepared && durablePrepared.operation.requestFingerprint !== operation.requestFingerprint) {
    logEnergyOperationConflict('durable_prepared', operation, durablePrepared.operation);
    throw new Error('operation_id_conflict');
  }
  if (state && state.revision === operation.revision && state.headOperationId !== operation.operationId) {
    throw new Error('energy_session_revision_conflict');
  }
  if (state && state.revision >= operation.revision) {
    // The caller holds both account and storage locks and supplies the live
    // compatibility projection. It may be newer than journal state because
    // ordinary elapsed recovery and gifts intentionally live outside this
    // bounded session ledger. Never republish a historical after-image here.
    const live = normalizedProjection(liveProjection, Date.now());
    let current = live;
    if (
      state.revision === operation.revision
      && state.headOperationId === operation.operationId
      && canonical(live) === canonical(operation.projectionBefore)
    ) {
      // State committed but projection publication/cleanup failed. The caller
      // still has the exact before-image, so finish publication and surface the
      // one committed debit/refund instead of starting for free.
      await publishProjection(owner, token, state.projection);
      current = state.projection;
    }
    await AsyncStorage.removeItem(preparedKey(owner, operation.operationId));
    return { status: 'already-applied', operation: existing ?? operation, projection: current };
  }
  if ((state && operation.revision !== state.revision + 1) || (!state && operation.revision !== 1)) {
    throw new Error('energy_session_revision_gap');
  }
  const live = normalizedProjection(liveProjection, Date.now());
  // A prepared record is a WAL intent, not yet a committed absolute snapshot.
  // Rebase its delta over the live compatibility projection so recovery/gifts
  // that happened before finalization are preserved.
  if (canonical(live) !== canonical(operation.projectionBefore)) {
    if (operation.direction === 'debit') {
      const planned = planEnergySessionDebit(live, operation.cost, Date.now());
      if (!planned) {
        const terminalAbort: AbortRecord = {
          schemaVersion: 'energy-session-abort.v1',
          ownerStableId: owner,
          operationId: operation.operationId,
          requestFingerprint: operation.requestFingerprint,
          reason: 'insufficient',
        };
        await AsyncStorage.setItem(operationAbortKey, JSON.stringify(terminalAbort));
        await AsyncStorage.removeItem(preparedKey(owner, operation.operationId));
        await AsyncStorage.removeItem(operationStorageKey);
        await AsyncStorage.removeItem(grantKey(owner, operation.operationId));
        await AsyncStorage.removeItem(operationAbortKey);
        return { status: 'insufficient', projection: live };
      }
      operation = {
        ...operation,
        split: planned.split,
        projectionBefore: live,
        projectionAfter: planned.after,
      };
    } else {
      const originalRaw = operation.reversesOperationId
        ? await AsyncStorage.getItem(opKey(owner, operation.reversesOperationId))
        : null;
      const original = parseOperation(originalRaw, owner);
      if (!original || original.direction !== 'debit') throw new Error('energy_session_original_operation_missing');
      operation = {
        ...operation,
        split: original.split,
        projectionBefore: live,
        projectionAfter: planEnergySessionRefund(live, original, Date.now()),
      };
    }
    const rebasedPrepared: Prepared = { ...prepared, operation };
    await AsyncStorage.setItem(preparedKey(owner, operation.operationId), JSON.stringify(rebasedPrepared));
    await AsyncStorage.setItem(operationStorageKey, JSON.stringify(operation));
  }
  const nextState: LedgerState = {
    schemaVersion: 'energy-session-ledger-state.v1',
    ownerStableId: owner,
    revision: operation.revision,
    headOperationId: operation.operationId,
    projection: operation.projectionAfter,
    updatedAtMs: Date.now(),
  };
  await AsyncStorage.setItem(stateKey(owner), JSON.stringify(nextState));
  await publishProjection(owner, token, operation.projectionAfter);
  await AsyncStorage.removeItem(preparedKey(owner, operation.operationId));
  return { status: 'applied', operation, projection: operation.projectionAfter };
}

async function commitDebitUnlocked(
  intent: EnergySessionIntent,
  cost: number,
  projectionInput: EnergySessionProjection,
  bootId: string,
  token: AccountGenerationToken,
): Promise<EnergySessionCommitResult> {
  validateIntent(intent);
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) return { status: 'failed', reason: 'stale_account_generation' };
  const request = publicRequest({
    operationId: intent.operationId,
    ownerStableId: owner,
    direction: 'debit',
    cost,
    reason: 'energy_session_start',
    grant: intent.grant,
    reversesOperationId: null,
  });
  const requestFingerprint = await fingerprint(request);
  const existingRaw = await AsyncStorage.getItem(opKey(owner, intent.operationId));
  const existing = parseOperation(existingRaw, owner);
  if (existingRaw !== null && !existing) throw new Error('energy_session_operation_corrupt');
  if (existing) {
    const compatibleLegacyReplay = existing.schemaVersion === 'energy-session-operation.v1'
      && canonical(existing.grant) === canonical(intent.grant);
    // зачем (PM-082): цена занятия сменилась (10/20/25 → 1). Занятие, начатое
    // до обновления, хранит операцию со старой ценой; повторный вход в него с
    // тем же operationId отличается ТОЛЬКО ценой. Это не конфликт, а тот же
    // старт — второй раз не списываем, просто подтверждаем уже сделанный.
    const repricedReplay = existing.requestFingerprint !== requestFingerprint
      && existing.cost !== cost
      && existing.requestFingerprint === await fingerprint(publicRequest({
        operationId: intent.operationId,
        ownerStableId: owner,
        direction: 'debit',
        cost: existing.cost,
        reason: 'energy_session_start',
        grant: intent.grant,
        reversesOperationId: null,
      }));
    if (repricedReplay) {
      console.warn(`[ENERGY-START] replay of pre-reprice start: op=${intent.operationId} storedCost=${existing.cost} newCost=${cost} -> no second charge`);
    }
    if (existing.requestFingerprint !== requestFingerprint && !compatibleLegacyReplay && !repricedReplay) {
      throw new Error('operation_id_conflict');
    }
    const reversalId = refundOperationId(intent.operationId);
    const reversalRaw = await AsyncStorage.getItem(opKey(owner, reversalId));
    const reversal = parseOperation(reversalRaw, owner);
    if (reversalRaw !== null && !reversal) throw new Error('energy_session_refund_operation_corrupt');
    if (reversal && (
      reversal.direction !== 'refund'
      || reversal.reversesOperationId !== intent.operationId
      || reversal.cost !== existing.cost
    )) throw new Error('energy_session_refund_operation_conflict');
    const refundRequestRaw = await AsyncStorage.getItem(refundRequestKey(owner, intent.operationId));
    const refundRequest = parseRefundRequest(refundRequestRaw, owner);
    if (refundRequestRaw !== null && !refundRequest) throw new Error('energy_session_refund_request_corrupt');
    if (refundRequest && refundRequest.originalOperationId !== intent.operationId) {
      throw new Error('energy_session_refund_request_conflict');
    }
    const reversalPendingRaw = await AsyncStorage.getItem(preparedKey(owner, reversalId));
    const reversalPending = parsePrepared(reversalPendingRaw, owner);
    if (reversalPendingRaw !== null && !reversalPending) throw new Error('energy_session_prepared_corrupt');
    if (reversalPending && (
      reversalPending.operation.direction !== 'refund'
      || reversalPending.operation.reversesOperationId !== intent.operationId
    )) throw new Error('energy_session_refund_operation_conflict');
    if (reversal || reversalPending || refundRequest) {
      let current = normalizedProjection(projectionInput, Date.now());
      if (reversalPending) {
        const finalized = await finalizePrepared(reversalPending, token, current);
        if (finalized.status === 'applied' || finalized.status === 'already-applied') current = finalized.projection;
      }
      return { status: 'reversed', operation: existing, projection: current };
    }
    const prepared: Prepared = {
      schemaVersion: 'energy-session-prepared.v1', ownerStableId: owner, operation: existing, preparedAtMs: Date.now(),
    };
    return finalizePrepared(prepared, token, projectionInput);
  }
  const pendingRaw = await AsyncStorage.getItem(preparedKey(owner, intent.operationId));
  const pending = parsePrepared(pendingRaw, owner);
  if (pendingRaw !== null && !pending) throw new Error('energy_session_prepared_corrupt');
  if (pending) {
    const compatibleLegacyReplay = pending.operation.schemaVersion === 'energy-session-operation.v1'
      && canonical(pending.operation.grant) === canonical(intent.grant);
    if (pending.operation.requestFingerprint !== requestFingerprint && !compatibleLegacyReplay) {
      throw new Error('operation_id_conflict');
    }
    return finalizePrepared(pending, token, projectionInput);
  }
  await assertNoOtherPrepared(owner, intent.operationId);
  const nowMs = Date.now();
  const opening = normalizedProjection(projectionInput, nowMs);
  const state = await readState(owner, opening);
  // Runtime recovery/gifts can advance the compatibility projection outside this
  // bounded session ledger. The caller's locked live snapshot is authoritative
  // for the next operation's before-image; revision/head still come from journal.
  const planned = planEnergySessionDebit(opening, cost, nowMs);
  if (!planned) return { status: 'insufficient', projection: opening };
  const operation: EnergySessionOperation = {
    schemaVersion: 'energy-session-operation.v2',
    operationId: intent.operationId,
    ownerStableId: owner,
    accountGeneration: token.generation,
    bootId: safeToken(bootId, 'boot'),
    direction: 'debit',
    cost,
    reason: 'energy_session_start',
    grant: intent.grant,
    reversesOperationId: null,
    split: planned.split,
    projectionBefore: opening,
    projectionAfter: planned.after,
    revision: state.revision + 1,
    createdAtMs: nowMs,
    requestFingerprint,
  };
  const prepared: Prepared = {
    schemaVersion: 'energy-session-prepared.v1', ownerStableId: owner, operation, preparedAtMs: nowMs,
  };
  await AsyncStorage.setItem(preparedKey(owner, intent.operationId), JSON.stringify(prepared));
  return finalizePrepared(prepared, token, opening);
}

export async function commitEnergySessionStart(
  intent: EnergySessionIntent,
  cost: number,
  projection: EnergySessionProjection,
  bootId: string,
  options: Readonly<{ accountToken?: AccountGenerationToken; accountTransitionLockLease?: AccountTransitionLockLease }> = {},
): Promise<EnergySessionCommitResult> {
  const token = options.accountToken ?? captureAccountGeneration();
  try {
    return await withAccountTransitionLock(
      async () => withStorageLock(() => commitDebitUnlocked(intent, cost, projection, bootId, token)),
      options.accountTransitionLockLease,
    );
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }
}

async function refundUnlocked(
  originalOperationId: string,
  reasonInput: string,
  projectionInput: EnergySessionProjection,
  bootId: string,
  token: AccountGenerationToken,
): Promise<EnergySessionCommitResult> {
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) return { status: 'failed', reason: 'stale_account_generation' };
  if (!OP_ID_RE.test(originalOperationId)) throw new Error('invalid_operation_id');
  const originalRaw = await AsyncStorage.getItem(opKey(owner, originalOperationId));
  const original = parseOperation(originalRaw, owner);
  if (!original || original.direction !== 'debit') throw new Error('energy_session_original_operation_missing');
  const ackRaw = await AsyncStorage.getItem(ackKey(owner, originalOperationId));
  const existingAck = parseEnergySessionAck(ackRaw, owner, originalOperationId);
  if (ackRaw !== null && !existingAck) throw new Error('energy_session_ack_corrupt');
  if (existingAck) return { status: 'failed', reason: 'energy_session_already_acknowledged' };
  const operationId = refundOperationId(originalOperationId);
  const requestedReason = safeToken(reasonInput, 'entry_failed');
  const requestStorageKey = refundRequestKey(owner, originalOperationId);
  const requestRaw = await AsyncStorage.getItem(requestStorageKey);
  const existingRequest = parseRefundRequest(requestRaw, owner);
  if (requestRaw !== null && !existingRequest) throw new Error('energy_session_refund_request_corrupt');
  if (existingRequest && existingRequest.originalOperationId !== originalOperationId) {
    throw new Error('operation_id_conflict');
  }
  // The reason is diagnostic metadata, not financial identity. Cleanup and an
  // async error may legitimately request the same compensation with different
  // labels; both must converge on one refund operation.
  const reason = existingRequest?.reason ?? requestedReason;
  if (!existingRequest) {
    const request: RefundRequest = {
      schemaVersion: 'energy-session-refund-request.v1',
      ownerStableId: owner,
      originalOperationId,
      reason,
      requestedAtMs: Date.now(),
    };
    // This tiny durable intent is written before planning the compensation.
    // Recovery can therefore finish a refund after a crash between writes.
    await AsyncStorage.setItem(requestStorageKey, JSON.stringify(request));
  }
  const grant: EnergySessionGrant = {
    kind: 'energy_session_refund',
    subjectId: original.grant.subjectId,
    attemptId: original.grant.attemptId,
  };
  const requestFingerprint = await fingerprint(publicRequest({
    operationId, ownerStableId: owner, direction: 'refund', cost: original.cost,
    reason: 'energy_session_refund', grant, reversesOperationId: originalOperationId,
  }));
  const existingRaw = await AsyncStorage.getItem(opKey(owner, operationId));
  const existing = parseOperation(existingRaw, owner);
  if (existingRaw !== null && !existing) throw new Error('energy_session_operation_corrupt');
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint
      && existing.schemaVersion !== 'energy-session-operation.v1') {
      throw new Error('operation_id_conflict');
    }
    const result = await finalizePrepared(
      { schemaVersion: 'energy-session-prepared.v1', ownerStableId: owner, operation: existing, preparedAtMs: Date.now() },
      token,
      projectionInput,
    );
    if (result.status === 'applied' || result.status === 'already-applied') await AsyncStorage.removeItem(requestStorageKey);
    return result;
  }
  const pendingRaw = await AsyncStorage.getItem(preparedKey(owner, operationId));
  const pending = parsePrepared(pendingRaw, owner);
  if (pendingRaw !== null && !pending) throw new Error('energy_session_prepared_corrupt');
  if (pending) {
    if (pending.operation.requestFingerprint !== requestFingerprint
      && pending.operation.schemaVersion !== 'energy-session-operation.v1') {
      throw new Error('operation_id_conflict');
    }
    const result = await finalizePrepared(pending, token, projectionInput);
    if (result.status === 'applied' || result.status === 'already-applied') await AsyncStorage.removeItem(requestStorageKey);
    return result;
  }
  await assertNoOtherPrepared(owner, operationId);
  const nowMs = Date.now();
  const before = normalizedProjection(projectionInput, nowMs);
  const state = await readState(owner, before);
  const after = planEnergySessionRefund(before, original, nowMs);
  const operation: EnergySessionOperation = {
    schemaVersion: 'energy-session-operation.v2', operationId, ownerStableId: owner,
    accountGeneration: token.generation, bootId: safeToken(bootId, 'boot'), direction: 'refund',
    cost: original.cost, reason, grant, reversesOperationId: originalOperationId,
    split: original.split, projectionBefore: before, projectionAfter: after,
    revision: state.revision + 1, createdAtMs: nowMs, requestFingerprint,
  };
  const prepared: Prepared = { schemaVersion: 'energy-session-prepared.v1', ownerStableId: owner, operation, preparedAtMs: nowMs };
  await AsyncStorage.setItem(preparedKey(owner, operationId), JSON.stringify(prepared));
  const result = await finalizePrepared(prepared, token, before);
  if (result.status === 'applied' || result.status === 'already-applied') await AsyncStorage.removeItem(requestStorageKey);
  return result;
}

export async function refundEnergySessionStart(
  originalOperationId: string,
  reason: string,
  projection: EnergySessionProjection,
  bootId: string,
  options: Readonly<{ accountToken?: AccountGenerationToken; accountTransitionLockLease?: AccountTransitionLockLease }> = {},
): Promise<EnergySessionCommitResult> {
  const token = options.accountToken ?? captureAccountGeneration();
  try {
    return await withAccountTransitionLock(
      async () => withStorageLock(() => refundUnlocked(originalOperationId, reason, projection, bootId, token)),
      options.accountTransitionLockLease,
    );
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }
}

export async function acknowledgeEnergySessionStart(
  operationId: string,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  const owner = accountToken.stableId;
  if (!owner || !isCurrentAccountGeneration(accountToken, owner) || !OP_ID_RE.test(operationId)) return false;
  try {
    return await withAccountTransitionLock(async () => withStorageLock(async () => {
      const operation = parseOperation(await AsyncStorage.getItem(opKey(owner, operationId)), owner);
      if (!operation || operation.direction !== 'debit') return false;
      const receipt = parseGrantReceipt(
        await AsyncStorage.getItem(grantKey(owner, operationId)), owner, operationId,
      );
      if (!receipt || receipt.requestFingerprint !== operation.requestFingerprint) return false;
      const refundId = refundOperationId(operationId);
      const [refundRequestRaw, refundPreparedRaw, refundOperationRaw] = await Promise.all([
        AsyncStorage.getItem(refundRequestKey(owner, operationId)),
        AsyncStorage.getItem(preparedKey(owner, refundId)),
        AsyncStorage.getItem(opKey(owner, refundId)),
      ]);
      const refundRequest = parseRefundRequest(refundRequestRaw, owner);
      const refundPrepared = parsePrepared(refundPreparedRaw, owner);
      const refundOperation = parseOperation(refundOperationRaw, owner);
      if (
        (refundRequestRaw !== null && !refundRequest)
        || (refundPreparedRaw !== null && !refundPrepared)
        || (refundOperationRaw !== null && !refundOperation)
      ) return false;
      if (refundRequest || refundPrepared || refundOperation) return false;
      const encoded = JSON.stringify({
        schemaVersion: 'energy-session-ack.v1', ownerStableId: owner, operationId,
        requestFingerprint: operation.requestFingerprint, acknowledgedAtMs: Date.now(),
      });
      await AsyncStorage.setItem(ackKey(owner, operationId), encoded);
      return await AsyncStorage.getItem(ackKey(owner, operationId)) === encoded;
    }));
  } catch (error) {
    console.warn('[ENERGY-LEDGER] ack:write_failed →false (чек списания — источник правды, повтор тем же op)', error instanceof Error ? error.message : String(error)); // guard-ok: причина в catch
    // Ack is metadata only. The durable debit+grant receipt remains the source
    // of truth and will be replayed with the same operation id.
    return false;
  }
}

/** Read-only crash-recovery view for a single start; it never mutates energy. */
export async function readEnergySessionStartStatus(
  operationId: string,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<EnergySessionStartStatus> {
  const owner = accountToken.stableId;
  if (!owner || !isCurrentAccountGeneration(accountToken, owner) || !OP_ID_RE.test(operationId)) {
    return { status: 'stale_account' };
  }
  try {
    return await withAccountTransitionLock(async () => withStorageLock(async () => {
      if (!isCurrentAccountGeneration(accountToken, owner)) return { status: 'stale_account' } as const;
      const [operationRaw, preparedRaw, grantRaw, ackRaw, refundRaw] = await Promise.all([
        AsyncStorage.getItem(opKey(owner, operationId)),
        AsyncStorage.getItem(preparedKey(owner, operationId)),
        AsyncStorage.getItem(grantKey(owner, operationId)),
        AsyncStorage.getItem(ackKey(owner, operationId)),
        AsyncStorage.getItem(opKey(owner, refundOperationId(operationId))),
      ]);
      const operation = parseOperation(operationRaw, owner);
      const prepared = parsePrepared(preparedRaw, owner);
      const grant = parseGrantReceipt(grantRaw, owner, operationId);
      const ack = parseEnergySessionAck(ackRaw, owner, operationId);
      const refund = parseOperation(refundRaw, owner);
      if (
        (operationRaw !== null && !operation)
        || (preparedRaw !== null && !prepared)
        || (grantRaw !== null && !grant)
        || (ackRaw !== null && !ack)
        || (refundRaw !== null && !refund)
      ) return { status: 'unavailable', reason: 'energy_session_status_corrupt' } as const;
      const fingerprint = operation?.requestFingerprint ?? prepared?.operation.requestFingerprint ?? grant?.requestFingerprint;
      if (
        !fingerprint
        && (ack || refund)
      ) return { status: 'unavailable', reason: 'energy_session_status_orphan' } as const;
      if (
        (operation && operation.direction !== 'debit')
        || (prepared && prepared.operation.direction !== 'debit')
        || (grant && grant.requestFingerprint !== fingerprint)
        || (ack && ack.requestFingerprint !== fingerprint)
        || (refund && (
          refund.direction !== 'refund'
          || refund.reversesOperationId !== operationId
          || refund.cost !== operation?.cost
          || refund.grant.kind !== 'energy_session_refund'
          || refund.grant.subjectId !== operation?.grant.subjectId
          || refund.grant.attemptId !== operation?.grant.attemptId
        ))
      ) return { status: 'unavailable', reason: 'energy_session_status_conflict' } as const;
      if (ack && refund) {
        return { status: 'unavailable', reason: 'energy_session_status_conflict' } as const;
      }
      if (ack) return { status: 'acknowledged' } as const;
      if (refund) return { status: 'refunded' } as const;
      if (operation && grant) return { status: 'charged' } as const;
      if (prepared) return { status: 'prepared' } as const;
      if (operation || grant) return { status: 'unavailable', reason: 'energy_session_status_incomplete' } as const;
      return { status: 'missing' } as const;
    }));
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : 'energy_session_status_failed' };
  }
}

export async function readEnergySessionRefundCredit(
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<number> {
  const owner = accountToken.stableId;
  if (!owner || !isCurrentAccountGeneration(accountToken, owner)) return 0;
  const raw = await AsyncStorage.getItem(refundCreditKey(owner));
  if (raw === null) return 0;
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('energy_session_refund_credit_corrupt');
  if (amount > ENERGY_BASE_CAPACITY) {
    // зачем (PM-081): кредит возвратов эпохи «запас 100» (единицы по 10–25)
    // срезается до нового потолка 5 — так же, как в clampProjectionToCapacity.
    console.warn(`[ENERGY-CAP] refundCredit clamped: stored=${amount} -> ${ENERGY_BASE_CAPACITY}`);
    return ENERGY_BASE_CAPACITY;
  }
  return amount;
}

export /**
 * Сколько держать записи завершённых операций с энергией.
 *
 * зачем (владелец 2026-09-21, «всё лагает, причём везде» → «да» на чистку):
 * реестр писал по ~3 ключа на каждый вход в урок или матч и НИКОГДА их не
 * удалял. Замер: при 15 сессиях в день за год набегает ~16 000 ключей, а
 * полный перебор индекса становится заметным примерно от 2000-3000. Именно
 * поэтому новый телефон владельцу не помог — данные приехали со старого
 * аккаунта вместе с распухшим индексом.
 *
 * Владелец спросил, не хватит ли 10 часов. Не хватит: эти записи — не история,
 * а ЗАЩИТА ОТ ДВОЙНОГО СПИСАНИЯ. Опасен не обычный сценарий, а застрявший —
 * телефон в самолётном режиме, сервер не подтвердил операцию, возврат энергии
 * висит в очереди. Такое разгребается при следующем заходе в сеть, и если
 * запись исчезнет за 10 часов, а человек откроет приложение через сутки,
 * застрявшая операция останется без своей защиты.
 *
 * 7 дней — середина по замеру: ~315 ключей при обычной игре (это глубоко ниже
 * порога заметности) и неделя запаса на любой застрявший возврат.
 */
const SETTLED_OPERATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Удаляет записи ПОЛНОСТЬЮ завершённых операций старше срока хранения.
 *
 * Условия удаления намеренно параноидальные — эти ключи защищают от двойного
 * списания энергии, поэтому удаляется только то, что уже ничего не защищает:
 *   • есть квитанция с отметкой времени (иначе возраст неизвестен — не трогаем);
 *   • квитанция старше срока хранения;
 *   • НЕТ незавершённых стадий: prepared, abort, запроса возврата;
 *   • НЕТ записи обратной операции возврата (она означает живой сценарий).
 * Любое сомнение — ключ остаётся. Пропущенная чистка стоит нисколько, лишнее
 * удаление стоит энергии человека.
 */
async function pruneSettledEnergyOperations(
  owner: string,
  allKeys: readonly string[],
): Promise<void> {
  const grantPrefix = `${GRANT_PREFIX}${ownerPart(owner)}:`;
  const grantKeys = allKeys.filter((key) => key.startsWith(grantPrefix));
  if (grantKeys.length === 0) return;

  const liveKeys = new Set(allKeys);
  const cutoffMs = Date.now() - SETTLED_OPERATION_RETENTION_MS;
  const doomed: string[] = [];

  const grantRows = await AsyncStorage.multiGet(grantKeys);
  for (const [grantStorageKey, raw] of grantRows) {
    if (raw === null) continue;
    const operationId = grantStorageKey.slice(grantPrefix.length);
    if (!OP_ID_RE.test(operationId)) continue;
    const receipt = parseGrantReceipt(raw, owner, operationId);
    // Битую квитанцию НЕ трогаем: её разберёт штатная проверка целостности,
    // а чистка не должна прятать порчу данных.
    if (!receipt || !Number.isFinite(receipt.createdAtMs)) continue;
    if (receipt.createdAtMs > cutoffMs) continue;
    // Любая незавершённая стадия — операция ещё живая, уходим.
    if (liveKeys.has(preparedKey(owner, operationId))) continue;
    if (liveKeys.has(abortKey(owner, operationId))) continue;
    if (liveKeys.has(refundRequestKey(owner, operationId))) continue;
    const reversalId = refundOperationId(operationId);
    if (liveKeys.has(opKey(owner, reversalId))) continue;
    if (liveKeys.has(preparedKey(owner, reversalId))) continue;
    if (liveKeys.has(grantKey(owner, reversalId))) continue;
    doomed.push(grantStorageKey, opKey(owner, operationId), ackKey(owner, operationId));
  }

  if (doomed.length === 0) return;
  const existing = doomed.filter((key) => liveKeys.has(key));
  if (existing.length === 0) return;
  try {
    await AsyncStorage.multiRemove(existing);
    console.log(`[ENERGY-LEDGER] prune: удалено ${existing.length} ключей завершённых операций старше ${SETTLED_OPERATION_RETENTION_MS / (24 * 60 * 60 * 1000)} дней`);
  } catch (error: unknown) {
    // зачем: немой catch запрещён правилом владельца. Неудачная чистка — не
    // повод ронять восстановление: реестр останется корректным, просто длиннее.
    console.warn('[ENERGY-LEDGER] prune:catch', error instanceof Error ? error.message : String(error)); // guard-ok: лог в catch обязателен
  }
}

// зачем (эмулятор 22.09): функция потеряла `export`, но EnergyContext её
// импортирует — в рантайме выходил undefined, и восстановление энергии падало
// с «is not a function». Любое занятие со стоимостью энергии не запускалось:
// экран показывал «отменено». tsc эту ошибку ВИДИТ (TS2724), её просто не
// замечали, потому что полная проверка падала по памяти на 4 ГБ.
export async function recoverEnergySessionOperations(
  projectionInput: EnergySessionProjection,
  _bootId: string,
  options: Readonly<{ accountToken?: AccountGenerationToken; accountTransitionLockLease?: AccountTransitionLockLease }> = {},
): Promise<EnergySessionProjection> {
  const token = options.accountToken ?? captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) throw new Error('stale_account_generation');
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    let allKeys = await AsyncStorage.getAllKeys();
    const abortPrefix = `${ABORT_PREFIX}${ownerPart(owner)}:`;
    for (const key of allKeys.filter((item) => item.startsWith(abortPrefix)).sort()) {
      const operationId = key.slice(abortPrefix.length);
      const abortRaw = await AsyncStorage.getItem(key);
      const abort = parseAbort(abortRaw, owner, operationId);
      if (!abort) throw new Error('energy_session_abort_corrupt');
      const operationRaw = await AsyncStorage.getItem(opKey(owner, operationId));
      const operation = parseOperation(operationRaw, owner);
      if (operationRaw !== null && !operation) throw new Error('energy_session_operation_corrupt');
      if (operation && operation.requestFingerprint !== abort.requestFingerprint) {
        throw new Error('operation_id_conflict');
      }
      const preparedRaw = await AsyncStorage.getItem(preparedKey(owner, operationId));
      const prepared = parsePrepared(preparedRaw, owner);
      if (preparedRaw !== null && !prepared) throw new Error('energy_session_prepared_corrupt');
      if (prepared && prepared.operation.requestFingerprint !== abort.requestFingerprint) {
        throw new Error('operation_id_conflict');
      }
      await AsyncStorage.removeItem(preparedKey(owner, operationId));
      await AsyncStorage.removeItem(opKey(owner, operationId));
      await AsyncStorage.removeItem(grantKey(owner, operationId));
      await AsyncStorage.removeItem(key);
    }
    // зачем (владелец 2026-09-21, «всё лагает, причём везде», TestFlight):
    // здесь стоял ВТОРОЙ полный getAllKeys подряд. Цикл выше только УДАЛЯЕТ
    // ключи (removeItem), новых не создаёт — значит список ключей с префиксом
    // prepared в нём измениться не мог, и перечитывать весь индекс хранилища
    // незачем. getAllKeys читает индекс ЦЕЛИКОМ, а он растёт с возрастом
    // аккаунта: реестр пишет запись на каждый вход в урок и не чистит их.
    // Удалённые в цикле выше ключи отфильтровываем из уже прочитанного списка.
    const removedKeys = new Set<string>();
    for (const key of allKeys.filter((item) => item.startsWith(abortPrefix))) {
      const operationId = key.slice(abortPrefix.length);
      removedKeys.add(preparedKey(owner, operationId));
      removedKeys.add(opKey(owner, operationId));
      removedKeys.add(grantKey(owner, operationId));
      removedKeys.add(key);
    }
    allKeys = allKeys.filter((item) => !removedKeys.has(item));
    const preparedPrefix = `${PREPARED_PREFIX}${ownerPart(owner)}:`;
    let projection = projectionInput;
    const preparedRecords: Prepared[] = [];
    for (const key of allKeys.filter((item) => item.startsWith(preparedPrefix))) {
      const preparedRaw = await AsyncStorage.getItem(key);
      const prepared = parsePrepared(preparedRaw, owner);
      if (!prepared) throw new Error('energy_session_prepared_corrupt');
      preparedRecords.push(prepared);
    }
    preparedRecords.sort((left, right) => left.operation.revision - right.operation.revision);
    for (const prepared of preparedRecords) {
      const recovered = await finalizePrepared(prepared, token, projection);
      if (recovered.status === 'applied' || recovered.status === 'already-applied') projection = recovered.projection;
    }

    const refundRequestPrefix = `${REFUND_REQUEST_PREFIX}${ownerPart(owner)}:`;
    // зачем (владелец 2026-09-21): здесь стоял ТРЕТИЙ полный getAllKeys подряд.
    // Между ним и первым работает только finalizePrepared, а он ключей возврата
    // (REFUND_REQUEST_) не создаёт — проверено построчно: внутри лишь
    // removeItem по prepared/operation/grant/abort и setItem по grant и
    // operation. Значит набор ключей возврата с первого скана не изменился, и
    // третье чтение всего индекса — чистая трата.
    const keysAfterPrepared = allKeys;
    for (const key of keysAfterPrepared.filter((item) => item.startsWith(refundRequestPrefix)).sort()) {
      const requestRaw = await AsyncStorage.getItem(key);
      const request = parseRefundRequest(requestRaw, owner);
      if (!request) throw new Error('energy_session_refund_request_corrupt');
      const recoveredRefund = await refundUnlocked(
        request.originalOperationId,
        request.reason,
        projection,
        _bootId,
        token,
      );
      if (recoveredRefund.status === 'failed') throw new Error(recoveredRefund.reason);
      if (recoveredRefund.status === 'applied' || recoveredRefund.status === 'already-applied') {
        projection = recoveredRefund.projection;
      }
    }

    // A committed debit already contains its exact durable grant. A process
    // restart must replay that grant with the same operation id; it must not
    // mint free energy merely because the UI had no chance to write an ack.
    // Only an explicit, keyed entry-failed/cancel refund reverses the debit.
    await pruneSettledEnergyOperations(owner, allKeys);
    return projection;
  }), options.accountTransitionLockLease);
}

export const ENERGY_SESSION_STORAGE_PREFIXES = Object.freeze([
  OP_PREFIX, PREPARED_PREFIX, GRANT_PREFIX, ACK_PREFIX, STATE_PREFIX,
  REFUND_CREDIT_PREFIX, REFUND_REQUEST_PREFIX, ABORT_PREFIX,
]);

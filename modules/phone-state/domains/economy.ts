import * as Crypto from 'expo-crypto';
import type { PersonalOperation } from '../contracts';
import type { DomainReducer } from '../reducer_registry';

export type OrdinaryEconomyOperation = Readonly<{
  operationId: string;
  delta: number;
  grant: Readonly<{ kind: string; entitlementId: string; exactResult: unknown }>;
}>;

export type EconomyProjection = Readonly<{
  balance: number;
  receipts: Readonly<Record<string, OrdinaryEconomyOperation>>;
}>;

const ZERO_DELTA_GRANT_KINDS = new Set([
  'premium_freeze',
  'star_credit',
  'star_credit_ack',
  'attempt_restore_inventory_credit',
  'attempt_restore_inventory_consume',
  'session_attempt_recovery_rune_debit',
  'paid_level_spin_rune_purchase',
  'customization_rune_purchase',
  'customization_selection_v1',
]);
const STAR_CREDIT_AMOUNTS = Object.freeze({
  stars_10: 10, stars_20: 20, stars_50: 50, stars_100: 100,
  stars_250: 250, stars_500: 500, stars_1000: 1_000,
  // v7 (2026-08-29): джекпот рун каталога спина. Зеркала: app/level_spin_star_grants.ts
  // и functions/src/level_spin_star_grant.ts — правь все три в одном коммите.
  stars_2000: 2_000,
} as const);
const STAR_REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;
const STAR_DELIVERY_TOKEN = /^[A-Za-z0-9_-]{16,96}$/;
const STAR_FINGERPRINT = /^[a-f0-9]{64}$/;
const ATTEMPT_RESTORE_SPIN_REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;
const ATTEMPT_RESTORE_ENTITY_ID = /^[A-Za-z0-9_.:-]{1,160}$/;

export type LevelSpinStarCreditExactResult = Readonly<{
  schemaVersion: 'client-level-spin-star-operation.v1';
  operationId: string;
  ownerStableId: string;
  requestId: string;
  lane: 'base' | 'premium';
  deliveryToken?: string;
  giftId: keyof typeof STAR_CREDIT_AMOUNTS;
  amount: number;
  reason: 'level_spin_star_reward';
  grant: Readonly<{
    kind: 'star_credit';
    subjectId: string;
    payload: Readonly<{
      requestId: string;
      lane: 'base' | 'premium';
      giftId: keyof typeof STAR_CREDIT_AMOUNTS;
      amount: number;
    }>;
  }>;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type LevelSpinStarCreditAckExactResult = Readonly<{
  schemaVersion: 'client-level-spin-star-ack.v1';
  operationId: string;
  ownerStableId: string;
  requestFingerprint: string;
  starsBalance: number;
  starsEarnedTotal: number;
  starsSeq: number;
}>;

export type LevelSpinStarCreditState = Readonly<{
  credits: readonly LevelSpinStarCreditExactResult[];
  acknowledgements: readonly LevelSpinStarCreditAckExactResult[];
}>;

export type AttemptRestoreGiftCreditV1 = Readonly<{
  schemaVersion: 'client-attempt-restore-gift-credit.v1';
  operationId: string;
  ownerStableId: string;
  spinRequestId: string;
  lane: 'base' | 'premium';
  giftId: 'attempt_restore_all';
  quantity: 1;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type AttemptRestoreGiftConsumeV1 = Readonly<{
  schemaVersion: 'client-attempt-restore-gift-consume.v1';
  operationId: string;
  ownerStableId: string;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  quantity: 1;
  attemptsGranted: 3;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type AttemptRestoreGiftOperationV1 = AttemptRestoreGiftCreditV1 | AttemptRestoreGiftConsumeV1;

export type SessionAttemptRuneRecoveryExactResultV1 = Readonly<{
  schemaVersion: 'client-session-attempt-recovery-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  sessionId: string;
  questionId: string;
  recoveryOrdinal: number;
  runeDelta: -25;
  attemptsGranted: 3;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'restore_all_session_attempts';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type PaidLevelSpinRuneOperationV1 = Readonly<{
  schemaVersion: 'client-paid-level-spin-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  requestId: string;
  giftId: string;
  catalogVersion: number;
  runeDelta: -300;
  price: 300;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'paid_level_spin';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type CustomizationRunePurchaseExactResultV1 = Readonly<{
  schemaVersion: 'client-customization-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  avatarId: string;
  artVersion?: 'showcase-v1' | 'avatar100-v1';
  ownedValue: string;
  avatarValue: string;
  applyInput?: Readonly<{
    avatarValue: string;
    storedAuraSelection: string | null;
    level: number;
    frameId: string;
    cloudSyncMode?: 'immediate' | 'deferred';
  }>;
  runeDelta: number;
  price: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'custom_avatar' | 'custom_avatar_restyle';
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type CustomizationSelectionExactResultV1 = Readonly<{
  schemaVersion: 'customization-selection-operation.v1';
  operationId: string;
  ownerStableId: string;
  lineage: number;
  accountGeneration: number;
  parentOperationId: string | null;
  revision: number;
  source: 'user' | 'external' | 'legacy';
  occurrenceId?: string;
  selection: Readonly<{
    avatarValue: string;
    frameId: string;
    storedAuraSelection: string | null;
    level: number;
  }>;
  createdAtMs: number;
  requestFingerprint: string;
}>;

export type AttemptRestoreGiftInventoryState = Readonly<{
  credits: readonly AttemptRestoreGiftCreditV1[];
  consumes: readonly AttemptRestoreGiftConsumeV1[];
  count: number;
}>;

export function levelSpinStarCreditAckOperationId(operationId: string): string | null {
  const match = /^level_spin:([A-Za-z0-9_-]{16,80})\.(base|premium)$/.exec(operationId);
  return match ? `level_spin_ack:${match[1]}.${match[2]}` : null;
}

function exactKeys(value: object, allowed: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === allowed.length
    && keys.every((key, index) => key === [...allowed].sort()[index]);
}

function validOwnerStableId(value: unknown): value is string {
  return typeof value === 'string'
    && !!value.trim()
    && !value.includes('/')
    && value.length <= 160;
}

export function attemptRestoreGiftCreditOperationId(
  spinRequestId: string,
  lane: 'base' | 'premium',
): string {
  return `attempt_restore_credit:${spinRequestId}.${lane}`;
}

export function attemptRestoreGiftConsumeOperationId(sessionId: string, recoveryOrdinal: number): string {
  return `attempt_restore_consume:${sessionId}:${recoveryOrdinal}`;
}

export function sessionAttemptRuneRecoveryOperationId(sessionId: string, recoveryOrdinal: number): string {
  return `session_attempt_recovery:${sessionId}:${recoveryOrdinal}`;
}

export function paidLevelSpinOperationId(requestId: string): string | null {
  return STAR_REQUEST_ID.test(requestId) ? `paid_level_spin:${requestId}` : null;
}

const PAID_LEVEL_SPIN_GIFTS_V6 = new Set<string>([
  'xp_250', 'xp_500', 'xp_1000', 'xp_3000', 'xp_5000',
  'pearls_5', 'pearls_10', 'pearls_20',
  'stars_10', 'stars_20', 'stars_50',
  'energy_full', 'energy_plus2', 'hint_1', 'hint_3', 'chain_shield_1', 'attempt_restore_all',
  'xp_bank_150', 'xp_bank_300', 'xp_2x_24h',
  'xp_10000', 'xp_25000', 'pearls_50', 'pearls_100', 'stars_100', 'stars_250',
  'energy_plus3', 'xp_bank_600', 'xp_2x_48h',
  'xp_50000', 'pearls_250', 'pearls_500', 'stars_500', 'stars_1000',
  'plus_days_3', 'plus_days_7', 'cosmetic_avatar_aura', 'cosmetic_theme', 'cosmetic_avatar_common',
]);

// зачем (v7, 2026-08-29): шесть новых ценных призов спина. Платный спин крутит
// тот же каталог, поэтому его допуск расширяется вместе с каталожной версией.
const PAID_LEVEL_SPIN_GIFTS_V7 = new Set<string>([
  ...PAID_LEVEL_SPIN_GIFTS_V6,
  'chain_shield_3', 'xp_bank_1500',
  'pearls_1000', 'stars_2000',
  'plus_days_14', 'plus_days_30',
]);

function paidLevelSpinGiftAllowed(giftId: unknown, catalogVersion: unknown): giftId is string {
  if (typeof giftId !== 'string' || !Number.isInteger(catalogVersion)) return false;
  if (catalogVersion === 7) return PAID_LEVEL_SPIN_GIFTS_V7.has(giftId);
  if (catalogVersion === 6) return PAID_LEVEL_SPIN_GIFTS_V6.has(giftId);
  if (catalogVersion === 5) return giftId !== 'attempt_restore_all' && PAID_LEVEL_SPIN_GIFTS_V6.has(giftId);
  if (catalogVersion === 4) return giftId !== 'attempt_restore_all'
    && giftId !== 'cosmetic_avatar_common' && PAID_LEVEL_SPIN_GIFTS_V6.has(giftId);
  if (catalogVersion === 3) return giftId !== 'attempt_restore_all'
    && giftId !== 'cosmetic_avatar_common' && giftId !== 'cosmetic_theme'
    && PAID_LEVEL_SPIN_GIFTS_V6.has(giftId);
  if (catalogVersion === 2) return giftId !== 'attempt_restore_all'
    && giftId !== 'cosmetic_avatar_common' && giftId !== 'cosmetic_theme'
    && giftId !== 'cosmetic_avatar_aura' && PAID_LEVEL_SPIN_GIFTS_V6.has(giftId);
  return false;
}

export function parsePaidLevelSpinRuneOperation(input: unknown): PaidLevelSpinRuneOperationV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<PaidLevelSpinRuneOperationV1>;
  const requestId = String(value.requestId ?? '');
  const balanceBefore = Number(value.balanceBefore);
  const balanceAfter = Number(value.balanceAfter);
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'accountGeneration', 'requestId',
    'giftId', 'catalogVersion', 'runeDelta', 'price', 'balanceBefore', 'balanceAfter',
    'reason', 'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-paid-level-spin-rune-operation.v1'
    || value.operationId !== paidLevelSpinOperationId(requestId)
    || !validOwnerStableId(value.ownerStableId)
    || !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1
    || !paidLevelSpinGiftAllowed(value.giftId, value.catalogVersion)
    || value.runeDelta !== -300
    || value.price !== 300
    || !Number.isSafeInteger(balanceBefore) || balanceBefore < 300
    || !Number.isSafeInteger(balanceAfter) || balanceAfter !== balanceBefore - 300
    || value.reason !== 'paid_level_spin'
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as PaidLevelSpinRuneOperationV1;
}

export async function paidLevelSpinRuneFingerprint(
  input: Omit<PaidLevelSpinRuneOperationV1, 'schemaVersion' | 'requestFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      operationId: input.operationId,
      ownerStableId: input.ownerStableId,
      accountGeneration: input.accountGeneration,
      requestId: input.requestId,
      giftId: input.giftId,
      catalogVersion: input.catalogVersion,
      runeDelta: input.runeDelta,
      price: input.price,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      reason: input.reason,
      createdAtMs: input.createdAtMs,
    }),
  );
}

export async function hasValidPaidLevelSpinRuneFingerprint(input: unknown): Promise<boolean> {
  const exact = parsePaidLevelSpinRuneOperation(input);
  if (!exact) return false;
  const { schemaVersion: _schemaVersion, requestFingerprint, ...payload } = exact;
  return requestFingerprint === await paidLevelSpinRuneFingerprint(payload);
}

export function parseAttemptRestoreGiftCreditExactResult(input: unknown): AttemptRestoreGiftCreditV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<AttemptRestoreGiftCreditV1>;
  const lane = value.lane === 'base' || value.lane === 'premium' ? value.lane : null;
  const spinRequestId = String(value.spinRequestId ?? '');
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'spinRequestId', 'lane',
    'giftId', 'quantity', 'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-attempt-restore-gift-credit.v1'
    || !ATTEMPT_RESTORE_SPIN_REQUEST_ID.test(spinRequestId)
    || !lane
    || value.operationId !== attemptRestoreGiftCreditOperationId(spinRequestId, lane)
    || !validOwnerStableId(value.ownerStableId)
    || value.giftId !== 'attempt_restore_all'
    || value.quantity !== 1
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as AttemptRestoreGiftCreditV1;
}

export function parseAttemptRestoreGiftConsumeExactResult(input: unknown): AttemptRestoreGiftConsumeV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<AttemptRestoreGiftConsumeV1>;
  const sessionId = String(value.sessionId ?? '');
  const questionId = String(value.questionId ?? '');
  const recoveryOrdinal = Number(value.recoveryOrdinal);
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'sessionId', 'questionId',
    'recoveryOrdinal', 'quantity', 'attemptsGranted', 'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-attempt-restore-gift-consume.v1'
    || !ATTEMPT_RESTORE_ENTITY_ID.test(sessionId)
    || !ATTEMPT_RESTORE_ENTITY_ID.test(questionId)
    || !Number.isSafeInteger(recoveryOrdinal) || recoveryOrdinal < 1 || recoveryOrdinal > 1_000
    || value.operationId !== attemptRestoreGiftConsumeOperationId(sessionId, recoveryOrdinal)
    || !validOwnerStableId(value.ownerStableId)
    || value.quantity !== 1
    || value.attemptsGranted !== 3
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as AttemptRestoreGiftConsumeV1;
}

export function parseSessionAttemptRuneRecoveryExactResult(
  input: unknown,
): SessionAttemptRuneRecoveryExactResultV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<SessionAttemptRuneRecoveryExactResultV1>;
  const sessionId = String(value.sessionId ?? '');
  const questionId = String(value.questionId ?? '');
  const recoveryOrdinal = Number(value.recoveryOrdinal);
  const balanceBefore = Number(value.balanceBefore);
  const balanceAfter = Number(value.balanceAfter);
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'accountGeneration', 'sessionId',
    'questionId', 'recoveryOrdinal', 'runeDelta', 'attemptsGranted', 'balanceBefore',
    'balanceAfter', 'reason', 'createdAtMs', 'requestFingerprint',
  ])
    || value.schemaVersion !== 'client-session-attempt-recovery-rune-operation.v1'
    || !validOwnerStableId(value.ownerStableId)
    || !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1
    || !ATTEMPT_RESTORE_ENTITY_ID.test(sessionId)
    || !ATTEMPT_RESTORE_ENTITY_ID.test(questionId)
    || !Number.isSafeInteger(recoveryOrdinal) || recoveryOrdinal < 1 || recoveryOrdinal > 1_000
    || value.operationId !== sessionAttemptRuneRecoveryOperationId(sessionId, recoveryOrdinal)
    || value.runeDelta !== -25
    || value.attemptsGranted !== 3
    || !Number.isSafeInteger(balanceBefore) || balanceBefore < 25
    || !Number.isSafeInteger(balanceAfter) || balanceAfter !== balanceBefore - 25
    || value.reason !== 'restore_all_session_attempts'
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as SessionAttemptRuneRecoveryExactResultV1;
}

const CUSTOMIZATION_OPERATION_ID = /^[A-Za-z0-9_.:-]{1,200}$/;
const CUSTOMIZATION_ENTITY_ID = /^[A-Za-z0-9_.-]{1,160}$/;
const CUSTOMIZATION_AVATAR_VALUE = /^custom:([A-Za-z0-9_.-]{1,160}):([A-Za-z0-9_.-]{1,80}):black(?::(showcase-v1|avatar100-v1))?$/;
const CUSTOMIZATION_OWNED_VALUE = /^(?:(showcase-v1|avatar100-v1)\|)?([A-Za-z0-9_.-]{1,80}):black$/;

function validCustomizationApplyInput(
  input: unknown,
  avatarValue: string,
): input is NonNullable<CustomizationRunePurchaseExactResultV1['applyInput']> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as NonNullable<CustomizationRunePurchaseExactResultV1['applyInput']>;
  const allowed = [
    'avatarValue', 'storedAuraSelection', 'level', 'frameId',
    ...(value.cloudSyncMode === undefined ? [] : ['cloudSyncMode']),
  ];
  return exactKeys(value, allowed)
    && value.avatarValue === avatarValue
    && (value.storedAuraSelection === null
      || (typeof value.storedAuraSelection === 'string' && value.storedAuraSelection.length <= 160))
    && Number.isSafeInteger(value.level) && value.level >= 1
    && typeof value.frameId === 'string' && CUSTOMIZATION_ENTITY_ID.test(value.frameId)
    && (value.cloudSyncMode === undefined
      || value.cloudSyncMode === 'immediate'
      || value.cloudSyncMode === 'deferred');
}

export function parseCustomizationRunePurchaseExactResult(
  input: unknown,
): CustomizationRunePurchaseExactResultV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<CustomizationRunePurchaseExactResultV1>;
  const allowed = [
    'schemaVersion', 'operationId', 'ownerStableId', 'accountGeneration', 'avatarId',
    ...(value.artVersion === undefined ? [] : ['artVersion']),
    'ownedValue', 'avatarValue',
    ...(value.applyInput === undefined ? [] : ['applyInput']),
    'runeDelta', 'price', 'balanceBefore', 'balanceAfter', 'reason', 'createdAtMs',
    'requestFingerprint',
  ];
  const ownedValue = String(value.ownedValue ?? '');
  const ownedMatch = CUSTOMIZATION_OWNED_VALUE.exec(ownedValue);
  const avatarValue = String(value.avatarValue ?? '');
  const avatarMatch = CUSTOMIZATION_AVATAR_VALUE.exec(avatarValue);
  const price = Number(value.price);
  const balanceBefore = Number(value.balanceBefore);
  const balanceAfter = Number(value.balanceAfter);
  if (!exactKeys(value, allowed)
    || value.schemaVersion !== 'client-customization-rune-operation.v1'
    || !CUSTOMIZATION_OPERATION_ID.test(String(value.operationId ?? ''))
    || !validOwnerStableId(value.ownerStableId)
    || !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1
    || !CUSTOMIZATION_ENTITY_ID.test(String(value.avatarId ?? ''))
    || !ownedMatch || !avatarMatch || avatarMatch[1] !== value.avatarId
    || ownedMatch[2] !== avatarMatch[2]
    || (ownedMatch[1] || undefined) !== (avatarMatch[3] || undefined)
    || value.artVersion !== (avatarMatch[3] || undefined)
    || (value.applyInput !== undefined && !validCustomizationApplyInput(value.applyInput, avatarValue))
    || !Number.isSafeInteger(price) || price <= 0
    || value.runeDelta !== -price
    || !Number.isSafeInteger(balanceBefore) || balanceBefore < price
    || !Number.isSafeInteger(balanceAfter) || balanceAfter !== balanceBefore - price
    || (value.reason !== 'custom_avatar' && value.reason !== 'custom_avatar_restyle')
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as CustomizationRunePurchaseExactResultV1;
}

export async function customizationRunePurchaseFingerprint(
  input: Omit<CustomizationRunePurchaseExactResultV1, 'schemaVersion' | 'requestFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      operationId: input.operationId,
      ownerStableId: input.ownerStableId,
      accountGeneration: input.accountGeneration,
      avatarId: input.avatarId,
      artVersion: input.artVersion ?? null,
      ownedValue: input.ownedValue,
      avatarValue: input.avatarValue,
      applyInput: input.applyInput ?? null,
      runeDelta: input.runeDelta,
      price: input.price,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      reason: input.reason,
      createdAtMs: input.createdAtMs,
    }),
  );
}

export async function hasValidCustomizationRunePurchaseFingerprint(input: unknown): Promise<boolean> {
  const exact = parseCustomizationRunePurchaseExactResult(input);
  if (!exact) return false;
  const { schemaVersion: _schemaVersion, requestFingerprint, ...payload } = exact;
  return requestFingerprint === await customizationRunePurchaseFingerprint(payload);
}

function validCustomizationSelection(input: unknown): input is CustomizationSelectionExactResultV1['selection'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as CustomizationSelectionExactResultV1['selection'];
  return exactKeys(value, ['avatarValue', 'frameId', 'storedAuraSelection', 'level'])
    && typeof value.avatarValue === 'string' && value.avatarValue.trim().length > 0 && value.avatarValue.length <= 240
    && typeof value.frameId === 'string' && value.frameId.trim().length > 0 && value.frameId.length <= 160
    && (value.storedAuraSelection === null
      || (typeof value.storedAuraSelection === 'string' && value.storedAuraSelection.length <= 160))
    && Number.isSafeInteger(value.level) && value.level >= 1;
}

export function parseCustomizationSelectionExactResult(
  input: unknown,
): CustomizationSelectionExactResultV1 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<CustomizationSelectionExactResultV1>;
  const allowed = [
    'schemaVersion', 'operationId', 'ownerStableId', 'lineage', 'accountGeneration',
    'parentOperationId', 'revision', 'source',
    ...(value.occurrenceId === undefined ? [] : ['occurrenceId']),
    'selection', 'createdAtMs', 'requestFingerprint',
  ];
  if (!exactKeys(value, allowed)
    || value.schemaVersion !== 'customization-selection-operation.v1'
    || !CUSTOMIZATION_OPERATION_ID.test(String(value.operationId ?? ''))
    || !validOwnerStableId(value.ownerStableId)
    || !Number.isSafeInteger(value.lineage) || Number(value.lineage) < 1
    || !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1
    || (value.parentOperationId !== null
      && !CUSTOMIZATION_OPERATION_ID.test(String(value.parentOperationId ?? '')))
    || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1
    || (value.source !== 'user' && value.source !== 'external' && value.source !== 'legacy')
    || (value.source === 'external'
      && (typeof value.occurrenceId !== 'string' || !value.occurrenceId.trim() || value.occurrenceId.length > 200))
    || !validCustomizationSelection(value.selection)
    || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))) return null;
  return value as CustomizationSelectionExactResultV1;
}

export async function customizationSelectionFingerprint(
  input: Omit<CustomizationSelectionExactResultV1, 'schemaVersion' | 'requestFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      operationId: input.operationId,
      ownerStableId: input.ownerStableId,
      lineage: input.lineage,
      accountGeneration: input.accountGeneration,
      parentOperationId: input.parentOperationId,
      revision: input.revision,
      source: input.source,
      occurrenceId: input.occurrenceId ?? null,
      selection: input.selection,
      createdAtMs: input.createdAtMs,
    }),
  );
}

export async function hasValidCustomizationSelectionFingerprint(input: unknown): Promise<boolean> {
  const exact = parseCustomizationSelectionExactResult(input);
  if (!exact) return false;
  const { schemaVersion: _schemaVersion, requestFingerprint, ...payload } = exact;
  return requestFingerprint === await customizationSelectionFingerprint(payload);
}

export function customizationSelectionFromEconomyProjection(
  projection: EconomyProjection | EconomyReducerState,
  ownerStableId: string,
  lineage: number,
): CustomizationSelectionExactResultV1 | null {
  let winner: CustomizationSelectionExactResultV1 | null = null;
  for (const receipt of Object.values(projection.receipts)) {
    if (receipt.delta !== 0 || receipt.grant.kind !== 'customization_selection_v1') continue;
    const exact = parseCustomizationSelectionExactResult(receipt.grant.exactResult);
    if (!exact
      || receipt.operationId !== exact.operationId
      || receipt.grant.entitlementId !== exact.operationId
      || exact.ownerStableId !== ownerStableId
      || exact.lineage !== lineage) continue;
    if (!winner
      || exact.revision > winner.revision
      || (exact.revision === winner.revision && exact.operationId.localeCompare(winner.operationId) > 0)) {
      winner = exact;
    }
  }
  return winner;
}

export async function hasValidAttemptRestoreGiftCreditFingerprint(input: unknown): Promise<boolean> {
  const exact = parseAttemptRestoreGiftCreditExactResult(input);
  if (!exact) return false;
  const expected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: exact.ownerStableId,
      spinRequestId: exact.spinRequestId,
      lane: exact.lane,
      giftId: exact.giftId,
      quantity: exact.quantity,
    }),
  );
  return expected === exact.requestFingerprint;
}

export async function hasValidAttemptRestoreGiftConsumeFingerprint(input: unknown): Promise<boolean> {
  const exact = parseAttemptRestoreGiftConsumeExactResult(input);
  if (!exact) return false;
  const expected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: exact.ownerStableId,
      sessionId: exact.sessionId,
      questionId: exact.questionId,
      recoveryOrdinal: exact.recoveryOrdinal,
      quantity: exact.quantity,
      attemptsGranted: exact.attemptsGranted,
    }),
  );
  return expected === exact.requestFingerprint;
}

export async function hasValidSessionAttemptRuneRecoveryFingerprint(input: unknown): Promise<boolean> {
  const exact = parseSessionAttemptRuneRecoveryExactResult(input);
  if (!exact) return false;
  const expected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: exact.ownerStableId,
      accountGeneration: exact.accountGeneration,
      sessionId: exact.sessionId,
      questionId: exact.questionId,
      recoveryOrdinal: exact.recoveryOrdinal,
      runeDelta: exact.runeDelta,
      attemptsGranted: exact.attemptsGranted,
      balanceBefore: exact.balanceBefore,
      balanceAfter: exact.balanceAfter,
      reason: exact.reason,
    }),
  );
  return expected === exact.requestFingerprint;
}

export function attemptRestoreGiftInventoryFromEconomyProjection(
  projection: EconomyProjection | EconomyReducerState,
  ownerStableId: string,
): AttemptRestoreGiftInventoryState {
  const credits: AttemptRestoreGiftCreditV1[] = [];
  const consumes: AttemptRestoreGiftConsumeV1[] = [];
  for (const receipt of Object.values(projection.receipts)) {
    if (receipt.delta !== 0 || receipt.grant.entitlementId !== receipt.operationId) continue;
    if (receipt.grant.kind === 'attempt_restore_inventory_credit') {
      const exact = parseAttemptRestoreGiftCreditExactResult(receipt.grant.exactResult);
      if (exact && exact.operationId === receipt.operationId && exact.ownerStableId === ownerStableId) credits.push(exact);
    }
    if (receipt.grant.kind === 'attempt_restore_inventory_consume') {
      const exact = parseAttemptRestoreGiftConsumeExactResult(receipt.grant.exactResult);
      if (exact && exact.operationId === receipt.operationId && exact.ownerStableId === ownerStableId) consumes.push(exact);
    }
  }
  const count = credits.length - consumes.length;
  if (count < 0) throw new Error('phone_state_attempt_restore_inventory_negative');
  return Object.freeze({
    credits: Object.freeze(credits.sort((left, right) => left.operationId.localeCompare(right.operationId))),
    consumes: Object.freeze(consumes.sort((left, right) => left.operationId.localeCompare(right.operationId))),
    count,
  });
}

export function parseLevelSpinStarCreditExactResult(input: unknown): LevelSpinStarCreditExactResult | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<LevelSpinStarCreditExactResult>;
  const allowed = [
    'schemaVersion', 'operationId', 'ownerStableId', 'requestId', 'lane', 'giftId',
    'amount', 'reason', 'grant', 'createdAtMs', 'requestFingerprint',
    ...(value.deliveryToken === undefined ? [] : ['deliveryToken']),
  ];
  if (!exactKeys(value, allowed)) return null;
  const requestId = String(value.requestId ?? '');
  const lane = value.lane === 'base' || value.lane === 'premium' ? value.lane : null;
  const giftId = String(value.giftId ?? '') as keyof typeof STAR_CREDIT_AMOUNTS;
  const amount = STAR_CREDIT_AMOUNTS[giftId];
  const operationId = lane ? `level_spin:${requestId}.${lane}` : '';
  const grant = value.grant;
  const payload = grant?.payload;
  if (value.schemaVersion !== 'client-level-spin-star-operation.v1'
    || !STAR_REQUEST_ID.test(requestId)
    || !lane
    || typeof value.ownerStableId !== 'string'
    || !value.ownerStableId.trim()
    || value.ownerStableId.includes('/')
    || value.ownerStableId.length > 160
    || value.operationId !== operationId
    || (value.deliveryToken !== undefined && !STAR_DELIVERY_TOKEN.test(value.deliveryToken))
    || !Number.isSafeInteger(amount)
    || value.amount !== amount
    || value.reason !== 'level_spin_star_reward'
    || !Number.isSafeInteger(value.createdAtMs)
    || Number(value.createdAtMs) < 0
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))
    || !grant || typeof grant !== 'object' || Array.isArray(grant)
    || !exactKeys(grant, ['kind', 'subjectId', 'payload'])
    || grant.kind !== 'star_credit'
    || grant.subjectId !== operationId
    || !payload || typeof payload !== 'object' || Array.isArray(payload)
    || !exactKeys(payload, ['requestId', 'lane', 'giftId', 'amount'])
    || payload.requestId !== requestId
    || payload.lane !== lane
    || payload.giftId !== giftId
    || payload.amount !== amount) return null;
  return value as LevelSpinStarCreditExactResult;
}

export function parseLevelSpinStarCreditAckExactResult(
  input: unknown,
): LevelSpinStarCreditAckExactResult | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Partial<LevelSpinStarCreditAckExactResult>;
  if (!exactKeys(value, [
    'schemaVersion', 'operationId', 'ownerStableId', 'requestFingerprint',
    'starsBalance', 'starsEarnedTotal', 'starsSeq',
  ])
    || value.schemaVersion !== 'client-level-spin-star-ack.v1'
    || !levelSpinStarCreditAckOperationId(String(value.operationId ?? ''))
    || typeof value.ownerStableId !== 'string'
    || !value.ownerStableId.trim()
    || value.ownerStableId.includes('/')
    || value.ownerStableId.length > 160
    || !STAR_FINGERPRINT.test(String(value.requestFingerprint ?? ''))
    || !Number.isSafeInteger(value.starsBalance) || Number(value.starsBalance) < 0
    || !Number.isSafeInteger(value.starsEarnedTotal) || Number(value.starsEarnedTotal) < 0
    || !Number.isSafeInteger(value.starsSeq) || Number(value.starsSeq) < 0) return null;
  return value as LevelSpinStarCreditAckExactResult;
}

export async function hasValidLevelSpinStarCreditRequestFingerprint(
  input: unknown,
): Promise<boolean> {
  const exact = parseLevelSpinStarCreditExactResult(input);
  if (!exact) return false;
  const expected = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      schemaVersion: 1,
      ownerStableId: exact.ownerStableId,
      requestId: exact.requestId,
      lane: exact.lane,
      deliveryToken: exact.deliveryToken ?? null,
      giftId: exact.giftId,
      amount: exact.amount,
      reason: exact.reason,
    }),
  );
  return expected === exact.requestFingerprint;
}

export function starCreditStateFromEconomyProjection(
  projection: EconomyProjection | EconomyReducerState,
): LevelSpinStarCreditState {
  const acknowledgements = new Map<string, string>();
  const acknowledgementResults: LevelSpinStarCreditAckExactResult[] = [];
  for (const receipt of Object.values(projection.receipts)) {
    if (receipt.delta !== 0 || receipt.grant?.kind !== 'star_credit_ack') continue;
    const exact = parseLevelSpinStarCreditAckExactResult(receipt.grant.exactResult);
    if (exact
      && receipt.operationId === levelSpinStarCreditAckOperationId(exact.operationId)
      && receipt.grant.entitlementId === exact.operationId) {
      acknowledgements.set(exact.operationId, exact.requestFingerprint);
      acknowledgementResults.push(exact);
    }
  }
  const credits = Object.values(projection.receipts).flatMap((receipt) => {
    if (receipt.delta !== 0 || receipt.grant?.kind !== 'star_credit'
      || receipt.grant.entitlementId !== receipt.operationId) return [];
    const exact = parseLevelSpinStarCreditExactResult(receipt.grant.exactResult);
    return exact
      && exact.operationId === receipt.operationId
      && acknowledgements.get(exact.operationId) !== exact.requestFingerprint
      ? [exact] : [];
  }).sort((left, right) => left.operationId.localeCompare(right.operationId));
  return Object.freeze({
    credits: Object.freeze(credits),
    acknowledgements: Object.freeze(acknowledgementResults.sort((left, right) => (
      left.operationId.localeCompare(right.operationId)
    ))),
  });
}

export function starCreditsFromEconomyProjection(
  projection: EconomyProjection | EconomyReducerState,
): readonly LevelSpinStarCreditExactResult[] {
  return starCreditStateFromEconomyProjection(projection).credits;
}

function validate(operation: OrdinaryEconomyOperation): void {
  const starCredit = operation.grant?.kind === 'star_credit'
    ? parseLevelSpinStarCreditExactResult(operation.grant.exactResult)
    : null;
  const starCreditAck = operation.grant?.kind === 'star_credit_ack'
    ? parseLevelSpinStarCreditAckExactResult(operation.grant.exactResult)
    : null;
  const attemptRestoreCredit = operation.grant?.kind === 'attempt_restore_inventory_credit'
    ? parseAttemptRestoreGiftCreditExactResult(operation.grant.exactResult)
    : null;
  const attemptRestoreConsume = operation.grant?.kind === 'attempt_restore_inventory_consume'
    ? parseAttemptRestoreGiftConsumeExactResult(operation.grant.exactResult)
    : null;
  const sessionAttemptRuneRecovery = operation.grant?.kind === 'session_attempt_recovery_rune_debit'
    ? parseSessionAttemptRuneRecoveryExactResult(operation.grant.exactResult)
    : null;
  const paidLevelSpinRunePurchase = operation.grant?.kind === 'paid_level_spin_rune_purchase'
    ? parsePaidLevelSpinRuneOperation(operation.grant.exactResult)
    : null;
  const customizationRunePurchase = operation.grant?.kind === 'customization_rune_purchase'
    ? parseCustomizationRunePurchaseExactResult(operation.grant.exactResult)
    : null;
  const customizationSelection = operation.grant?.kind === 'customization_selection_v1'
    ? parseCustomizationSelectionExactResult(operation.grant.exactResult)
    : null;
  if (
    !operation.operationId.trim()
    || !Number.isSafeInteger(operation.delta)
    || (operation.delta === 0 && !ZERO_DELTA_GRANT_KINDS.has(operation.grant?.kind ?? ''))
    || !operation.grant?.kind?.trim()
    || !operation.grant?.entitlementId?.trim()
    || (operation.grant?.kind === 'star_credit'
      && (!starCredit
        || operation.delta !== 0
        || operation.operationId !== starCredit.operationId
        || operation.grant.entitlementId !== starCredit.operationId))
    || (operation.grant?.kind === 'star_credit_ack'
      && (!starCreditAck
        || operation.delta !== 0
        || operation.operationId !== levelSpinStarCreditAckOperationId(starCreditAck.operationId)
        || operation.grant.entitlementId !== starCreditAck.operationId))
    || (operation.grant?.kind === 'attempt_restore_inventory_credit'
      && (!attemptRestoreCredit
        || operation.delta !== 0
        || operation.operationId !== attemptRestoreCredit.operationId
        || operation.grant.entitlementId !== attemptRestoreCredit.operationId))
    || (operation.grant?.kind === 'attempt_restore_inventory_consume'
      && (!attemptRestoreConsume
        || operation.delta !== 0
        || operation.operationId !== attemptRestoreConsume.operationId
        || operation.grant.entitlementId !== attemptRestoreConsume.operationId))
    || (operation.grant?.kind === 'session_attempt_recovery_rune_debit'
      && (!sessionAttemptRuneRecovery
        || operation.delta !== 0
        || operation.operationId !== sessionAttemptRuneRecovery.operationId
        || operation.grant.entitlementId !== sessionAttemptRuneRecovery.operationId))
    || (operation.grant?.kind === 'paid_level_spin_rune_purchase'
      && (!paidLevelSpinRunePurchase
        || operation.delta !== 0
        || operation.operationId !== paidLevelSpinRunePurchase.operationId
        || operation.grant.entitlementId !== paidLevelSpinRunePurchase.operationId))
    || (operation.grant?.kind === 'customization_rune_purchase'
      && (!customizationRunePurchase
        || operation.delta !== 0
        || operation.operationId !== customizationRunePurchase.operationId
        || operation.grant.entitlementId !== customizationRunePurchase.operationId))
    || (operation.grant?.kind === 'customization_selection_v1'
      && (!customizationSelection
        || operation.delta !== 0
        || operation.operationId !== customizationSelection.operationId
        || operation.grant.entitlementId !== customizationSelection.operationId))
  ) throw new Error('phone_state_economy_composite_invalid');
}

export function replayOrdinaryEconomy(
  operations: readonly OrdinaryEconomyOperation[],
  openingBalance = 0,
): EconomyProjection {
  const receipts: Record<string, OrdinaryEconomyOperation> = {};
  let balance = openingBalance;
  for (const operation of operations) {
    validate(operation);
    const existing = receipts[operation.operationId];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(operation)) {
        throw new Error('phone_state_economy_operation_id_reused');
      }
      continue;
    }
    receipts[operation.operationId] = Object.freeze({ ...operation, grant: Object.freeze({ ...operation.grant }) });
    balance += operation.delta;
    if (!Number.isSafeInteger(balance)) throw new Error('phone_state_economy_overflow');
  }
  return Object.freeze({ balance, receipts: Object.freeze(receipts) });
}

export interface EconomyOperationJournal {
  commit(operation: OrdinaryEconomyOperation): Promise<Readonly<{ duplicate: boolean; balance: number }>>;
}

export function createOrdinaryEconomyAdapter(journal: EconomyOperationJournal): Readonly<{
  commit(operation: OrdinaryEconomyOperation): Promise<Readonly<{ duplicate: boolean; balance: number }>>;
}> {
  return Object.freeze({
    commit: async (operation) => {
      validate(operation);
      return journal.commit(operation);
    },
  });
}

export type EconomyReducerState = Readonly<{
  receipts: Readonly<Record<string, OrdinaryEconomyOperation>>;
  openingBalance: number | null;
  balance: number;
  appliedOperationIds: readonly string[];
}>;

export function economyProjectionFromReducerState(state: EconomyReducerState): EconomyProjection {
  return Object.freeze({ balance: state.balance, receipts: state.receipts });
}

export function createEconomyReducer(): DomainReducer<EconomyReducerState> {
  return Object.freeze({
    domain: 'economy',
    version: 1,
    initial: () => Object.freeze({
      receipts: Object.freeze({}), openingBalance: null, balance: 0, appliedOperationIds: Object.freeze([]),
    }),
    apply: (state, operation: PersonalOperation) => {
      if (state.appliedOperationIds.includes(operation.operationId)) return state;
      if (operation.kind === 'opening_balance') {
        const balance = (operation.payload as { balance?: unknown } | null)?.balance;
        if (!operation.entityId || !Number.isSafeInteger(balance) || Number(balance) < 0) {
          throw new Error('phone_state_economy_opening_invalid');
        }
        if (state.openingBalance !== null && state.openingBalance !== balance) {
          throw new Error('phone_state_economy_opening_conflict');
        }
        const nextBalance = state.openingBalance === null ? state.balance + Number(balance) : state.balance;
        return Object.freeze({
          ...state,
          openingBalance: Number(balance),
          balance: nextBalance,
          appliedOperationIds: Object.freeze([...state.appliedOperationIds, operation.operationId].sort()),
        });
      }
      if (operation.kind !== 'composite' || !operation.entityId) {
        throw new Error('phone_state_economy_composite_invalid');
      }
      const composite = operation.payload as OrdinaryEconomyOperation;
      validate(composite);
      if (composite.operationId !== operation.entityId) throw new Error('phone_state_economy_operation_id_invalid');
      const existing = state.receipts[composite.operationId];
      if (existing && JSON.stringify(existing) !== JSON.stringify(composite)) {
        throw new Error('phone_state_economy_operation_id_reused');
      }
      const balance = existing ? state.balance : state.balance + composite.delta;
      if (!Number.isSafeInteger(balance)) throw new Error('phone_state_economy_overflow');
      return Object.freeze({
        receipts: existing ? state.receipts : Object.freeze({ ...state.receipts, [composite.operationId]: Object.freeze(composite) }),
        openingBalance: state.openingBalance,
        balance,
        appliedOperationIds: Object.freeze([...state.appliedOperationIds, operation.operationId].sort()),
      });
    },
    validate: (value: unknown): value is EconomyReducerState => {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<EconomyReducerState>;
      return !!state.receipts && typeof state.receipts === 'object'
        && (state.openingBalance === null || (Number.isSafeInteger(state.openingBalance) && Number(state.openingBalance) >= 0))
        && Number.isSafeInteger(state.balance)
        && Array.isArray(state.appliedOperationIds)
        && state.appliedOperationIds.every((id) => typeof id === 'string');
    },
  });
}

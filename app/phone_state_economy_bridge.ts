import { canonicalJsonWithLimit } from '../modules/phone-state/canonical';
import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import {
  hasValidAttemptRestoreGiftConsumeFingerprint,
  hasValidAttemptRestoreGiftCreditFingerprint,
  hasValidCustomizationRunePurchaseFingerprint,
  hasValidCustomizationSelectionFingerprint,
  hasValidLevelSpinStarCreditRequestFingerprint,
  hasValidPaidLevelSpinRuneFingerprint,
  hasValidSessionAttemptRuneRecoveryFingerprint,
  levelSpinStarCreditAckOperationId,
  parseAttemptRestoreGiftConsumeExactResult,
  parseAttemptRestoreGiftCreditExactResult,
  parseCustomizationRunePurchaseExactResult,
  parseCustomizationSelectionExactResult,
  parseLevelSpinStarCreditAckExactResult,
  parseLevelSpinStarCreditExactResult,
  parsePaidLevelSpinRuneOperation,
  parseSessionAttemptRuneRecoveryExactResult,
  starCreditStateFromEconomyProjection,
  customizationSelectionFromEconomyProjection,
  type AttemptRestoreGiftConsumeV1,
  type AttemptRestoreGiftCreditV1,
  type CustomizationRunePurchaseExactResultV1,
  type CustomizationSelectionExactResultV1,
  type EconomyReducerState,
  type LevelSpinStarCreditAckExactResult,
  type LevelSpinStarCreditExactResult,
  type LevelSpinStarCreditState,
  type OrdinaryEconomyOperation,
  type PaidLevelSpinRuneOperationV1,
  type SessionAttemptRuneRecoveryExactResultV1,
} from '../modules/phone-state/domains/economy';
import type { PhoneStateStore } from '../modules/phone-state/store';

export type LegacyClientEconomyOperation = Readonly<{
  operationId: string;
  ownerStableId: string;
  authority: 'client' | 'external';
  direction: 'debit' | 'credit';
  amount: number;
  delta: number;
  reason: string;
  grant: Readonly<{ kind: string; subjectId: string; payload?: unknown }>;
  revision: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAtMs: number;
  requestFingerprint: string;
}>;

type Runtime = Readonly<{
  scope: PhoneStateScope;
  runtimeGeneration: number;
  deviceId: string;
  store: PhoneStateStore;
  triggerSync: () => void;
}>;

let runtime: Runtime | null = null;

export function configurePhoneStateEconomyBridge(next: Runtime | null): void {
  runtime = next;
}

/** Snapshot only; callers must still re-check account generation after awaits. */
export function currentPhoneStateEconomyScope(
  expectedOwnerStableId: string,
): Readonly<{ ownerStableId: string; lineage: number; runtimeGeneration: number }> | null {
  const active = runtime;
  if (!active || active.scope.stableUid !== expectedOwnerStableId) return null;
  return Object.freeze({
    ownerStableId: active.scope.stableUid,
    lineage: active.scope.accountGeneration,
    runtimeGeneration: active.runtimeGeneration,
  });
}

export function phoneStateEconomyCompositeFromLegacy(
  operation: LegacyClientEconomyOperation,
): OrdinaryEconomyOperation {
  return Object.freeze({
    operationId: operation.operationId,
    delta: operation.delta,
    grant: Object.freeze({
      kind: operation.grant.kind,
      entitlementId: operation.grant.subjectId,
      exactResult: Object.freeze({
        grant: operation.grant,
        reason: operation.reason,
        legacyReceipt: operation,
      }),
    }),
  });
}

export async function commitPhoneStateEconomyOperation(operation: LegacyClientEconomyOperation): Promise<boolean> {
  const active = runtime;
  if (!active || operation.authority !== 'client' || operation.ownerStableId !== active.scope.stableUid) return false;
  const composite = phoneStateEconomyCompositeFromLegacy(operation);
  try {
    canonicalJsonWithLimit(composite, 48 * 1024);
    const pending: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'economy',
      kind: 'composite',
      entityId: operation.operationId,
      payload: composite,
      exactResult: composite.grant,
      createdAtMs: operation.createdAtMs,
    });
    await active.store.commit(pending, { idempotencyKey: `economy:${operation.operationId}` });
    if (runtime !== active || active.scope.stableUid !== operation.ownerStableId) return false;
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

export async function commitPhoneStateCustomizationSelection(
  input: CustomizationSelectionExactResultV1,
): Promise<boolean> {
  const active = runtime;
  const exact = parseCustomizationSelectionExactResult(input);
  if (!active
    || !exact
    || exact.ownerStableId !== active.scope.stableUid
    || exact.lineage !== active.scope.accountGeneration
    || !await hasValidCustomizationSelectionFingerprint(exact)
    || runtime !== active) return false;
  const composite: OrdinaryEconomyOperation = Object.freeze({
    operationId: exact.operationId,
    delta: 0,
    grant: Object.freeze({
      kind: 'customization_selection_v1',
      entitlementId: exact.operationId,
      exactResult: exact,
    }),
  });
  try {
    canonicalJsonWithLimit(composite, 48 * 1024);
    const pending: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'economy',
      kind: 'composite',
      entityId: exact.operationId,
      payload: composite,
      exactResult: composite.grant,
      createdAtMs: exact.createdAtMs,
    });
    await active.store.commit(pending, { idempotencyKey: `economy:${exact.operationId}` });
    if (runtime !== active
      || active.scope.stableUid !== exact.ownerStableId
      || active.scope.accountGeneration !== exact.lineage) return false;
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

export async function readPhoneStateCustomizationSelection(
  expectedOwnerStableId: string,
  expectedLineage: number,
): Promise<CustomizationSelectionExactResultV1 | null> {
  const active = runtime;
  if (!active
    || active.scope.stableUid !== expectedOwnerStableId
    || active.scope.accountGeneration !== expectedLineage) return null;
  const projection = await active.store.readProjection('economy');
  if (runtime !== active
    || active.scope.stableUid !== expectedOwnerStableId
    || active.scope.accountGeneration !== expectedLineage
    || !projection?.state || typeof projection.state !== 'object') return null;
  const winner = customizationSelectionFromEconomyProjection(
    projection.state as EconomyReducerState,
    expectedOwnerStableId,
    expectedLineage,
  );
  return winner && await hasValidCustomizationSelectionFingerprint(winner) ? winner : null;
}

type NonMonetaryEconomyGrantInput = Readonly<{
  operationId: string;
  kind: 'premium_freeze';
  entitlementId: string;
  exactResult: unknown;
}> | Readonly<{
  operationId: string;
  kind: 'paid_level_spin_rune_purchase';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: PaidLevelSpinRuneOperationV1 | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'star_credit';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: LevelSpinStarCreditExactResult | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'star_credit_ack';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: LevelSpinStarCreditAckExactResult | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'attempt_restore_inventory_credit';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: AttemptRestoreGiftCreditV1 | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'attempt_restore_inventory_consume';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: AttemptRestoreGiftConsumeV1 | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'session_attempt_recovery_rune_debit';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: SessionAttemptRuneRecoveryExactResultV1 | unknown;
}> | Readonly<{
  operationId: string;
  kind: 'customization_rune_purchase';
  entitlementId: string;
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
  exactResult: CustomizationRunePurchaseExactResultV1 | unknown;
}>;

export async function commitPhoneStateNonMonetaryEconomyGrant(
  input: NonMonetaryEconomyGrantInput,
): Promise<boolean> {
  const active = runtime;
  if (!active) return false;
  if (input.kind === 'star_credit') {
    const exact = parseLevelSpinStarCreditExactResult(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidLevelSpinStarCreditRequestFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'star_credit_ack') {
    const exact = parseLevelSpinStarCreditAckExactResult(input.exactResult);
    if (!exact
      || input.operationId !== levelSpinStarCreditAckOperationId(exact.operationId)
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'attempt_restore_inventory_credit') {
    const exact = parseAttemptRestoreGiftCreditExactResult(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidAttemptRestoreGiftCreditFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'attempt_restore_inventory_consume') {
    const exact = parseAttemptRestoreGiftConsumeExactResult(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidAttemptRestoreGiftConsumeFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'session_attempt_recovery_rune_debit') {
    const exact = parseSessionAttemptRuneRecoveryExactResult(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || input.expectedAccountGeneration !== exact.accountGeneration
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidSessionAttemptRuneRecoveryFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'customization_rune_purchase') {
    const exact = parseCustomizationRunePurchaseExactResult(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || input.expectedAccountGeneration !== exact.accountGeneration
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidCustomizationRunePurchaseFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  if (input.kind === 'paid_level_spin_rune_purchase') {
    const exact = parsePaidLevelSpinRuneOperation(input.exactResult);
    if (!exact
      || input.operationId !== exact.operationId
      || input.entitlementId !== exact.operationId
      || input.expectedOwnerStableId !== exact.ownerStableId
      || input.expectedAccountGeneration !== exact.accountGeneration
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
    if (!await hasValidPaidLevelSpinRuneFingerprint(exact)
      || runtime !== active
      || active.scope.stableUid !== input.expectedOwnerStableId
      || active.runtimeGeneration !== input.expectedAccountGeneration) return false;
  }
  const composite: OrdinaryEconomyOperation = Object.freeze({
    operationId: input.operationId,
    delta: 0,
    grant: Object.freeze({
      kind: input.kind,
      entitlementId: input.entitlementId,
      exactResult: input.exactResult,
    }),
  });
  try {
    canonicalJsonWithLimit(composite, 48 * 1024);
    const pending: PendingPersonalOperation = Object.freeze({
      schemaVersion: 1,
      stableUid: active.scope.stableUid,
      accountGeneration: active.scope.accountGeneration,
      deviceId: active.deviceId,
      domain: 'economy',
      kind: 'composite',
      entityId: input.operationId,
      payload: composite,
      exactResult: composite.grant,
      createdAtMs: Date.now(),
    });
    await active.store.commit(pending, { idempotencyKey: `economy:${input.operationId}` });
    if (runtime !== active) return false;
    if ((input.kind === 'star_credit'
      || input.kind === 'star_credit_ack'
      || input.kind === 'attempt_restore_inventory_credit'
      || input.kind === 'attempt_restore_inventory_consume'
      || input.kind === 'session_attempt_recovery_rune_debit'
      || input.kind === 'paid_level_spin_rune_purchase'
      || input.kind === 'customization_rune_purchase')
      && (active.scope.stableUid !== input.expectedOwnerStableId
        || active.runtimeGeneration !== input.expectedAccountGeneration)) return false;
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

export async function readPhoneStateStarCredits(input: Readonly<{
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
}>): Promise<readonly LevelSpinStarCreditExactResult[]> {
  const active = runtime;
  if (!active
    || active.scope.stableUid !== input.expectedOwnerStableId
    || active.runtimeGeneration !== input.expectedAccountGeneration) return Object.freeze([]);
  return (await readPhoneStateStarCreditState(input)).credits;
}

export async function readPhoneStateStarCreditState(input: Readonly<{
  expectedOwnerStableId: string;
  expectedAccountGeneration: number;
}>): Promise<LevelSpinStarCreditState> {
  const active = runtime;
  const empty = (): LevelSpinStarCreditState => Object.freeze({
    credits: Object.freeze([]), acknowledgements: Object.freeze([]),
  });
  if (!active
    || active.scope.stableUid !== input.expectedOwnerStableId
    || active.runtimeGeneration !== input.expectedAccountGeneration) return empty();
  const projection = await active.store.readProjection('economy');
  if (runtime !== active
    || active.scope.stableUid !== input.expectedOwnerStableId
    || active.runtimeGeneration !== input.expectedAccountGeneration
    || !projection?.state || typeof projection.state !== 'object') return empty();
  const state = starCreditStateFromEconomyProjection(projection.state as EconomyReducerState);
  return Object.freeze({
    credits: Object.freeze(state.credits.filter((entry) => entry.ownerStableId === input.expectedOwnerStableId)),
    acknowledgements: Object.freeze(state.acknowledgements.filter((entry) => (
      entry.ownerStableId === input.expectedOwnerStableId
    ))),
  });
}

export function requestPhoneStateEconomySync(): boolean {
  if (!runtime) return false;
  runtime.triggerSync();
  return true;
}

export default function __RouteShim() { return null; }

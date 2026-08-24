import { canonicalJsonWithLimit } from '../modules/phone-state/canonical';
import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import {
  hasValidLevelSpinStarCreditRequestFingerprint,
  levelSpinStarCreditAckOperationId,
  parseLevelSpinStarCreditAckExactResult,
  parseLevelSpinStarCreditExactResult,
  starCreditStateFromEconomyProjection,
  type EconomyReducerState,
  type LevelSpinStarCreditAckExactResult,
  type LevelSpinStarCreditExactResult,
  type LevelSpinStarCreditState,
  type OrdinaryEconomyOperation,
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
    active.triggerSync();
    return true;
  } catch {
    return false;
  }
}

type NonMonetaryEconomyGrantInput = Readonly<{
  operationId: string;
  kind: 'premium_freeze';
  entitlementId: string;
  exactResult: unknown;
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
    if ((input.kind === 'star_credit' || input.kind === 'star_credit_ack')
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

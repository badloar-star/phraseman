import { HttpsError } from 'firebase-functions/v2/https';

import type { V2AccessPurchaseRequest } from '../../modules/learning-v2/contracts/access_quote';
import { hashCanonicalBody } from '../../modules/learning-v2/policies/decision_registry';
import {
  finalizeV2AccessPurchase,
  type FinalizeV2AccessPurchaseInput,
  type V2AccessPurchaseRepository,
} from './learning_v2_access_adapter';
import type { AccessBoostPolicy } from '../../modules/learning-v2/contracts/access_boost';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export interface NormalizedV2AccessCallableInput {
  readonly operationId: string;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly request: V2AccessPurchaseRequest;
}

export const normalizeV2AccessPurchaseInput = (
  data: unknown,
): NormalizedV2AccessCallableInput => {
  if (!record(data)) throw new HttpsError('invalid-argument', 'access_input_invalid');
  const operationId = text(data.operationId);
  const stableId = text(data.stableId);
  const accountGeneration = typeof data.accountGeneration === 'number' ? data.accountGeneration : NaN;
  const request: V2AccessPurchaseRequest = {
    opId: text(data.opId),
    quoteId: text(data.quoteId),
    stableId,
    seasonId: text(data.seasonId),
    gateId: text(data.gateId),
    releaseId: text(data.releaseId),
    policyVersion: text(data.policyVersion),
    expectedCostShards:
      typeof data.expectedCostShards === 'number' ? data.expectedCostShards : NaN,
  };
  if (
    !/^[A-Za-z0-9._-]{8,160}$/.test(operationId) ||
    !stableId ||
    !Number.isSafeInteger(accountGeneration) ||
    accountGeneration < 1 ||
    request.opId !== operationId ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(request.quoteId) ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(request.seasonId) ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(request.gateId) ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(request.releaseId) ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(request.policyVersion) ||
    !Number.isSafeInteger(request.expectedCostShards) ||
    request.expectedCostShards < 0
  ) {
    throw new HttpsError('invalid-argument', 'access_input_invalid');
  }
  return Object.freeze({ request, operationId, stableId, accountGeneration });
};

export const assertV2AccessStableIdentity = (
  normalized: NormalizedV2AccessCallableInput,
  binding: { readonly stableUid: string; readonly accountGeneration: number } | undefined,
): void => {
  if (
    !binding ||
    normalized.stableId !== binding.stableUid ||
    normalized.accountGeneration !== binding.accountGeneration
  ) {
    throw new HttpsError('permission-denied', 'stable_identity_mismatch');
  }
};

export interface V2AccessCallableDependencies {
  readonly repository: V2AccessPurchaseRepository;
  readonly resolvePolicy: (
    input: NormalizedV2AccessCallableInput,
  ) => Promise<AccessBoostPolicy>;
  readonly resolveAccountBinding: (
    authUid: string,
  ) => Promise<{ readonly stableUid: string; readonly accountGeneration: number }>;
  readonly nowMs?: () => number;
  readonly decisionRegistryRef?: { readonly id: string; readonly version: number; readonly contentHash: string };
}

export async function executeV2AccessPurchaseCallable(
  request: CallableRequest<unknown>,
  dependencies: V2AccessCallableDependencies,
): Promise<{ readonly ok: true; readonly replayed: boolean; readonly receipt: unknown }> {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const input = normalizeV2AccessPurchaseInput(request.data);
  const binding = await dependencies.resolveAccountBinding(request.auth.uid);
  assertV2AccessStableIdentity(input, binding);
  const nowMs = dependencies.nowMs?.() ?? Date.now();
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new HttpsError('failed-precondition', 'server_time_invalid');
  }
  const policy = await dependencies.resolvePolicy(input);
  const adapterInput: FinalizeV2AccessPurchaseInput = {
    operationId: input.operationId,
    fingerprint: hashCanonicalBody(input),
    authUid: request.auth.uid,
    stableId: input.stableId,
    accountGeneration: input.accountGeneration,
    request: input.request,
    nowMs,
    decisionRegistryRef: dependencies.decisionRegistryRef,
  };
  try {
    const result = await finalizeV2AccessPurchase(dependencies.repository, policy, adapterInput);
    return { ok: true, replayed: result.replayed, receipt: result.receipt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'access_purchase_failed';
    const code = reason.includes('insufficient_balance')
      ? 'resource-exhausted'
      : reason.includes('replay_mismatch')
        ? 'already-exists'
        : reason.includes('binding') || reason.includes('identity') ||
            reason.includes('account_generation') || reason.includes('account_delete') ||
            reason.includes('quote_') ||
            reason.includes('already_unlocked') || reason.includes('decision_registry') ||
            reason.includes('required_') || reason.includes('capability_') || reason.includes('local_') ||
            reason.includes('checkpoint') || reason.includes('deficit_')
          ? 'failed-precondition'
          : 'internal';
    throw new HttpsError(code, 'access_purchase_rejected');
  }
}

export const createV2AccessPurchaseCallable = (
  dependencies: V2AccessCallableDependencies,
) => onCall({ enforceAppCheck: true }, async (request: CallableRequest<unknown>) =>
  executeV2AccessPurchaseCallable(request, dependencies));

import { HttpsError } from 'firebase-functions/v2/https';

import type { V2AccessPurchaseRequest } from '../../modules/learning-v2/contracts/access_quote';

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
  const accountGeneration = Number(data.accountGeneration);
  const request: V2AccessPurchaseRequest = {
    opId: text(data.opId),
    quoteId: text(data.quoteId),
    stableId,
    seasonId: text(data.seasonId),
    gateId: text(data.gateId),
    releaseId: text(data.releaseId),
    policyVersion: text(data.policyVersion),
    expectedCostShards: Number(data.expectedCostShards),
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
  authUid: string | undefined,
): void => {
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  if (normalized.stableId !== authUid) {
    throw new HttpsError('permission-denied', 'stable_identity_mismatch');
  }
};

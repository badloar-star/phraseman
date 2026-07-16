import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertV2AccessStableIdentity,
  normalizeV2AccessPurchaseInput,
} from './learning_v2_access_callable';

const valid = {
  operationId: 'operation-1', opId: 'operation-1', stableId: 'user-1', accountGeneration: 2,
  quoteId: 'quote-1', seasonId: 'season-1', gateId: 'gate-2', releaseId: 'release-1',
  policyVersion: 'gate-policy-v1', expectedCostShards: 6,
};

describe('V2 access callable boundary', () => {
  it('normalizes a strict request and binds opId', () => {
    expect(normalizeV2AccessPurchaseInput(valid)).toEqual({
      operationId: 'operation-1', stableId: 'user-1', accountGeneration: 2,
      request: expect.objectContaining({ opId: 'operation-1', expectedCostShards: 6 }),
    });
  });

  it.each([
    ['operation id', { operationId: 'x' }],
    ['operation binding', { opId: 'different-operation' }],
    ['generation', { accountGeneration: 0 }],
    ['cost', { expectedCostShards: -1 }],
    ['quote id', { quoteId: '../quote' }],
  ])('rejects malformed %s', (_label, patch) => {
    expect(() => normalizeV2AccessPurchaseInput({ ...valid, ...patch })).toThrow(HttpsError);
  });

  it('requires auth and exact stable identity', () => {
    const normalized = normalizeV2AccessPurchaseInput(valid);
    expect(() => assertV2AccessStableIdentity(normalized, undefined)).toThrow('auth_required');
    expect(() => assertV2AccessStableIdentity(normalized, 'user-2')).toThrow('stable_identity_mismatch');
    expect(() => assertV2AccessStableIdentity(normalized, 'user-1')).not.toThrow();
  });
});

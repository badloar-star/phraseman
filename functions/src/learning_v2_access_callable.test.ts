import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertV2AccessStableIdentity,
  executeV2AccessPurchaseCallable,
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
    ['generation type', { accountGeneration: '2' }],
    ['cost', { expectedCostShards: -1 }],
    ['cost type', { expectedCostShards: '6' }],
    ['quote id', { quoteId: '../quote' }],
  ])('rejects malformed %s', (_label, patch) => {
    expect(() => normalizeV2AccessPurchaseInput({ ...valid, ...patch })).toThrow(HttpsError);
  });

  it('requires the exact server-derived stable identity and generation', () => {
    const normalized = normalizeV2AccessPurchaseInput(valid);
    expect(() => assertV2AccessStableIdentity(normalized, undefined)).toThrow('stable_identity_mismatch');
    expect(() => assertV2AccessStableIdentity(normalized, { stableUid: 'user-2', accountGeneration: 2 })).toThrow('stable_identity_mismatch');
    expect(() => assertV2AccessStableIdentity(normalized, { stableUid: 'user-1', accountGeneration: 3 })).toThrow('stable_identity_mismatch');
    expect(() => assertV2AccessStableIdentity(normalized, { stableUid: 'user-1', accountGeneration: 2 })).not.toThrow();
  });

  it('orchestrates auth, server policy resolution and the transaction adapter', async () => {
    const calls: unknown[] = [];
    const result = await executeV2AccessPurchaseCallable(
      { data: valid, auth: { uid: 'user-1' } } as any,
      {
        repository: {
          runTransaction: async (fn) => fn({
            get: async () => ({ exists: false }),
            create: (key, value) => calls.push(['create', key, value]),
            update: (key, value) => calls.push(['update', key, value]),
          }),
        },
        resolveAccountBinding: async () => ({ stableUid: 'user-1', accountGeneration: 2 }),
        resolvePolicy: async () => {
          calls.push('policy');
          return { unitPriceShards: 3, maxPurchasedPerGate: 3, maxPurchasedPerChapter: 3, maxPurchasedPerSeason: 12 };
        },
      },
    ).catch((error) => error);
    expect(result).toBeInstanceOf(Error);
    expect(calls).toContain('policy');
  });

  it('uses the server-derived stable owner and generation instead of equating them to the auth uid', async () => {
    const requested = { ...valid, stableId: 'stable-user-1', accountGeneration: 7 };
    const observed: unknown[] = [];
    await executeV2AccessPurchaseCallable(
      { data: requested, auth: { uid: 'provider-auth-1' } } as any,
      {
        repository: {
          runTransaction: async (fn: any) => fn({
            get: async (key: string) => {
              observed.push(key);
              return { exists: false };
            },
            create: () => undefined,
            update: () => undefined,
          }),
        },
        resolveAccountBinding: async () => ({
          stableUid: 'stable-user-1',
          accountGeneration: 7,
        }),
        resolvePolicy: async () => ({
          unitPriceShards: 3,
          maxPurchasedPerGate: 3,
          maxPurchasedPerChapter: 3,
          maxPurchasedPerSeason: 12,
        }),
      } as any,
    ).catch((error) => error);

    expect(observed.slice(0, 3)).toEqual([
      'auth_links:provider-auth-1',
      'users:stable-user-1',
      'account_deletion_tombstones:stable-user-1',
    ]);
  });

  it('rejects unauthenticated requests before parsing malformed payloads', async () => {
    await expect(executeV2AccessPurchaseCallable({ data: null } as any, {
      repository: {} as any,
      resolveAccountBinding: async () => ({ stableUid: 'user-1', accountGeneration: 2 }),
      resolvePolicy: async () => ({ unitPriceShards: 3, maxPurchasedPerGate: 3, maxPurchasedPerChapter: 3, maxPurchasedPerSeason: 12 }),
    })).rejects.toThrow('auth_required');
  });
});

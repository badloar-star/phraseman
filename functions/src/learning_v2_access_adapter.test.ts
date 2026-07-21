import {
  firestoreV2AccessPath,
  finalizeV2AccessPurchase,
  type V2AccessPurchaseRepository,
} from './learning_v2_access_adapter';
import type { AccessBoostPolicy } from '../../modules/learning-v2/contracts/access_boost';
import type { V2AccessQuote } from '../../modules/learning-v2/contracts/access_quote';

class MemoryRepository implements V2AccessPurchaseRepository {
  readonly values = new Map<string, unknown>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  private active = false;
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (this.active) throw new Error('transaction_collision');
    this.active = true;
    try {
      const tx = {
        get: async <U>(key: string) => {
          this.reads.push(key);
          return { exists: this.values.has(key), data: this.values.get(key) as U };
        },
        create: (key: string, value: unknown) => {
          if (this.values.has(key)) throw new Error('already_exists');
          this.writes.push(key);
          this.values.set(key, value);
        },
        update: (key: string, value: Record<string, unknown>) => {
          this.writes.push(key);
          this.values.set(key, { ...(this.values.get(key) as Record<string, unknown>), ...value });
        },
      };
      return await fn(tx);
    } finally {
      this.active = false;
    }
  }
}

const policy: AccessBoostPolicy = {
  unitPriceShards: 3,
  maxPurchasedPerGate: 3,
  maxPurchasedPerChapter: 3,
  maxPurchasedPerSeason: 12,
};
const input = {
  operationId: 'operation-1',
  fingerprint: 'a'.repeat(64),
  authUid: 'provider-auth-1',
  stableId: 'user-1',
  accountGeneration: 1,
  nowMs: 1_000,
  request: {
    opId: 'operation-1', quoteId: 'quote-1', stableId: 'user-1', seasonId: 'season-1', gateId: 'gate-2',
    releaseId: 'release-1', policyVersion: 'gate-policy-v1', expectedCostShards: 6,
  },
};
const quote: V2AccessQuote = {
  quoteId: 'quote-1', stableId: 'user-1', seasonId: 'season-1', gateId: 'gate-2', policyVersion: 'gate-policy-v1',
  releaseId: 'release-1', expiresAtMs: 2_000, earnedDeficit: 2, accessStarsToApply: 2, unitPriceShards: 3, totalCostShards: 6,
};
const seed = (repo: MemoryRepository) => {
  repo.values.set('auth_links:provider-auth-1', { stable_id: 'user-1' });
  repo.values.set('learning-v2:access-quote:user-1:quote-1', quote);
  repo.values.set('learning-v2:access-gate:user-1:season-1:gate-2', {
    stableId: 'user-1', accountGeneration: 1, seasonId: 'season-1', gateId: 'gate-2', releaseId: 'release-1', policyVersion: 'gate-policy-v1',
    requiredLoopsComplete: true, capabilityFallbackComplete: true, localPerformanceComplete: true, checkpointComplete: true,
    honestBlockCount: 2, recoveryReviewImpressionCount: 1, earnedDeficit: 2, purchasedForGate: 0, purchasedForChapter: 0, purchasedForSeason: 0, unlocked: false,
  });
  repo.values.set('users:user-1', { stableId: 'user-1', accountGeneration: 1, shards: 10 });
};

describe('V2 access purchase transaction adapter', () => {
  it.each([
    [
      'provider relink',
      () => ({ key: 'auth_links:provider-auth-1', value: { stable_id: 'different-user' } }),
      'access_stable_identity_mismatch',
    ],
    [
      'account generation change',
      () => ({ key: 'users:user-1', value: { stableId: 'user-1', accountGeneration: 2, shards: 10 } }),
      'access_account_generation_mismatch',
    ],
    [
      'deletion tombstone',
      () => ({ key: 'account_deletion_tombstones:user-1', value: { status: 'pending' } }),
      'access_account_delete_pending',
    ],
  ])(
    'fails closed with ordered barrier reads and zero writes after a pre-read %s',
    async (_label, race, expectedError) => {
      const repo = new MemoryRepository();
      seed(repo);
      const raced = race();
      repo.values.set(raced.key, raced.value);

      await expect(finalizeV2AccessPurchase(repo, policy, input))
        .rejects.toThrow(expectedError);

      expect(repo.reads).toEqual([
        'auth_links:provider-auth-1',
        'users:user-1',
        'account_deletion_tombstones:user-1',
      ]);
      expect(repo.writes).toEqual([]);
      expect(repo.values.has('learning-v2:access-receipt:user-1:operation-1')).toBe(false);
      expect(repo.values.has('learning-v2:access-operation:user-1:operation-1')).toBe(false);
      expect(repo.values.get('users:user-1')).toMatchObject({ shards: 10 });
      expect(repo.values.get('learning-v2:access-gate:user-1:season-1:gate-2'))
        .toMatchObject({ unlocked: false });
    },
  );

  it('routes the account-bound quote below the canonical stable owner root', () => {
    expect(firestoreV2AccessPath('learning-v2:access-quote:user-1:quote-1'))
      .toBe('users/user-1/v2_access_quotes/quote-1');
  });

  it('spends once, writes one receipt, and unlocks the scoped gate', async () => {
    const repo = new MemoryRepository(); seed(repo);
    const result = await finalizeV2AccessPurchase(repo, policy, input);
    expect(result).toEqual({ replayed: false, receipt: expect.objectContaining({ shardsSpent: 6, accessStarsApplied: 2 }) });
    expect(repo.values.get('users:user-1')).toMatchObject({ shards: 4 });
    expect(repo.values.get('learning-v2:access-gate:user-1:season-1:gate-2')).toMatchObject({ unlocked: true, earnedDeficit: 0 });
  });

  it('replays the same operation without spending twice', async () => {
    const repo = new MemoryRepository(); seed(repo);
    const first = await finalizeV2AccessPurchase(repo, policy, input);
    const second = await finalizeV2AccessPurchase(repo, policy, input);
    expect(second).toEqual({ replayed: true, receipt: first.receipt });
    expect(repo.values.get('users:user-1')).toMatchObject({ shards: 4 });
  });

  it('blocks replay success after a provider relink without another debit or write', async () => {
    const repo = new MemoryRepository(); seed(repo);
    await finalizeV2AccessPurchase(repo, policy, input);
    repo.values.set('auth_links:provider-auth-1', {
      stable_id: 'different-user',
    });
    repo.reads.length = 0;
    repo.writes.length = 0;

    await expect(finalizeV2AccessPurchase(repo, policy, input))
      .rejects.toThrow('access_stable_identity_mismatch');

    expect(repo.reads).toEqual([
      'auth_links:provider-auth-1',
      'users:user-1',
      'account_deletion_tombstones:user-1',
    ]);
    expect(repo.writes).toEqual([]);
    expect(repo.values.get('users:user-1')).toMatchObject({ shards: 4 });
  });

  it('rejects reused operation ids with a different fingerprint', async () => {
    const repo = new MemoryRepository(); seed(repo);
    await finalizeV2AccessPurchase(repo, policy, input);
    await expect(finalizeV2AccessPurchase(repo, policy, { ...input, fingerprint: 'b'.repeat(64) })).rejects.toThrow('replay_mismatch');
  });

  it('rejects stale account generation and insufficient balance before writes', async () => {
    const repo = new MemoryRepository(); seed(repo);
    await expect(finalizeV2AccessPurchase(repo, policy, { ...input, accountGeneration: 2 })).rejects.toThrow('account_generation_mismatch');
    repo.values.set('users:user-1', { stableId: 'user-1', accountGeneration: 1, shards: 1 });
    await expect(finalizeV2AccessPurchase(repo, policy, {
      ...input,
      operationId: 'operation-2',
      request: { ...input.request, opId: 'operation-2' },
    })).rejects.toThrow('insufficient_balance');
  });

  it('rejects an operation/request id mismatch before reading money state', async () => {
    const repo = new MemoryRepository(); seed(repo);
    await expect(
      finalizeV2AccessPurchase(repo, policy, {
        ...input,
        request: { ...input.request, opId: 'different-operation' },
      }),
    ).rejects.toThrow('identity_invalid');
  });

  it('rejects an already-unlocked gate and malformed authoritative balance', async () => {
    const unlocked = new MemoryRepository(); seed(unlocked);
    unlocked.values.set('learning-v2:access-gate:user-1:season-1:gate-2', {
      ...(unlocked.values.get('learning-v2:access-gate:user-1:season-1:gate-2') as object), unlocked: true,
    });
    await expect(finalizeV2AccessPurchase(unlocked, policy, input)).rejects.toThrow('already_unlocked');
    const malformed = new MemoryRepository(); seed(malformed);
    malformed.values.set('users:user-1', { stableId: 'user-1', accountGeneration: 1, shards: Number.NaN });
    await expect(finalizeV2AccessPurchase(malformed, policy, input)).rejects.toThrow('balance_invalid');
  });
});

import { HttpsError } from 'firebase-functions/v2/https';
import { __weeklyReviewTestHooks } from './weekly_review';

type Data = Record<string, any>;
type Ref = { path: string };

class MemoryFirestore {
  readonly docs = new Map<string, Data>();
  private queue: Promise<unknown> = Promise.resolve();

  collection(name: string) {
    return { doc: (id: string): Ref => ({ path: `${name}/${id}` }) };
  }

  runTransaction<T>(handler: (tx: any) => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: Ref) => {
          const value = this.docs.get(ref.path);
          return { exists: value !== undefined, data: () => value };
        },
        set: (ref: Ref, value: Data, options?: { merge?: boolean }) => {
          writes.push(() => this.docs.set(ref.path, options?.merge
            ? { ...(this.docs.get(ref.path) ?? {}), ...value }
            : { ...value }));
        },
      };
      const result = await handler(tx);
      writes.forEach((write) => write());
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const {
  weeklyQuotaRef,
  acquireGenerationLease,
  finalizeGenerationLease,
  releaseGenerationLease,
  weeklyBudgetDayKeyUtc,
  pruneExpiredReservations,
  reserveWeeklyBudget,
  settleWeeklyBudgetUsedAndRecordBilling,
  finalizeWeeklyReviewBillingOutcome,
  refundWeeklyBudget,
} = __weeklyReviewTestHooks;

const NOW = Date.UTC(2026, 6, 13, 23, 59, 30);

describe('weekly review generation lease', () => {
  it('allows only one concurrent lease and keys quota only by stableUid', async () => {
    const db = new MemoryFirestore();
    const firstRef = weeklyQuotaRef(db as any, 'stable-1');
    const secondRef = weeklyQuotaRef(db as any, 'stable-1');
    expect(firstRef.path).toBe(secondRef.path);

    const results = await Promise.allSettled([
      acquireGenerationLease(db as any, { stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a' }),
      acquireGenerationLease(db as any, { stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-b', nowMs: NOW, leaseId: 'lease-b' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('does not let a stale owner finalize or release a newer lease', async () => {
    const db = new MemoryFirestore();
    const acquired = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
    });
    await expect(finalizeGenerationLease(db as any, {
      quotaRef: acquired.quotaRef, leaseId: 'other', briefingHash: 'hash', review: {} as any, model: 'm', nowMs: NOW,
    })).resolves.toBeNull();
    await releaseGenerationLease(db as any, { quotaRef: acquired.quotaRef, leaseId: 'other', nowMs: NOW });
    expect(db.docs.get(acquired.quotaRef.path)?.generation?.leaseId).toBe('lease-a');
  });

  it('replaces an expired lease and owner release compares leaseId', async () => {
    const db = new MemoryFirestore();
    const first = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash-a', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
    });
    const second = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash-b', ownerAuthUid: 'auth-b', nowMs: NOW + 120_001, leaseId: 'lease-b',
    });
    expect(second.leaseId).toBe('lease-b');
    await releaseGenerationLease(db as any, { quotaRef: first.quotaRef, leaseId: 'lease-a', nowMs: NOW + 120_002 });
    expect(db.docs.get(first.quotaRef.path)?.generation?.leaseId).toBe('lease-b');
    await releaseGenerationLease(db as any, { quotaRef: first.quotaRef, leaseId: 'lease-b', nowMs: NOW + 120_003 });
    expect(db.docs.get(first.quotaRef.path)?.generation).toBeNull();
  });
});

describe('weekly review global budget', () => {
  it('uses UTC day keys and prunes expired reservations', () => {
    expect(weeklyBudgetDayKeyUtc(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    expect(weeklyBudgetDayKeyUtc(Date.UTC(2025, 11, 31, 23, 59, 59))).toBe('2025-12-31');
    expect(pruneExpiredReservations({ old: { stableUidHash: 'x', expiresAtMs: NOW - 1 }, live: { stableUidHash: 'y', expiresAtMs: NOW + 1 } }, NOW))
      .toEqual({ live: { stableUidHash: 'y', expiresAtMs: NOW + 1 } });
  });

  it('reserves by leaseId, stores the original day on the lease, and honors cap', async () => {
    const db = new MemoryFirestore();
    const lease = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
    });
    const token = await reserveWeeklyBudget(db as any, {
      quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
    });
    expect(token).toEqual({ leaseId: 'lease-a', budgetDayKey: '2026-07-13' });
    expect(db.docs.get(lease.quotaRef.path)?.generation?.budgetDayKey).toBe('2026-07-13');

    const other = await acquireGenerationLease(db as any, {
      stableUid: 'stable-2', requestHash: 'hash', ownerAuthUid: 'auth-b', nowMs: NOW, leaseId: 'lease-b',
    });
    await expect(reserveWeeklyBudget(db as any, {
      quotaRef: other.quotaRef, leaseId: other.leaseId, stableUid: 'stable-2', cap: 1, nowMs: NOW,
    })).rejects.toBeInstanceOf(HttpsError);
  });

  it('settles after UTC midnight against the original day and records billing atomically', async () => {
    const db = new MemoryFirestore();
    const lease = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
    });
    const token = await reserveWeeklyBudget(db as any, {
      quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
    });
    await settleWeeklyBudgetUsedAndRecordBilling(db as any, {
      token,
      billing: { stableUidHash: 'safe-hash', authUid: 'auth-a', model: 'm', lang: 'ru', studyTarget: 'en' },
      nowMs: NOW + 60_000,
    });
    const budget = db.docs.get('openai_global_daily_budget/weekly_2026-07-13');
    expect(budget).toMatchObject({ usedCount: 1, reservations: {} });
    expect(db.docs.get('weekly_review_billing/lease-a')).toMatchObject({ leaseId: 'lease-a', outcome: 'received' });
    await finalizeWeeklyReviewBillingOutcome(db as any, { leaseId: 'lease-a', outcome: 'success', nowMs: NOW + 60_001 });
    await finalizeWeeklyReviewBillingOutcome(db as any, { leaseId: 'lease-a', outcome: 'invalid_response', nowMs: NOW + 60_002 });
    expect(db.docs.get('weekly_review_billing/lease-a')).toMatchObject({ leaseId: 'lease-a', outcome: 'success' });
    expect(Array.from(db.docs.keys()).filter((path) => path.startsWith('weekly_review_billing/'))).toHaveLength(1);
  });

  it('refunds a pending reservation using the token day and does not spend budget', async () => {
    const db = new MemoryFirestore();
    const lease = await acquireGenerationLease(db as any, {
      stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
    });
    const token = await reserveWeeklyBudget(db as any, {
      quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
    });
    await refundWeeklyBudget(db as any, { token, nowMs: NOW + 60_000 });
    expect(db.docs.get('openai_global_daily_budget/weekly_2026-07-13')).toMatchObject({ usedCount: 0, reservations: {} });
  });
});

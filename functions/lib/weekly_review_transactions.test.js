"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const weekly_review_1 = require("./weekly_review");
class MemoryFirestore {
    constructor() {
        this.docs = new Map();
        this.queue = Promise.resolve();
    }
    collection(name) {
        return { doc: (id) => ({ path: `${name}/${id}` }) };
    }
    runTransaction(handler) {
        const run = this.queue.then(async () => {
            const writes = [];
            const tx = {
                get: async (ref) => {
                    const value = this.docs.get(ref.path);
                    return { exists: value !== undefined, data: () => value };
                },
                set: (ref, value, options) => {
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
const { weeklyQuotaRef, acquireGenerationLease, finalizeGenerationLease, releaseGenerationLease, weeklyBudgetDayKeyUtc, pruneExpiredReservations, reserveWeeklyBudget, settleWeeklyBudgetUsedAndRecordBilling, finalizeWeeklyReviewBillingOutcome, refundWeeklyBudget, } = weekly_review_1.__weeklyReviewTestHooks;
const NOW = Date.UTC(2026, 6, 13, 23, 59, 30);
describe('weekly review generation lease', () => {
    it('allows only one concurrent lease and keys quota only by stableUid', async () => {
        const db = new MemoryFirestore();
        const firstRef = weeklyQuotaRef(db, 'stable-1');
        const secondRef = weeklyQuotaRef(db, 'stable-1');
        expect(firstRef.path).toBe(secondRef.path);
        const results = await Promise.allSettled([
            acquireGenerationLease(db, { stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a' }),
            acquireGenerationLease(db, { stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-b', nowMs: NOW, leaseId: 'lease-b' }),
        ]);
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    });
    it('does not let a stale owner finalize or release a newer lease', async () => {
        const db = new MemoryFirestore();
        const acquired = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        await expect(finalizeGenerationLease(db, {
            quotaRef: acquired.quotaRef, leaseId: 'other', briefingHash: 'hash', review: {}, model: 'm', nowMs: NOW,
        })).resolves.toBeNull();
        await releaseGenerationLease(db, { quotaRef: acquired.quotaRef, leaseId: 'other', nowMs: NOW });
        expect(db.docs.get(acquired.quotaRef.path)?.generation?.leaseId).toBe('lease-a');
    });
    it('replaces an expired lease and owner release compares leaseId', async () => {
        const db = new MemoryFirestore();
        const first = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash-a', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        const second = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash-b', ownerAuthUid: 'auth-b', nowMs: NOW + 120001, leaseId: 'lease-b',
        });
        expect(second.leaseId).toBe('lease-b');
        await releaseGenerationLease(db, { quotaRef: first.quotaRef, leaseId: 'lease-a', nowMs: NOW + 120002 });
        expect(db.docs.get(first.quotaRef.path)?.generation?.leaseId).toBe('lease-b');
        await releaseGenerationLease(db, { quotaRef: first.quotaRef, leaseId: 'lease-b', nowMs: NOW + 120003 });
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
        const lease = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        const token = await reserveWeeklyBudget(db, {
            quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
        });
        expect(token).toEqual({ leaseId: 'lease-a', budgetDayKey: '2026-07-13' });
        expect(db.docs.get(lease.quotaRef.path)?.generation?.budgetDayKey).toBe('2026-07-13');
        const other = await acquireGenerationLease(db, {
            stableUid: 'stable-2', requestHash: 'hash', ownerAuthUid: 'auth-b', nowMs: NOW, leaseId: 'lease-b',
        });
        await expect(reserveWeeklyBudget(db, {
            quotaRef: other.quotaRef, leaseId: other.leaseId, stableUid: 'stable-2', cap: 1, nowMs: NOW,
        })).rejects.toBeInstanceOf(https_1.HttpsError);
    });
    it('settles after UTC midnight against the original day and records billing atomically', async () => {
        const db = new MemoryFirestore();
        const lease = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        const token = await reserveWeeklyBudget(db, {
            quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
        });
        await settleWeeklyBudgetUsedAndRecordBilling(db, {
            token,
            billing: { stableUidHash: 'safe-hash', authUid: 'auth-a', model: 'm', lang: 'ru', studyTarget: 'en' },
            nowMs: NOW + 60000,
        });
        const budget = db.docs.get('openai_global_daily_budget/weekly_2026-07-13');
        expect(budget).toMatchObject({ usedCount: 1, reservations: {} });
        expect(db.docs.get('weekly_review_billing/lease-a')).toMatchObject({ leaseId: 'lease-a', outcome: 'received' });
        await finalizeWeeklyReviewBillingOutcome(db, { leaseId: 'lease-a', outcome: 'success', nowMs: NOW + 60001 });
        await finalizeWeeklyReviewBillingOutcome(db, { leaseId: 'lease-a', outcome: 'invalid_response', nowMs: NOW + 60002 });
        expect(db.docs.get('weekly_review_billing/lease-a')).toMatchObject({ leaseId: 'lease-a', outcome: 'success' });
        expect(Array.from(db.docs.keys()).filter((path) => path.startsWith('weekly_review_billing/'))).toHaveLength(1);
    });
    it('rejects a non-positive weekly cap instead of silently disabling the safeguard', async () => {
        const db = new MemoryFirestore();
        const lease = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        await expect(reserveWeeklyBudget(db, {
            quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 0, nowMs: NOW,
        })).rejects.toBeInstanceOf(https_1.HttpsError);
    });
    it('keeps actual token usage when a paid response is structurally invalid', async () => {
        const db = new MemoryFirestore();
        const lease = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        const token = await reserveWeeklyBudget(db, {
            quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
        });
        await settleWeeklyBudgetUsedAndRecordBilling(db, {
            token,
            billing: {
                stableUidHash: 'safe-hash', authUid: 'auth-a', model: 'm', lang: 'ru', studyTarget: 'en',
                promptTokens: 321, completionTokens: 87, totalTokens: 408,
            },
            nowMs: NOW + 1,
        });
        await finalizeWeeklyReviewBillingOutcome(db, {
            leaseId: 'lease-a', outcome: 'invalid_response', nowMs: NOW + 2,
        });
        expect(db.docs.get('weekly_review_billing/lease-a')).toMatchObject({
            outcome: 'invalid_response', promptTokens: 321, completionTokens: 87, totalTokens: 408,
        });
    });
    it('refunds a pending reservation using the token day and does not spend budget', async () => {
        const db = new MemoryFirestore();
        const lease = await acquireGenerationLease(db, {
            stableUid: 'stable-1', requestHash: 'hash', ownerAuthUid: 'auth-a', nowMs: NOW, leaseId: 'lease-a',
        });
        const token = await reserveWeeklyBudget(db, {
            quotaRef: lease.quotaRef, leaseId: lease.leaseId, stableUid: 'stable-1', cap: 1, nowMs: NOW,
        });
        await refundWeeklyBudget(db, { token, nowMs: NOW + 60000 });
        expect(db.docs.get('openai_global_daily_budget/weekly_2026-07-13')).toMatchObject({ usedCount: 0, reservations: {} });
    });
});
//# sourceMappingURL=weekly_review_transactions.test.js.map